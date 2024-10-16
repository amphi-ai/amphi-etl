from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from datetime import datetime

import numpy as np
value = np.nan

spark = SparkSession.builder \
    .appName("anhbt_test_spark") \
    .master("spark://10.169.0.43:7077") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.demo", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.demo.type", "hive") \
    .config("spark.sql.catalog.demo.uri", "thrift://10.168.6.104:9083") \
    .config("spark.sql.catalog.demo.io-impl", "org.apache.iceberg.aws.s3.S3FileIO") \
    .config("spark.sql.catalog.demo.warehouse", "s3://vnptlake_iceberg/lake_ioc") \
    .config("spark.sql.catalog.demo.s3.endpoint", "http://10.168.6.104:9000") \
    .config("spark.sql.catalog.demo.s3.access-key-id", "minioadmin") \
    .config("spark.executor.extraJavaOptions", "-Djava.library.path=D://data-repo/vnpt-etl/jupyterlab-amphi/hadoop/bin") \
    .config("spark.driver.extraJavaOptions", "-Djava.library.path=D://data-repo/vnpt-etl/jupyterlab-amphi/hadoop/bin") \
    .config("spark.sql.catalog.demo.s3.secret-access-key", "minioadmin") \
    .config("spark.sql.defaultCatalog", "demo") \
    .config("spark.cores.max", "1") \
    .config("spark.executor.memory", "1g") \
    .getOrCreate()
    
print(f"App Name: {spark.sparkContext.appName}")
print(f"Master: {spark.sparkContext.master}")
print(f"Spark Version: {spark.version}")


df = spark.sql("SHOW TABLES IN lake_ioc")
df.show()

# df = spark.read \
#     .format("iceberg") \
#     .load("lake_ioc.data_covid_vn2") \
#     .select(
#         col("name").alias("name"),
#         col("death").alias("death"),
#         col("treating").alias("treating"),
#         col("cases"),
#         col("recovered").alias("recovered"),
#         col("casestoday").alias("casestoday")
#     )