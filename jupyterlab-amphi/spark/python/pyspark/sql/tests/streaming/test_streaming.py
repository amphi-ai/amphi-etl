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

import os
import shutil
import tempfile
import time

from pyspark.sql import Row
from pyspark.sql.functions import lit
from pyspark.sql.types import StructType, StructField, IntegerType, StringType
from pyspark.testing.sqlutils import ReusedSQLTestCase
from pyspark.errors.exceptions.connect import SparkConnectException


class StreamingTestsMixin:
    def test_streaming_query_functions_basic(self):
        df = self.spark.readStream.format("rate").option("rowsPerSecond", 10).load()
        query = (
            df.writeStream.format("memory")
            .queryName("test_streaming_query_functions_basic")
            .start()
        )
        try:
            self.assertEquals(query.name, "test_streaming_query_functions_basic")
            self.assertTrue(isinstance(query.id, str))
            self.assertTrue(isinstance(query.runId, str))
            self.assertTrue(query.isActive)
            self.assertEqual(query.exception(), None)
            self.assertFalse(query.awaitTermination(1))
            query.processAllAvailable()
            recentProgress = query.recentProgress
            lastProgress = query.lastProgress
            self.assertEqual(lastProgress["name"], query.name)
            self.assertEqual(lastProgress["id"], query.id)
            self.assertTrue(any(p == lastProgress for p in recentProgress))
            query.explain()

        except Exception as e:
            self.fail(
                "Streaming query functions sanity check shouldn't throw any error. "
                "Error message: " + str(e)
            )

        finally:
            query.stop()

    def test_stream_trigger(self):
        df = self.spark.readStream.format("text").load("python/test_support/sql/streaming")

        # Should take at least one arg
        try:
            df.writeStream.trigger()
        except ValueError:
            pass

        # Should not take multiple args
        try:
            df.writeStream.trigger(once=True, processingTime="5 seconds")
        except ValueError:
            pass

        # Should not take multiple args
        try:
            df.writeStream.trigger(processingTime="5 seconds", continuous="1 second")
        except ValueError:
            pass

        # Should take only keyword args
        try:
            df.writeStream.trigger("5 seconds")
            self.fail("Should have thrown an exception")
        except TypeError:
            pass

    def test_stream_read_options(self):
        schema = StructType([StructField("data", StringType(), False)])
        df = (
            self.spark.readStream.format("text")
            .option("path", "python/test_support/sql/streaming")
            .schema(schema)
            .load()
        )
        self.assertTrue(df.isStreaming)
        self.assertEqual(df.schema.simpleString(), "struct<data:string>")

    def test_stream_read_options_overwrite(self):
        bad_schema = StructType([StructField("test", IntegerType(), False)])
        schema = StructType([StructField("data", StringType(), False)])
        # SPARK-32516 disables the overwrite behavior by default.
        with self.sql_conf({"spark.sql.legacy.pathOptionBehavior.enabled": True}):
            df = (
                self.spark.readStream.format("csv")
                .option("path", "python/test_support/sql/fake")
                .schema(bad_schema)
                .load(path="python/test_support/sql/streaming", schema=schema, format="text")
            )
            self.assertTrue(df.isStreaming)
            self.assertEqual(df.schema.simpleString(), "struct<data:string>")

    def test_stream_save_options(self):
        df = (
            self.spark.readStream.format("text")
            .load("python/test_support/sql/streaming")
            .withColumn("id", lit(1))
        )
        for q in self.spark.streams.active:
            q.stop()
        tmpPath = tempfile.mkdtemp()
        shutil.rmtree(tmpPath)
        self.assertTrue(df.isStreaming)
        out = os.path.join(tmpPath, "out")
        chk = os.path.join(tmpPath, "chk")
        q = (
            df.writeStream.option("checkpointLocation", chk)
            .queryName("this_query")
            .format("parquet")
            .partitionBy("id")
            .outputMode("append")
            .option("path", out)
            .start()
        )
        try:
            self.assertEqual(q.name, "this_query")
            self.assertTrue(q.isActive)
            q.processAllAvailable()
            output_files = []
            for _, _, files in os.walk(out):
                output_files.extend([f for f in files if not f.startswith(".")])
            self.assertTrue(len(output_files) > 0)
            self.assertTrue(len(os.listdir(chk)) > 0)
        finally:
            q.stop()
            shutil.rmtree(tmpPath)

    def test_stream_save_options_overwrite(self):
        df = self.spark.readStream.format("text").load("python/test_support/sql/streaming")
        for q in self.spark.streams.active:
            q.stop()
        tmpPath = tempfile.mkdtemp()
        shutil.rmtree(tmpPath)
        self.assertTrue(df.isStreaming)
        out = os.path.join(tmpPath, "out")
        chk = os.path.join(tmpPath, "chk")
        fake1 = os.path.join(tmpPath, "fake1")
        fake2 = os.path.join(tmpPath, "fake2")
        # SPARK-32516 disables the overwrite behavior by default.
        with self.sql_conf({"spark.sql.legacy.pathOptionBehavior.enabled": True}):
            q = (
                df.writeStream.option("checkpointLocation", fake1)
                .format("memory")
                .option("path", fake2)
                .queryName("fake_query")
                .outputMode("append")
                .start(path=out, format="parquet", queryName="this_query", checkpointLocation=chk)
            )

        try:
            self.assertEqual(q.name, "this_query")
            self.assertTrue(q.isActive)
            q.processAllAvailable()
            output_files = []
            for _, _, files in os.walk(out):
                output_files.extend([f for f in files if not f.startswith(".")])
            self.assertTrue(len(output_files) > 0)
            self.assertTrue(len(os.listdir(chk)) > 0)
            self.assertFalse(os.path.isdir(fake1))  # should not have been created
            self.assertFalse(os.path.isdir(fake2))  # should not have been created
        finally:
            q.stop()
            shutil.rmtree(tmpPath)

    def test_stream_status_and_progress(self):
        df = self.spark.readStream.format("text").load("python/test_support/sql/streaming")
        for q in self.spark.streams.active:
            q.stop()
        tmpPath = tempfile.mkdtemp()
        shutil.rmtree(tmpPath)
        self.assertTrue(df.isStreaming)
        out = os.path.join(tmpPath, "out")
        chk = os.path.join(tmpPath, "chk")

        def func(x):
            time.sleep(1)
            return x

        from pyspark.sql.functions import col, udf

        sleep_udf = udf(func)

        # Use "sleep_udf" to delay the progress update so that we can test `lastProgress` when there
        # were no updates.
        q = df.select(sleep_udf(col("value")).alias("value")).writeStream.start(
            path=out, format="parquet", queryName="this_query", checkpointLocation=chk
        )
        try:
            # "lastProgress" will return None in most cases. However, as it may be flaky when
            # Jenkins is very slow, we don't assert it. If there is something wrong, "lastProgress"
            # may throw error with a high chance and make this test flaky, so we should still be
            # able to detect broken codes.
            q.lastProgress

            q.processAllAvailable()
            lastProgress = q.lastProgress
            recentProgress = q.recentProgress
            status = q.status
            self.assertEqual(lastProgress["name"], q.name)
            self.assertEqual(lastProgress["id"], q.id)
            self.assertTrue(any(p == lastProgress for p in recentProgress))
            self.assertTrue(
                "message" in status and "isDataAvailable" in status and "isTriggerActive" in status
            )
        finally:
            q.stop()
            shutil.rmtree(tmpPath)

    def test_stream_await_termination(self):
        df = self.spark.readStream.format("text").load("python/test_support/sql/streaming")
        for q in self.spark.streams.active:
            q.stop()
        tmpPath = tempfile.mkdtemp()
        shutil.rmtree(tmpPath)
        self.assertTrue(df.isStreaming)
        out = os.path.join(tmpPath, "out")
        chk = os.path.join(tmpPath, "chk")
        q = df.writeStream.start(
            path=out, format="parquet", queryName="this_query", checkpointLocation=chk
        )
        try:
            self.assertTrue(q.isActive)
            try:
                q.awaitTermination("hello")
                self.fail("Expected a value exception")
            except ValueError:
                pass
            now = time.time()
            # test should take at least 2 seconds
            res = q.awaitTermination(2.6)
            duration = time.time() - now
            self.assertTrue(duration >= 2)
            self.assertFalse(res)

            q.processAllAvailable()
            q.stop()
            # Sanity check when no parameter is set
            q.awaitTermination()
            self.assertFalse(q.isActive)
        finally:
            q.stop()
            shutil.rmtree(tmpPath)

    def test_stream_exception(self):
        sdf = self.spark.readStream.format("text").load("python/test_support/sql/streaming")
        sq = sdf.writeStream.format("memory").queryName("query_explain").start()
        try:
            sq.processAllAvailable()
            self.assertEqual(sq.exception(), None)
        finally:
            sq.stop()

        from pyspark.sql.functions import col, udf
        from pyspark.errors import StreamingQueryException

        bad_udf = udf(lambda x: 1 / 0)
        sq = (
            sdf.select(bad_udf(col("value")))
            .writeStream.format("memory")
            .queryName("this_query")
            .start()
        )
        try:
            # Process some data to fail the query
            sq.processAllAvailable()
            self.fail("bad udf should fail the query")
        except StreamingQueryException as e:
            # This is expected
            self._assert_exception_tree_contains_msg(e, "ZeroDivisionError")
        finally:
            exception = sq.exception()
            sq.stop()
        self.assertIsInstance(exception, StreamingQueryException)
        self._assert_exception_tree_contains_msg(exception, "ZeroDivisionError")

    def _assert_exception_tree_contains_msg(self, exception, msg):
        if isinstance(exception, SparkConnectException):
            self._assert_exception_tree_contains_msg_connect(exception, msg)
        else:
            self._assert_exception_tree_contains_msg_default(exception, msg)

    def _assert_exception_tree_contains_msg_connect(self, exception, msg):
        self.assertTrue(
            msg in exception.message,
            "Exception tree doesn't contain the expected message: %s" % msg,
        )

    def _assert_exception_tree_contains_msg_default(self, exception, msg):
        e = exception
        contains = msg in e.desc
        while e.cause is not None and not contains:
            e = e.cause
            contains = msg in e.desc
        self.assertTrue(contains, "Exception tree doesn't contain the expected message: %s" % msg)

    def test_query_manager_get(self):
        df = self.spark.readStream.format("rate").load()
        for q in self.spark.streams.active:
            q.stop()
        q = df.writeStream.format("noop").start()

        self.assertTrue(q.isActive)
        self.assertTrue(q.id == self.spark.streams.get(q.id).id)

        q.stop()

        self.assertIsNone(self.spark.streams.get(q.id))

    def test_query_manager_await_termination(self):
        df = self.spark.readStream.format("text").load("python/test_support/sql/streaming")
        for q in self.spark.streams.active:
            q.stop()
        tmpPath = tempfile.mkdtemp()
        shutil.rmtree(tmpPath)
        self.assertTrue(df.isStreaming)
        out = os.path.join(tmpPath, "out")
        chk = os.path.join(tmpPath, "chk")
        q = df.writeStream.start(
            path=out, format="parquet", queryName="this_query", checkpointLocation=chk
        )
        try:
            self.assertTrue(q.isActive)
            try:
                self.spark.streams.awaitAnyTermination("hello")
                self.fail("Expected a value exception")
            except ValueError:
                pass
            now = time.time()
            # test should take at least 2 seconds
            res = self.spark.streams.awaitAnyTermination(2.6)
            duration = time.time() - now
            self.assertTrue(duration >= 2)
            self.assertFalse(res)
        finally:
            q.processAllAvailable()
            q.stop()
            shutil.rmtree(tmpPath)

    def test_streaming_read_from_table(self):
        with self.table("input_table", "this_query"):
            self.spark.sql("CREATE TABLE input_table (value string) USING parquet")
            self.spark.sql("INSERT INTO input_table VALUES ('aaa'), ('bbb'), ('ccc')")
            df = self.spark.readStream.table("input_table")
            self.assertTrue(df.isStreaming)
            q = df.writeStream.format("memory").queryName("this_query").start()
            q.processAllAvailable()
            q.stop()
            result = self.spark.sql("SELECT * FROM this_query ORDER BY value").collect()
            self.assertEqual(
                set([Row(value="aaa"), Row(value="bbb"), Row(value="ccc")]), set(result)
            )

    def test_streaming_write_to_table(self):
        with self.table("output_table"), tempfile.TemporaryDirectory() as tmpdir:
            df = self.spark.readStream.format("rate").option("rowsPerSecond", 10).load()
            q = df.writeStream.toTable("output_table", format="parquet", checkpointLocation=tmpdir)
            self.assertTrue(q.isActive)
            time.sleep(10)
            q.stop()
            result = self.spark.sql("SELECT value FROM output_table").collect()
            self.assertTrue(len(result) > 0)


class StreamingTests(StreamingTestsMixin, ReusedSQLTestCase):
    pass


if __name__ == "__main__":
    import unittest
    from pyspark.sql.tests.streaming.test_streaming import *  # noqa: F401

    try:
        import xmlrunner

        testRunner = xmlrunner.XMLTestRunner(output="target/test-reports", verbosity=2)
    except ImportError:
        testRunner = None
    unittest.main(testRunner=testRunner, verbosity=2)
