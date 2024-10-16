#!/usr/bin/env bash

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
# Starts the Mesos Cluster Dispatcher on the machine this script is executed on.
# The Mesos Cluster Dispatcher is responsible for launching the Mesos framework and
# Rest server to handle driver requests for Mesos cluster mode.
# Only one cluster dispatcher is needed per Mesos cluster.

if [ -z "${SPARK_HOME}" ]; then
  export SPARK_HOME="$(cd "`dirname "$0"`"/..; pwd)"
fi

. "${SPARK_HOME}/sbin/spark-config.sh"

. "${SPARK_HOME}/bin/load-spark-env.sh"

if [ "$SPARK_MESOS_DISPATCHER_PORT" = "" ]; then
  SPARK_MESOS_DISPATCHER_PORT=7077
fi

if [ "$SPARK_MESOS_DISPATCHER_HOST" = "" ]; then
  case `uname` in
      (SunOS)
          SPARK_MESOS_DISPATCHER_HOST="`/usr/sbin/check-hostname | awk '{print $NF}'`"
          ;;
      (*)
          SPARK_MESOS_DISPATCHER_HOST="`hostname -f`"
          ;;
  esac
fi

if [ "$SPARK_MESOS_DISPATCHER_NUM" = "" ]; then
  SPARK_MESOS_DISPATCHER_NUM=1
fi

"${SPARK_HOME}/sbin"/spark-daemon.sh start org.apache.spark.deploy.mesos.MesosClusterDispatcher $SPARK_MESOS_DISPATCHER_NUM --host $SPARK_MESOS_DISPATCHER_HOST --port $SPARK_MESOS_DISPATCHER_PORT "$@"
