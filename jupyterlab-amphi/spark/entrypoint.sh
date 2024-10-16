#!/bin/bash

echo "===============> CHECK"
echo "$SPARK_CLUSTER"

if [ "$SPARK_CLUSTER" == "MASTER" ]; then
    echo "===============> Start MASTER"
    start-master.sh -p 7077
fi

if [ "$SPARK_CLUSTER" == "WORKER" ]; then  
    echo "===============> Start WORKER"
    start-worker.sh spark://spark-iceberg:7077
fi

start-history-server.sh
start-thriftserver.sh  --driver-java-options "-Dderby.system.home=/tmp/derby"

# Entrypoint, for example notebook, pyspark or spark-sql
if [[ $# -gt 0 ]] ; then
    eval "$1"
fi
