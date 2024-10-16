#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from pyspark.sql.connect.utils import check_dependencies

check_dependencies(__name__)

from threading import RLock
import warnings
import uuid
from collections.abc import Generator
from typing import Optional, Dict, Any, Iterator, Iterable, Tuple, Callable, cast, Type, ClassVar
from multiprocessing.pool import ThreadPool
import os

import grpc
from grpc_status import rpc_status

import pyspark.sql.connect.proto as pb2
import pyspark.sql.connect.proto.base_pb2_grpc as grpc_lib


class ExecutePlanResponseReattachableIterator(Generator):
    """
    Retryable iterator of ExecutePlanResponses to an ExecutePlan call.

    It can handle situations when:
      - the ExecutePlanResponse stream was broken by retryable network error (governed by
        retryPolicy)
      - the ExecutePlanResponse was gracefully ended by the server without a ResultComplete
        message; this tells the client that there is more, and it should reattach to continue.

    Initial iterator is the result of an ExecutePlan on the request, but it can be reattached with
    ReattachExecute request. ReattachExecute request is provided the responseId of last returned
    ExecutePlanResponse on the iterator to return a new iterator from server that continues after
    that. If the initial ExecutePlan did not even reach the server, and hence reattach fails with
    INVALID_HANDLE.OPERATION_NOT_FOUND, we attempt to retry ExecutePlan.

    In reattachable execute the server does buffer some responses in case the client needs to
    backtrack. To let server release this buffer sooner, this iterator asynchronously sends
    ReleaseExecute RPCs that instruct the server to release responses that it already processed.
    """

    # Lock to manage the pool
    _lock: ClassVar[RLock] = RLock()
    _release_thread_pool: Optional[ThreadPool] = ThreadPool(os.cpu_count() if os.cpu_count() else 8)

    @classmethod
    def shutdown(cls: Type["ExecutePlanResponseReattachableIterator"]) -> None:
        """
        When the channel is closed, this method will be called before, to make sure all
        outstanding calls are closed.
        """
        with cls._lock:
            if cls._release_thread_pool is not None:
                cls._release_thread_pool.close()
                cls._release_thread_pool.join()
                cls._release_thread_pool = None

    @classmethod
    def _initialize_pool_if_necessary(cls: Type["ExecutePlanResponseReattachableIterator"]) -> None:
        """
        If the processing pool for the release calls is None, initialize the pool exactly once.
        """
        with cls._lock:
            if cls._release_thread_pool is None:
                cls._release_thread_pool = ThreadPool(os.cpu_count() if os.cpu_count() else 8)

    def __init__(
        self,
        request: pb2.ExecutePlanRequest,
        stub: grpc_lib.SparkConnectServiceStub,
        retry_policy: Dict[str, Any],
        metadata: Iterable[Tuple[str, str]],
    ):
        ExecutePlanResponseReattachableIterator._initialize_pool_if_necessary()
        self._request = request
        self._retry_policy = retry_policy
        if request.operation_id:
            self._operation_id = request.operation_id
        else:
            # Add operation id, if not present.
            # with operationId set by the client, the client can use it to try to reattach on error
            # even before getting the first response. If the operation in fact didn't even reach the
            # server, that will end with INVALID_HANDLE.OPERATION_NOT_FOUND error.
            self._operation_id = str(uuid.uuid4())

        self._stub = stub
        request.request_options.append(
            pb2.ExecutePlanRequest.RequestOption(
                reattach_options=pb2.ReattachOptions(reattachable=True)
            )
        )
        request.operation_id = self._operation_id
        self._initial_request = request

        # ResponseId of the last response returned by next()
        self._last_returned_response_id: Optional[str] = None

        # True after ResponseComplete message was seen in the stream.
        # Server will always send this message at the end of the stream, if the underlying iterator
        # finishes without producing one, another iterator needs to be reattached.
        self._result_complete = False

        # Initial iterator comes from ExecutePlan request.
        # Note: This is not retried, because no error would ever be thrown here, and GRPC will only
        # throw error on first self._has_next().
        self._metadata = metadata
        self._iterator: Optional[Iterator[pb2.ExecutePlanResponse]] = iter(
            self._stub.ExecutePlan(self._initial_request, metadata=metadata)
        )

        # Current item from this iterator.
        self._current: Optional[pb2.ExecutePlanResponse] = None

    def send(self, value: Any) -> pb2.ExecutePlanResponse:
        # will trigger reattach in case the stream completed without result_complete
        if not self._has_next():
            raise StopIteration()

        ret = self._current
        assert ret is not None

        self._last_returned_response_id = ret.response_id
        if ret.HasField("result_complete"):
            self._release_all()
        else:
            self._release_until(self._last_returned_response_id)
        self._current = None
        return ret

    def _has_next(self) -> bool:
        from pyspark.sql.connect.client.core import SparkConnectClient
        from pyspark.sql.connect.client.core import Retrying

        if self._result_complete:
            # After response complete response
            return False
        else:
            try:
                for attempt in Retrying(
                    can_retry=SparkConnectClient.retry_exception, **self._retry_policy
                ):
                    with attempt:
                        if self._current is None:
                            try:
                                self._current = self._call_iter(
                                    lambda: next(self._iterator)  # type: ignore[arg-type]
                                )
                            except StopIteration:
                                pass

                        has_next = self._current is not None

                        # Graceful reattach:
                        # If iterator ended, but there was no ResponseComplete, it means that
                        # there is more, and we need to reattach. While ResponseComplete didn't
                        # arrive, we keep reattaching.
                        if not self._result_complete and not has_next:
                            while not has_next:
                                # unset iterator for new ReattachExecute to be called in _call_iter
                                self._iterator = None
                                # shouldn't change
                                assert not self._result_complete
                                try:
                                    self._current = self._call_iter(
                                        lambda: next(self._iterator)  # type: ignore[arg-type]
                                    )
                                except StopIteration:
                                    pass
                                has_next = self._current is not None
                        return has_next
            except Exception as e:
                self._release_all()
                raise e
            return False

    def _release_until(self, until_response_id: str) -> None:
        """
        Inform the server to release the buffered execution results until and including given
        result.

        This will send an asynchronous RPC which will not block this iterator, the iterator can
        continue to be consumed.
        """
        if self._result_complete:
            return

        from pyspark.sql.connect.client.core import SparkConnectClient
        from pyspark.sql.connect.client.core import Retrying

        request = self._create_release_execute_request(until_response_id)

        def target() -> None:
            try:
                for attempt in Retrying(
                    can_retry=SparkConnectClient.retry_exception, **self._retry_policy
                ):
                    with attempt:
                        self._stub.ReleaseExecute(request, metadata=self._metadata)
            except Exception as e:
                warnings.warn(f"ReleaseExecute failed with exception: {e}.")

        if ExecutePlanResponseReattachableIterator._release_thread_pool is not None:
            ExecutePlanResponseReattachableIterator._release_thread_pool.apply_async(target)

    def _release_all(self) -> None:
        """
        Inform the server to release the execution, either because all results were consumed,
        or the execution finished with error and the error was received.

        This will send an asynchronous RPC which will not block this. The client continues
        executing, and if the release fails, server is equipped to deal with abandoned executions.
        """
        if self._result_complete:
            return

        from pyspark.sql.connect.client.core import SparkConnectClient
        from pyspark.sql.connect.client.core import Retrying

        request = self._create_release_execute_request(None)

        def target() -> None:
            try:
                for attempt in Retrying(
                    can_retry=SparkConnectClient.retry_exception, **self._retry_policy
                ):
                    with attempt:
                        self._stub.ReleaseExecute(request, metadata=self._metadata)
            except Exception as e:
                warnings.warn(f"ReleaseExecute failed with exception: {e}.")

        if ExecutePlanResponseReattachableIterator._release_thread_pool is not None:
            ExecutePlanResponseReattachableIterator._release_thread_pool.apply_async(target)
        self._result_complete = True

    def _call_iter(self, iter_fun: Callable) -> Any:
        """
        Call next() on the iterator. If this fails with this operationId not existing
        on the server, this means that the initial ExecutePlan request didn't even reach the
        server. In that case, attempt to start again with ExecutePlan.

        Called inside retry block, so retryable failure will get handled upstream.
        """
        if self._iterator is None:
            # we get a new iterator with ReattachExecute if it was unset.
            self._iterator = iter(
                self._stub.ReattachExecute(
                    self._create_reattach_execute_request(), metadata=self._metadata
                )
            )

        try:
            return iter_fun()
        except grpc.RpcError as e:
            status = rpc_status.from_call(cast(grpc.Call, e))
            if status is not None and "INVALID_HANDLE.OPERATION_NOT_FOUND" in status.message:
                if self._last_returned_response_id is not None:
                    raise RuntimeError(
                        "OPERATION_NOT_FOUND on the server but "
                        "responses were already received from it.",
                        e,
                    )
                # Try a new ExecutePlan, and throw upstream for retry.
                self._iterator = iter(
                    self._stub.ExecutePlan(self._initial_request, metadata=self._metadata)
                )
                raise RetryException()
            else:
                # Remove the iterator, so that a new one will be created after retry.
                self._iterator = None
                raise e
        except Exception as e:
            # Remove the iterator, so that a new one will be created after retry.
            self._iterator = None
            raise e

    def _create_reattach_execute_request(self) -> pb2.ReattachExecuteRequest:
        reattach = pb2.ReattachExecuteRequest(
            session_id=self._initial_request.session_id,
            user_context=self._initial_request.user_context,
            operation_id=self._initial_request.operation_id,
        )

        if self._initial_request.client_type:
            reattach.client_type = self._initial_request.client_type

        if self._last_returned_response_id:
            reattach.last_response_id = self._last_returned_response_id

        return reattach

    def _create_release_execute_request(
        self, until_response_id: Optional[str]
    ) -> pb2.ReleaseExecuteRequest:
        release = pb2.ReleaseExecuteRequest(
            session_id=self._initial_request.session_id,
            user_context=self._initial_request.user_context,
            operation_id=self._initial_request.operation_id,
        )

        if self._initial_request.client_type:
            release.client_type = self._initial_request.client_type

        if not until_response_id:
            release.release_all.CopyFrom(pb2.ReleaseExecuteRequest.ReleaseAll())
        else:
            release.release_until.response_id = until_response_id

        return release

    def throw(self, type: Any = None, value: Any = None, traceback: Any = None) -> Any:
        super().throw(type, value, traceback)

    def close(self) -> None:
        self._release_all()
        return super().close()

    def __del__(self) -> None:
        return self.close()


class RetryException(Exception):
    """
    An exception that can be thrown upstream when inside retry and which will be retryable
    regardless of policy.
    """
