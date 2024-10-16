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

"""
A collections of builtin functions
"""
import inspect
import decimal
import sys
import functools
import warnings
from typing import (
    Any,
    cast,
    Callable,
    Dict,
    List,
    Iterable,
    overload,
    Optional,
    Tuple,
    Type,
    TYPE_CHECKING,
    Union,
    ValuesView,
)

from py4j.java_gateway import JVMView

from pyspark import SparkContext
from pyspark.errors import PySparkTypeError, PySparkValueError
from pyspark.sql.column import Column, _to_java_column, _to_seq, _create_column_from_literal
from pyspark.sql.dataframe import DataFrame
from pyspark.sql.types import ArrayType, DataType, StringType, StructType, _from_numpy_type

# Keep UserDefinedFunction import for backwards compatible import; moved in SPARK-22409
from pyspark.sql.udf import UserDefinedFunction, _create_py_udf  # noqa: F401
from pyspark.sql.udtf import UserDefinedTableFunction, _create_py_udtf

# Keep pandas_udf and PandasUDFType import for backwards compatible import; moved in SPARK-28264
from pyspark.sql.pandas.functions import pandas_udf, PandasUDFType  # noqa: F401
from pyspark.sql.utils import (
    to_str,
    has_numpy,
    try_remote_functions,
    get_active_spark_context,
)

if TYPE_CHECKING:
    from pyspark.sql._typing import (
        ColumnOrName,
        ColumnOrName_,
        DataTypeOrString,
        UserDefinedFunctionLike,
    )

if has_numpy:
    import numpy as np

# Note to developers: all of PySpark functions here take string as column names whenever possible.
# Namely, if columns are referred as arguments, they can always be both Column or string,
# even though there might be few exceptions for legacy or inevitable reasons.
# If you are fixing other language APIs together, also please note that Scala side is not the case
# since it requires making every single overridden definition.


def _get_jvm_function(name: str, sc: SparkContext) -> Callable:
    """
    Retrieves JVM function identified by name from
    Java gateway associated with sc.
    """
    assert sc._jvm is not None
    return getattr(sc._jvm.functions, name)


def _invoke_function(name: str, *args: Any) -> Column:
    """
    Invokes JVM function identified by name with args
    and wraps the result with :class:`~pyspark.sql.Column`.
    """
    assert SparkContext._active_spark_context is not None
    jf = _get_jvm_function(name, SparkContext._active_spark_context)
    return Column(jf(*args))


def _invoke_function_over_columns(name: str, *cols: "ColumnOrName") -> Column:
    """
    Invokes n-ary JVM function identified by name
    and wraps the result with :class:`~pyspark.sql.Column`.
    """
    return _invoke_function(name, *(_to_java_column(col) for col in cols))


def _invoke_function_over_seq_of_columns(name: str, cols: "Iterable[ColumnOrName]") -> Column:
    """
    Invokes unary JVM function identified by name with
    and wraps the result with :class:`~pyspark.sql.Column`.
    """
    sc = get_active_spark_context()
    return _invoke_function(name, _to_seq(sc, cols, _to_java_column))


def _invoke_binary_math_function(name: str, col1: Any, col2: Any) -> Column:
    """
    Invokes binary JVM math function identified by name
    and wraps the result with :class:`~pyspark.sql.Column`.
    """

    # For legacy reasons, the arguments here can be implicitly converted into column
    cols = [
        _to_java_column(c) if isinstance(c, (str, Column)) else _create_column_from_literal(c)
        for c in (col1, col2)
    ]
    return _invoke_function(name, *cols)


def _options_to_str(options: Optional[Dict[str, Any]] = None) -> Dict[str, Optional[str]]:
    if options:
        return {key: to_str(value) for (key, value) in options.items()}
    return {}


@try_remote_functions
def lit(col: Any) -> Column:
    """
    Creates a :class:`~pyspark.sql.Column` of literal value.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column`, str, int, float, bool or list, NumPy literals or ndarray.
        the value to make it as a PySpark literal. If a column is passed,
        it returns the column as is.

        .. versionchanged:: 3.4.0
            Since 3.4.0, it supports the list type.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the literal instance.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(lit(5).alias('height'), df.id).show()
    +------+---+
    |height| id|
    +------+---+
    |     5|  0|
    +------+---+

    Create a literal from a list.

    >>> spark.range(1).select(lit([1, 2, 3])).show()
    +--------------+
    |array(1, 2, 3)|
    +--------------+
    |     [1, 2, 3]|
    +--------------+
    """
    if isinstance(col, Column):
        return col
    elif isinstance(col, list):
        if any(isinstance(c, Column) for c in col):
            raise PySparkValueError(
                error_class="COLUMN_IN_LIST", message_parameters={"func_name": "lit"}
            )
        return array(*[lit(item) for item in col])
    else:
        if has_numpy and isinstance(col, np.generic):
            dt = _from_numpy_type(col.dtype)
            if dt is not None:
                return _invoke_function("lit", col).astype(dt).alias(str(col))
        return _invoke_function("lit", col)


@try_remote_functions
def col(col: str) -> Column:
    """
    Returns a :class:`~pyspark.sql.Column` based on the given column name.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : str
        the name for the column

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the corresponding column instance.

    Examples
    --------
    >>> col('x')
    Column<'x'>
    >>> column('x')
    Column<'x'>
    """
    return _invoke_function("col", col)


column = col


@try_remote_functions
def asc(col: "ColumnOrName") -> Column:
    """
    Returns a sort expression based on the ascending order of the given column name.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to sort by in the ascending order.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column specifying the order.

    Examples
    --------
    Sort by the column 'id' in the descending order.

    >>> df = spark.range(5)
    >>> df = df.sort(desc("id"))
    >>> df.show()
    +---+
    | id|
    +---+
    |  4|
    |  3|
    |  2|
    |  1|
    |  0|
    +---+

    Sort by the column 'id' in the ascending order.

    >>> df.orderBy(asc("id")).show()
    +---+
    | id|
    +---+
    |  0|
    |  1|
    |  2|
    |  3|
    |  4|
    +---+
    """
    return col.asc() if isinstance(col, Column) else _invoke_function("asc", col)


@try_remote_functions
def desc(col: "ColumnOrName") -> Column:
    """
    Returns a sort expression based on the descending order of the given column name.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to sort by in the descending order.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column specifying the order.

    Examples
    --------
    Sort by the column 'id' in the descending order.

    >>> spark.range(5).orderBy(desc("id")).show()
    +---+
    | id|
    +---+
    |  4|
    |  3|
    |  2|
    |  1|
    |  0|
    +---+
    """
    return col.desc() if isinstance(col, Column) else _invoke_function("desc", col)


@try_remote_functions
def sqrt(col: "ColumnOrName") -> Column:
    """
    Computes the square root of the specified float value.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(sqrt(lit(4))).show()
    +-------+
    |SQRT(4)|
    +-------+
    |    2.0|
    +-------+
    """
    return _invoke_function_over_columns("sqrt", col)


@try_remote_functions
def try_add(left: "ColumnOrName", right: "ColumnOrName") -> Column:
    """
    Returns the sum of `left`and `right` and the result is null on overflow.
    The acceptable input types are the same with the `+` operator.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
    right : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(1982, 15), (1990, 2)], ["birth", "age"])
    >>> df.select(try_add(df.birth, df.age).alias('r')).collect()
    [Row(r=1997), Row(r=1992)]

    >>> from pyspark.sql.types import StructType, StructField, IntegerType, StringType
    >>> schema = StructType([
    ...     StructField("i", IntegerType(), True),
    ...     StructField("d", StringType(), True),
    ... ])
    >>> df = spark.createDataFrame([(1, '2015-09-30')], schema)
    >>> df = df.select(df.i, to_date(df.d).alias('d'))
    >>> df.select(try_add(df.d, df.i).alias('r')).collect()
    [Row(r=datetime.date(2015, 10, 1))]

    >>> df.select(try_add(df.d, make_interval(df.i)).alias('r')).collect()
    [Row(r=datetime.date(2016, 9, 30))]

    >>> df.select(
    ...     try_add(df.d, make_interval(lit(0), lit(0), lit(0), df.i)).alias('r')
    ... ).collect()
    [Row(r=datetime.date(2015, 10, 1))]

    >>> df.select(
    ...     try_add(make_interval(df.i), make_interval(df.i)).alias('r')
    ... ).show(truncate=False)
    +-------+
    |r      |
    +-------+
    |2 years|
    +-------+
    """
    return _invoke_function_over_columns("try_add", left, right)


@try_remote_functions
def try_avg(col: "ColumnOrName") -> Column:
    """
    Returns the mean calculated from values of a group and the result is null on overflow.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [(1982, 15), (1990, 2)], ["birth", "age"]
    ... ).select(sf.try_avg("age")).show()
    +------------+
    |try_avg(age)|
    +------------+
    |         8.5|
    +------------+
    """
    return _invoke_function_over_columns("try_avg", col)


@try_remote_functions
def try_divide(left: "ColumnOrName", right: "ColumnOrName") -> Column:
    """
    Returns `dividend`/`divisor`. It always performs floating point division. Its result is
    always null if `divisor` is 0.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
        dividend
    right : :class:`~pyspark.sql.Column` or str
        divisor

    Examples
    --------
    >>> df = spark.createDataFrame([(6000, 15), (1990, 2)], ["a", "b"])
    >>> df.select(try_divide(df.a, df.b).alias('r')).collect()
    [Row(r=400.0), Row(r=995.0)]

    >>> df = spark.createDataFrame([(1, 2)], ["year", "month"])
    >>> df.select(
    ...     try_divide(make_interval(df.year), df.month).alias('r')
    ... ).show(truncate=False)
    +--------+
    |r       |
    +--------+
    |6 months|
    +--------+

    >>> df.select(
    ...     try_divide(make_interval(df.year, df.month), lit(2)).alias('r')
    ... ).show(truncate=False)
    +--------+
    |r       |
    +--------+
    |7 months|
    +--------+

    >>> df.select(
    ...     try_divide(make_interval(df.year, df.month), lit(0)).alias('r')
    ... ).show(truncate=False)
    +----+
    |r   |
    +----+
    |NULL|
    +----+
    """
    return _invoke_function_over_columns("try_divide", left, right)


@try_remote_functions
def try_multiply(left: "ColumnOrName", right: "ColumnOrName") -> Column:
    """
    Returns `left`*`right` and the result is null on overflow. The acceptable input types are the
    same with the `*` operator.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
        multiplicand
    right : :class:`~pyspark.sql.Column` or str
        multiplier

    Examples
    --------
    >>> df = spark.createDataFrame([(6000, 15), (1990, 2)], ["a", "b"])
    >>> df.select(try_multiply(df.a, df.b).alias('r')).collect()
    [Row(r=90000), Row(r=3980)]

    >>> df = spark.createDataFrame([(2, 3),], ["a", "b"])
    >>> df.select(try_multiply(make_interval(df.a), df.b).alias('r')).show(truncate=False)
    +-------+
    |r      |
    +-------+
    |6 years|
    +-------+
    """
    return _invoke_function_over_columns("try_multiply", left, right)


@try_remote_functions
def try_subtract(left: "ColumnOrName", right: "ColumnOrName") -> Column:
    """
    Returns `left`-`right` and the result is null on overflow. The acceptable input types are the
    same with the `-` operator.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
    right : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(6000, 15), (1990, 2)], ["a", "b"])
    >>> df.select(try_subtract(df.a, df.b).alias('r')).collect()
    [Row(r=5985), Row(r=1988)]

    >>> from pyspark.sql.types import StructType, StructField, IntegerType, StringType
    >>> schema = StructType([
    ...     StructField("i", IntegerType(), True),
    ...     StructField("d", StringType(), True),
    ... ])
    >>> df = spark.createDataFrame([(1, '2015-09-30')], schema)
    >>> df = df.select(df.i, to_date(df.d).alias('d'))
    >>> df.select(try_subtract(df.d, df.i).alias('r')).collect()
    [Row(r=datetime.date(2015, 9, 29))]

    >>> df.select(try_subtract(df.d, make_interval(df.i)).alias('r')).collect()
    [Row(r=datetime.date(2014, 9, 30))]

    >>> df.select(
    ...     try_subtract(df.d, make_interval(lit(0), lit(0), lit(0), df.i)).alias('r')
    ... ).collect()
    [Row(r=datetime.date(2015, 9, 29))]

    >>> df.select(
    ...     try_subtract(make_interval(df.i), make_interval(df.i)).alias('r')
    ... ).show(truncate=False)
    +---------+
    |r        |
    +---------+
    |0 seconds|
    +---------+
    """
    return _invoke_function_over_columns("try_subtract", left, right)


@try_remote_functions
def try_sum(col: "ColumnOrName") -> Column:
    """
    Returns the sum calculated from values of a group and the result is null on overflow.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(10).select(sf.try_sum("id")).show()
    +-----------+
    |try_sum(id)|
    +-----------+
    |         45|
    +-----------+
    """
    return _invoke_function_over_columns("try_sum", col)


@try_remote_functions
def abs(col: "ColumnOrName") -> Column:
    """
    Computes the absolute value.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(abs(lit(-1))).show()
    +-------+
    |abs(-1)|
    +-------+
    |      1|
    +-------+
    """
    return _invoke_function_over_columns("abs", col)


@try_remote_functions
def mode(col: "ColumnOrName") -> Column:
    """
    Returns the most frequent value in a group.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the most frequent value in a group.

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> df = spark.createDataFrame([
    ...     ("Java", 2012, 20000), ("dotNET", 2012, 5000),
    ...     ("Java", 2012, 20000), ("dotNET", 2012, 5000),
    ...     ("dotNET", 2013, 48000), ("Java", 2013, 30000)],
    ...     schema=("course", "year", "earnings"))
    >>> df.groupby("course").agg(mode("year")).show()
    +------+----------+
    |course|mode(year)|
    +------+----------+
    |  Java|      2012|
    |dotNET|      2012|
    +------+----------+
    """
    return _invoke_function_over_columns("mode", col)


@try_remote_functions
def max(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the maximum value of the expression in a group.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column for computed results.

    Examples
    --------
    >>> df = spark.range(10)
    >>> df.select(max(col("id"))).show()
    +-------+
    |max(id)|
    +-------+
    |      9|
    +-------+
    """
    return _invoke_function_over_columns("max", col)


@try_remote_functions
def min(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the minimum value of the expression in a group.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column for computed results.

    Examples
    --------
    >>> df = spark.range(10)
    >>> df.select(min(df.id)).show()
    +-------+
    |min(id)|
    +-------+
    |      0|
    +-------+
    """
    return _invoke_function_over_columns("min", col)


@try_remote_functions
def max_by(col: "ColumnOrName", ord: "ColumnOrName") -> Column:
    """
    Returns the value associated with the maximum value of ord.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    ord : :class:`~pyspark.sql.Column` or str
        column to be maximized

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value associated with the maximum value of ord.

    Examples
    --------
    >>> df = spark.createDataFrame([
    ...     ("Java", 2012, 20000), ("dotNET", 2012, 5000),
    ...     ("dotNET", 2013, 48000), ("Java", 2013, 30000)],
    ...     schema=("course", "year", "earnings"))
    >>> df.groupby("course").agg(max_by("year", "earnings")).show()
    +------+----------------------+
    |course|max_by(year, earnings)|
    +------+----------------------+
    |  Java|                  2013|
    |dotNET|                  2013|
    +------+----------------------+
    """
    return _invoke_function_over_columns("max_by", col, ord)


@try_remote_functions
def min_by(col: "ColumnOrName", ord: "ColumnOrName") -> Column:
    """
    Returns the value associated with the minimum value of ord.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    ord : :class:`~pyspark.sql.Column` or str
        column to be minimized

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value associated with the minimum value of ord.

    Examples
    --------
    >>> df = spark.createDataFrame([
    ...     ("Java", 2012, 20000), ("dotNET", 2012, 5000),
    ...     ("dotNET", 2013, 48000), ("Java", 2013, 30000)],
    ...     schema=("course", "year", "earnings"))
    >>> df.groupby("course").agg(min_by("year", "earnings")).show()
    +------+----------------------+
    |course|min_by(year, earnings)|
    +------+----------------------+
    |  Java|                  2012|
    |dotNET|                  2012|
    +------+----------------------+
    """
    return _invoke_function_over_columns("min_by", col, ord)


@try_remote_functions
def count(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the number of items in a group.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column for computed results.

    Examples
    --------
    Count by all columns (start), and by a column that does not count ``None``.

    >>> df = spark.createDataFrame([(None,), ("a",), ("b",), ("c",)], schema=["alphabets"])
    >>> df.select(count(expr("*")), count(df.alphabets)).show()
    +--------+----------------+
    |count(1)|count(alphabets)|
    +--------+----------------+
    |       4|               3|
    +--------+----------------+
    """
    return _invoke_function_over_columns("count", col)


@try_remote_functions
def sum(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the sum of all values in the expression.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(10)
    >>> df.select(sum(df["id"])).show()
    +-------+
    |sum(id)|
    +-------+
    |     45|
    +-------+
    """
    return _invoke_function_over_columns("sum", col)


@try_remote_functions
def avg(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the average of the values in a group.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(10)
    >>> df.select(avg(col("id"))).show()
    +-------+
    |avg(id)|
    +-------+
    |    4.5|
    +-------+
    """
    return _invoke_function_over_columns("avg", col)


@try_remote_functions
def mean(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the average of the values in a group.
    An alias of :func:`avg`.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(10)
    >>> df.select(mean(df.id)).show()
    +-------+
    |avg(id)|
    +-------+
    |    4.5|
    +-------+
    """
    return _invoke_function_over_columns("mean", col)


@try_remote_functions
def median(col: "ColumnOrName") -> Column:
    """
    Returns the median of the values in a group.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the median of the values in a group.

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> df = spark.createDataFrame([
    ...     ("Java", 2012, 20000), ("dotNET", 2012, 5000),
    ...     ("Java", 2012, 22000), ("dotNET", 2012, 10000),
    ...     ("dotNET", 2013, 48000), ("Java", 2013, 30000)],
    ...     schema=("course", "year", "earnings"))
    >>> df.groupby("course").agg(median("earnings")).show()
    +------+----------------+
    |course|median(earnings)|
    +------+----------------+
    |  Java|         22000.0|
    |dotNET|         10000.0|
    +------+----------------+
    """
    return _invoke_function_over_columns("median", col)


@try_remote_functions
def sumDistinct(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the sum of distinct values in the expression.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 3.2.0
        Use :func:`sum_distinct` instead.
    """
    warnings.warn("Deprecated in 3.2, use sum_distinct instead.", FutureWarning)
    return sum_distinct(col)


@try_remote_functions
def sum_distinct(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the sum of distinct values in the expression.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([(None,), (1,), (1,), (2,)], schema=["numbers"])
    >>> df.select(sum_distinct(col("numbers"))).show()
    +---------------------+
    |sum(DISTINCT numbers)|
    +---------------------+
    |                    3|
    +---------------------+
    """
    return _invoke_function_over_columns("sum_distinct", col)


@try_remote_functions
def product(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the product of the values in a group.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : str, :class:`Column`
        column containing values to be multiplied together

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(1, 10).toDF('x').withColumn('mod3', col('x') % 3)
    >>> prods = df.groupBy('mod3').agg(product('x').alias('product'))
    >>> prods.orderBy('mod3').show()
    +----+-------+
    |mod3|product|
    +----+-------+
    |   0|  162.0|
    |   1|   28.0|
    |   2|   80.0|
    +----+-------+
    """
    return _invoke_function_over_columns("product", col)


@try_remote_functions
def acos(col: "ColumnOrName") -> Column:
    """
    Computes inverse cosine of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        inverse cosine of `col`, as if computed by `java.lang.Math.acos()`

    Examples
    --------
    >>> df = spark.range(1, 3)
    >>> df.select(acos(df.id)).show()
    +--------+
    |ACOS(id)|
    +--------+
    |     0.0|
    |     NaN|
    +--------+
    """
    return _invoke_function_over_columns("acos", col)


@try_remote_functions
def acosh(col: "ColumnOrName") -> Column:
    """
    Computes inverse hyperbolic cosine of the input column.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(2)
    >>> df.select(acosh(col("id"))).show()
    +---------+
    |ACOSH(id)|
    +---------+
    |      NaN|
    |      0.0|
    +---------+
    """
    return _invoke_function_over_columns("acosh", col)


@try_remote_functions
def asin(col: "ColumnOrName") -> Column:
    """
    Computes inverse sine of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        inverse sine of `col`, as if computed by `java.lang.Math.asin()`

    Examples
    --------
    >>> df = spark.createDataFrame([(0,), (2,)])
    >>> df.select(asin(df.schema.fieldNames()[0])).show()
    +--------+
    |ASIN(_1)|
    +--------+
    |     0.0|
    |     NaN|
    +--------+
    """
    return _invoke_function_over_columns("asin", col)


@try_remote_functions
def asinh(col: "ColumnOrName") -> Column:
    """
    Computes inverse hyperbolic sine of the input column.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(asinh(col("id"))).show()
    +---------+
    |ASINH(id)|
    +---------+
    |      0.0|
    +---------+
    """
    return _invoke_function_over_columns("asinh", col)


@try_remote_functions
def atan(col: "ColumnOrName") -> Column:
    """
    Compute inverse tangent of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        inverse tangent of `col`, as if computed by `java.lang.Math.atan()`

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(atan(df.id)).show()
    +--------+
    |ATAN(id)|
    +--------+
    |     0.0|
    +--------+
    """
    return _invoke_function_over_columns("atan", col)


@try_remote_functions
def atanh(col: "ColumnOrName") -> Column:
    """
    Computes inverse hyperbolic tangent of the input column.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([(0,), (2,)], schema=["numbers"])
    >>> df.select(atanh(df["numbers"])).show()
    +--------------+
    |ATANH(numbers)|
    +--------------+
    |           0.0|
    |           NaN|
    +--------------+
    """
    return _invoke_function_over_columns("atanh", col)


@try_remote_functions
def cbrt(col: "ColumnOrName") -> Column:
    """
    Computes the cube-root of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(cbrt(lit(27))).show()
    +--------+
    |CBRT(27)|
    +--------+
    |     3.0|
    +--------+
    """
    return _invoke_function_over_columns("cbrt", col)


@try_remote_functions
def ceil(col: "ColumnOrName") -> Column:
    """
    Computes the ceiling of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(ceil(lit(-0.1))).show()
    +----------+
    |CEIL(-0.1)|
    +----------+
    |         0|
    +----------+
    """
    return _invoke_function_over_columns("ceil", col)


@try_remote_functions
def ceiling(col: "ColumnOrName") -> Column:
    """
    Computes the ceiling of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.ceil(sf.lit(-0.1))).show()
    +----------+
    |CEIL(-0.1)|
    +----------+
    |         0|
    +----------+
    """
    return _invoke_function_over_columns("ceiling", col)


@try_remote_functions
def cos(col: "ColumnOrName") -> Column:
    """
    Computes cosine of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        angle in radians

    Returns
    -------
    :class:`~pyspark.sql.Column`
        cosine of the angle, as if computed by `java.lang.Math.cos()`.

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(cos(lit(math.pi))).first()
    Row(COS(3.14159...)=-1.0)
    """
    return _invoke_function_over_columns("cos", col)


@try_remote_functions
def cosh(col: "ColumnOrName") -> Column:
    """
    Computes hyperbolic cosine of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        hyperbolic angle

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hyperbolic cosine of the angle, as if computed by `java.lang.Math.cosh()`

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(cosh(lit(1))).first()
    Row(COSH(1)=1.54308...)
    """
    return _invoke_function_over_columns("cosh", col)


@try_remote_functions
def cot(col: "ColumnOrName") -> Column:
    """
    Computes cotangent of the input column.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        angle in radians.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        cotangent of the angle.

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(cot(lit(math.radians(45)))).first()
    Row(COT(0.78539...)=1.00000...)
    """
    return _invoke_function_over_columns("cot", col)


@try_remote_functions
def csc(col: "ColumnOrName") -> Column:
    """
    Computes cosecant of the input column.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        angle in radians.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        cosecant of the angle.

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(csc(lit(math.radians(90)))).first()
    Row(CSC(1.57079...)=1.0)
    """
    return _invoke_function_over_columns("csc", col)


@try_remote_functions
def e() -> Column:
    """Returns Euler's number.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.range(1).select(e()).show()
    +-----------------+
    |              E()|
    +-----------------+
    |2.718281828459045|
    +-----------------+
    """
    return _invoke_function("e")


@try_remote_functions
def exp(col: "ColumnOrName") -> Column:
    """
    Computes the exponential of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to calculate exponential for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        exponential of the given value.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(exp(lit(0))).show()
    +------+
    |EXP(0)|
    +------+
    |   1.0|
    +------+
    """
    return _invoke_function_over_columns("exp", col)


@try_remote_functions
def expm1(col: "ColumnOrName") -> Column:
    """
    Computes the exponential of the given value minus one.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to calculate exponential for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        exponential less one.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(expm1(lit(1))).first()
    Row(EXPM1(1)=1.71828...)
    """
    return _invoke_function_over_columns("expm1", col)


@try_remote_functions
def floor(col: "ColumnOrName") -> Column:
    """
    Computes the floor of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to find floor for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        nearest integer that is less than or equal to given value.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(floor(lit(2.5))).show()
    +----------+
    |FLOOR(2.5)|
    +----------+
    |         2|
    +----------+
    """
    return _invoke_function_over_columns("floor", col)


@try_remote_functions
def log(col: "ColumnOrName") -> Column:
    """
    Computes the natural logarithm of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to calculate natural logarithm for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        natural logarithm of the given value.

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(log(lit(math.e))).first()
    Row(ln(2.71828...)=1.0)
    """
    return _invoke_function_over_columns("log", col)


@try_remote_functions
def log10(col: "ColumnOrName") -> Column:
    """
    Computes the logarithm of the given value in Base 10.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to calculate logarithm for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        logarithm of the given value in Base 10.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(log10(lit(100))).show()
    +----------+
    |LOG10(100)|
    +----------+
    |       2.0|
    +----------+
    """
    return _invoke_function_over_columns("log10", col)


@try_remote_functions
def log1p(col: "ColumnOrName") -> Column:
    """
    Computes the natural logarithm of the "given value plus one".

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to calculate natural logarithm for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        natural logarithm of the "given value plus one".

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(log1p(lit(math.e))).first()
    Row(LOG1P(2.71828...)=1.31326...)

    Same as:

    >>> df.select(log(lit(math.e+1))).first()
    Row(ln(3.71828...)=1.31326...)
    """
    return _invoke_function_over_columns("log1p", col)


@try_remote_functions
def negative(col: "ColumnOrName") -> Column:
    """
    Returns the negative value.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to calculate negative value for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        negative value.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(3).select(sf.negative("id")).show()
    +------------+
    |negative(id)|
    +------------+
    |           0|
    |          -1|
    |          -2|
    +------------+
    """
    return _invoke_function_over_columns("negative", col)


negate = negative


@try_remote_functions
def pi() -> Column:
    """Returns Pi.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.range(1).select(pi()).show()
    +-----------------+
    |             PI()|
    +-----------------+
    |3.141592653589793|
    +-----------------+
    """
    return _invoke_function("pi")


@try_remote_functions
def positive(col: "ColumnOrName") -> Column:
    """
    Returns the value.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input value column.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value.

    Examples
    --------
    >>> df = spark.createDataFrame([(-1,), (0,), (1,)], ['v'])
    >>> df.select(positive("v").alias("p")).show()
    +---+
    |  p|
    +---+
    | -1|
    |  0|
    |  1|
    +---+
    """
    return _invoke_function_over_columns("positive", col)


@try_remote_functions
def rint(col: "ColumnOrName") -> Column:
    """
    Returns the double value that is closest in value to the argument and
    is equal to a mathematical integer.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(rint(lit(10.6))).show()
    +----------+
    |rint(10.6)|
    +----------+
    |      11.0|
    +----------+

    >>> df.select(rint(lit(10.3))).show()
    +----------+
    |rint(10.3)|
    +----------+
    |      10.0|
    +----------+
    """
    return _invoke_function_over_columns("rint", col)


@try_remote_functions
def sec(col: "ColumnOrName") -> Column:
    """
    Computes secant of the input column.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Angle in radians

    Returns
    -------
    :class:`~pyspark.sql.Column`
        Secant of the angle.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(sec(lit(1.5))).first()
    Row(SEC(1.5)=14.13683...)
    """
    return _invoke_function_over_columns("sec", col)


@try_remote_functions
def signum(col: "ColumnOrName") -> Column:
    """
    Computes the signum of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(
    ...     sf.signum(sf.lit(-5)),
    ...     sf.signum(sf.lit(6))
    ... ).show()
    +----------+---------+
    |SIGNUM(-5)|SIGNUM(6)|
    +----------+---------+
    |      -1.0|      1.0|
    +----------+---------+
    """
    return _invoke_function_over_columns("signum", col)


@try_remote_functions
def sign(col: "ColumnOrName") -> Column:
    """
    Computes the signum of the given value.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(
    ...     sf.sign(sf.lit(-5)),
    ...     sf.sign(sf.lit(6))
    ... ).show()
    +--------+-------+
    |sign(-5)|sign(6)|
    +--------+-------+
    |    -1.0|    1.0|
    +--------+-------+
    """
    return _invoke_function_over_columns("sign", col)


@try_remote_functions
def sin(col: "ColumnOrName") -> Column:
    """
    Computes sine of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        sine of the angle, as if computed by `java.lang.Math.sin()`

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(sin(lit(math.radians(90)))).first()
    Row(SIN(1.57079...)=1.0)
    """
    return _invoke_function_over_columns("sin", col)


@try_remote_functions
def sinh(col: "ColumnOrName") -> Column:
    """
    Computes hyperbolic sine of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        hyperbolic angle.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hyperbolic sine of the given value,
        as if computed by `java.lang.Math.sinh()`

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(sinh(lit(1.1))).first()
    Row(SINH(1.1)=1.33564...)
    """
    return _invoke_function_over_columns("sinh", col)


@try_remote_functions
def tan(col: "ColumnOrName") -> Column:
    """
    Computes tangent of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        angle in radians

    Returns
    -------
    :class:`~pyspark.sql.Column`
        tangent of the given value, as if computed by `java.lang.Math.tan()`

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(tan(lit(math.radians(45)))).first()
    Row(TAN(0.78539...)=0.99999...)
    """
    return _invoke_function_over_columns("tan", col)


@try_remote_functions
def tanh(col: "ColumnOrName") -> Column:
    """
    Computes hyperbolic tangent of the input column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        hyperbolic angle

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hyperbolic tangent of the given value
        as if computed by `java.lang.Math.tanh()`

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(tanh(lit(math.radians(90)))).first()
    Row(TANH(1.57079...)=0.91715...)
    """
    return _invoke_function_over_columns("tanh", col)


@try_remote_functions
def toDegrees(col: "ColumnOrName") -> Column:
    """
    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 2.1.0
        Use :func:`degrees` instead.
    """
    warnings.warn("Deprecated in 2.1, use degrees instead.", FutureWarning)
    return degrees(col)


@try_remote_functions
def toRadians(col: "ColumnOrName") -> Column:
    """
    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 2.1.0
        Use :func:`radians` instead.
    """
    warnings.warn("Deprecated in 2.1, use radians instead.", FutureWarning)
    return radians(col)


@try_remote_functions
def bitwiseNOT(col: "ColumnOrName") -> Column:
    """
    Computes bitwise not.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 3.2.0
        Use :func:`bitwise_not` instead.
    """
    warnings.warn("Deprecated in 3.2, use bitwise_not instead.", FutureWarning)
    return bitwise_not(col)


@try_remote_functions
def bitwise_not(col: "ColumnOrName") -> Column:
    """
    Computes bitwise not.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(bitwise_not(lit(0))).show()
    +---+
    | ~0|
    +---+
    | -1|
    +---+
    >>> df.select(bitwise_not(lit(1))).show()
    +---+
    | ~1|
    +---+
    | -2|
    +---+
    """
    return _invoke_function_over_columns("bitwise_not", col)


@try_remote_functions
def bit_count(col: "ColumnOrName") -> Column:
    """
    Returns the number of bits that are set in the argument expr as an unsigned 64-bit integer,
    or NULL if the argument is NULL.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the number of bits that are set in the argument expr as an unsigned 64-bit integer,
        or NULL if the argument is NULL.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(bit_count("c")).show()
    +------------+
    |bit_count(c)|
    +------------+
    |           1|
    |           1|
    |           1|
    +------------+
    """
    return _invoke_function_over_columns("bit_count", col)


@try_remote_functions
def bit_get(col: "ColumnOrName", pos: "ColumnOrName") -> Column:
    """
    Returns the value of the bit (0 or 1) at the specified position.
    The positions are numbered from right to left, starting at zero.
    The position argument cannot be negative.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    pos : :class:`~pyspark.sql.Column` or str
        The positions are numbered from right to left, starting at zero.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the value of the bit (0 or 1) at the specified position.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(bit_get("c", lit(1))).show()
    +-------------+
    |bit_get(c, 1)|
    +-------------+
    |            0|
    |            0|
    |            1|
    +-------------+
    """
    return _invoke_function_over_columns("bit_get", col, pos)


@try_remote_functions
def getbit(col: "ColumnOrName", pos: "ColumnOrName") -> Column:
    """
    Returns the value of the bit (0 or 1) at the specified position.
    The positions are numbered from right to left, starting at zero.
    The position argument cannot be negative.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    pos : :class:`~pyspark.sql.Column` or str
        The positions are numbered from right to left, starting at zero.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the value of the bit (0 or 1) at the specified position.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[1], [1], [2]], ["c"]
    ... ).select(sf.getbit("c", sf.lit(1))).show()
    +------------+
    |getbit(c, 1)|
    +------------+
    |           0|
    |           0|
    |           1|
    +------------+
    """
    return _invoke_function_over_columns("getbit", col, pos)


@try_remote_functions
def asc_nulls_first(col: "ColumnOrName") -> Column:
    """
    Returns a sort expression based on the ascending order of the given
    column name, and null values return before non-null values.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to sort by in the ascending order.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column specifying the order.

    Examples
    --------
    >>> df1 = spark.createDataFrame([(1, "Bob"),
    ...                              (0, None),
    ...                              (2, "Alice")], ["age", "name"])
    >>> df1.sort(asc_nulls_first(df1.name)).show()
    +---+-----+
    |age| name|
    +---+-----+
    |  0| NULL|
    |  2|Alice|
    |  1|  Bob|
    +---+-----+

    """
    return (
        col.asc_nulls_first()
        if isinstance(col, Column)
        else _invoke_function("asc_nulls_first", col)
    )


@try_remote_functions
def asc_nulls_last(col: "ColumnOrName") -> Column:
    """
    Returns a sort expression based on the ascending order of the given
    column name, and null values appear after non-null values.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to sort by in the ascending order.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column specifying the order.

    Examples
    --------
    >>> df1 = spark.createDataFrame([(0, None),
    ...                              (1, "Bob"),
    ...                              (2, "Alice")], ["age", "name"])
    >>> df1.sort(asc_nulls_last(df1.name)).show()
    +---+-----+
    |age| name|
    +---+-----+
    |  2|Alice|
    |  1|  Bob|
    |  0| NULL|
    +---+-----+

    """
    return (
        col.asc_nulls_last() if isinstance(col, Column) else _invoke_function("asc_nulls_last", col)
    )


@try_remote_functions
def desc_nulls_first(col: "ColumnOrName") -> Column:
    """
    Returns a sort expression based on the descending order of the given
    column name, and null values appear before non-null values.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to sort by in the descending order.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column specifying the order.

    Examples
    --------
    >>> df1 = spark.createDataFrame([(0, None),
    ...                              (1, "Bob"),
    ...                              (2, "Alice")], ["age", "name"])
    >>> df1.sort(desc_nulls_first(df1.name)).show()
    +---+-----+
    |age| name|
    +---+-----+
    |  0| NULL|
    |  1|  Bob|
    |  2|Alice|
    +---+-----+

    """
    return (
        col.desc_nulls_first()
        if isinstance(col, Column)
        else _invoke_function("desc_nulls_first", col)
    )


@try_remote_functions
def desc_nulls_last(col: "ColumnOrName") -> Column:
    """
    Returns a sort expression based on the descending order of the given
    column name, and null values appear after non-null values.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to sort by in the descending order.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column specifying the order.

    Examples
    --------
    >>> df1 = spark.createDataFrame([(0, None),
    ...                              (1, "Bob"),
    ...                              (2, "Alice")], ["age", "name"])
    >>> df1.sort(desc_nulls_last(df1.name)).show()
    +---+-----+
    |age| name|
    +---+-----+
    |  1|  Bob|
    |  2|Alice|
    |  0| NULL|
    +---+-----+

    """
    return (
        col.desc_nulls_last()
        if isinstance(col, Column)
        else _invoke_function("desc_nulls_last", col)
    )


@try_remote_functions
def stddev(col: "ColumnOrName") -> Column:
    """
    Aggregate function: alias for stddev_samp.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        standard deviation of given column.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(6).select(sf.stddev("id")).show()
    +------------------+
    |        stddev(id)|
    +------------------+
    |1.8708286933869...|
    +------------------+
    """
    return _invoke_function_over_columns("stddev", col)


@try_remote_functions
def std(col: "ColumnOrName") -> Column:
    """
    Aggregate function: alias for stddev_samp.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        standard deviation of given column.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(6).select(sf.std("id")).show()
    +------------------+
    |           std(id)|
    +------------------+
    |1.8708286933869...|
    +------------------+
    """
    return _invoke_function_over_columns("std", col)


@try_remote_functions
def stddev_samp(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the unbiased sample standard deviation of
    the expression in a group.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        standard deviation of given column.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(6).select(sf.stddev_samp("id")).show()
    +------------------+
    |   stddev_samp(id)|
    +------------------+
    |1.8708286933869...|
    +------------------+
    """
    return _invoke_function_over_columns("stddev_samp", col)


@try_remote_functions
def stddev_pop(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns population standard deviation of
    the expression in a group.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        standard deviation of given column.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(6).select(sf.stddev_pop("id")).show()
    +-----------------+
    |   stddev_pop(id)|
    +-----------------+
    |1.707825127659...|
    +-----------------+
    """
    return _invoke_function_over_columns("stddev_pop", col)


@try_remote_functions
def variance(col: "ColumnOrName") -> Column:
    """
    Aggregate function: alias for var_samp

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        variance of given column.

    Examples
    --------
    >>> df = spark.range(6)
    >>> df.select(variance(df.id)).show()
    +------------+
    |var_samp(id)|
    +------------+
    |         3.5|
    +------------+
    """
    return _invoke_function_over_columns("variance", col)


@try_remote_functions
def var_samp(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the unbiased sample variance of
    the values in a group.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        variance of given column.

    Examples
    --------
    >>> df = spark.range(6)
    >>> df.select(var_samp(df.id)).show()
    +------------+
    |var_samp(id)|
    +------------+
    |         3.5|
    +------------+
    """
    return _invoke_function_over_columns("var_samp", col)


@try_remote_functions
def var_pop(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the population variance of the values in a group.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        variance of given column.

    Examples
    --------
    >>> df = spark.range(6)
    >>> df.select(var_pop(df.id)).first()
    Row(var_pop(id)=2.91666...)
    """
    return _invoke_function_over_columns("var_pop", col)


@try_remote_functions
def regr_avgx(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the average of the independent variable for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the average of the independent variable for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_avgx("y", "x")).first()
    Row(regr_avgx(y, x)=0.999)
    """
    return _invoke_function_over_columns("regr_avgx", y, x)


@try_remote_functions
def regr_avgy(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the average of the dependent variable for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the average of the dependent variable for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_avgy("y", "x")).first()
    Row(regr_avgy(y, x)=9.980732994136464)
    """
    return _invoke_function_over_columns("regr_avgy", y, x)


@try_remote_functions
def regr_count(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the number of non-null number pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the number of non-null number pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_count("y", "x")).first()
    Row(regr_count(y, x)=1000)
    """
    return _invoke_function_over_columns("regr_count", y, x)


@try_remote_functions
def regr_intercept(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the intercept of the univariate linear regression line
    for non-null pairs in a group, where `y` is the dependent variable and
    `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the intercept of the univariate linear regression line for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_intercept("y", "x")).first()
    Row(regr_intercept(y, x)=-0.04961745990969568)
    """
    return _invoke_function_over_columns("regr_intercept", y, x)


@try_remote_functions
def regr_r2(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the coefficient of determination for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the coefficient of determination for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_r2("y", "x")).first()
    Row(regr_r2(y, x)=0.9851908293645436)
    """
    return _invoke_function_over_columns("regr_r2", y, x)


@try_remote_functions
def regr_slope(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the slope of the linear regression line for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the slope of the linear regression line for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_slope("y", "x")).first()
    Row(regr_slope(y, x)=10.040390844891048)
    """
    return _invoke_function_over_columns("regr_slope", y, x)


@try_remote_functions
def regr_sxx(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns REGR_COUNT(y, x) * VAR_POP(x) for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        REGR_COUNT(y, x) * VAR_POP(x) for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_sxx("y", "x")).first()
    Row(regr_sxx(y, x)=666.9989999999996)
    """
    return _invoke_function_over_columns("regr_sxx", y, x)


@try_remote_functions
def regr_sxy(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns REGR_COUNT(y, x) * COVAR_POP(y, x) for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        REGR_COUNT(y, x) * COVAR_POP(y, x) for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_sxy("y", "x")).first()
    Row(regr_sxy(y, x)=6696.93065315148)
    """
    return _invoke_function_over_columns("regr_sxy", y, x)


@try_remote_functions
def regr_syy(y: "ColumnOrName", x: "ColumnOrName") -> Column:
    """
    Aggregate function: returns REGR_COUNT(y, x) * VAR_POP(y) for non-null pairs
    in a group, where `y` is the dependent variable and `x` is the independent variable.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    y : :class:`~pyspark.sql.Column` or str
        the dependent variable.
    x : :class:`~pyspark.sql.Column` or str
        the independent variable.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        REGR_COUNT(y, x) * VAR_POP(y) for non-null pairs in a group.

    Examples
    --------
    >>> x = (col("id") % 3).alias("x")
    >>> y = (randn(42) + x * 10).alias("y")
    >>> df = spark.range(0, 1000, 1, 1).select(x, y)
    >>> df.select(regr_syy("y", "x")).first()
    Row(regr_syy(y, x)=68250.53503811295)
    """
    return _invoke_function_over_columns("regr_syy", y, x)


@try_remote_functions
def every(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns true if all values of `col` are true.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to check if all values are true.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if all values of `col` are true, false otherwise.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[True], [True], [True]], ["flag"]
    ... ).select(sf.every("flag")).show()
    +-----------+
    |every(flag)|
    +-----------+
    |       true|
    +-----------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[True], [False], [True]], ["flag"]
    ... ).select(sf.every("flag")).show()
    +-----------+
    |every(flag)|
    +-----------+
    |      false|
    +-----------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[False], [False], [False]], ["flag"]
    ... ).select(sf.every("flag")).show()
    +-----------+
    |every(flag)|
    +-----------+
    |      false|
    +-----------+
    """
    return _invoke_function_over_columns("every", col)


@try_remote_functions
def bool_and(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns true if all values of `col` are true.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to check if all values are true.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if all values of `col` are true, false otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([[True], [True], [True]], ["flag"])
    >>> df.select(bool_and("flag")).show()
    +--------------+
    |bool_and(flag)|
    +--------------+
    |          true|
    +--------------+
    >>> df = spark.createDataFrame([[True], [False], [True]], ["flag"])
    >>> df.select(bool_and("flag")).show()
    +--------------+
    |bool_and(flag)|
    +--------------+
    |         false|
    +--------------+
    >>> df = spark.createDataFrame([[False], [False], [False]], ["flag"])
    >>> df.select(bool_and("flag")).show()
    +--------------+
    |bool_and(flag)|
    +--------------+
    |         false|
    +--------------+
    """
    return _invoke_function_over_columns("bool_and", col)


@try_remote_functions
def some(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns true if at least one value of `col` is true.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to check if at least one value is true.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if at least one value of `col` is true, false otherwise.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[True], [True], [True]], ["flag"]
    ... ).select(sf.some("flag")).show()
    +----------+
    |some(flag)|
    +----------+
    |      true|
    +----------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[True], [False], [True]], ["flag"]
    ... ).select(sf.some("flag")).show()
    +----------+
    |some(flag)|
    +----------+
    |      true|
    +----------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [[False], [False], [False]], ["flag"]
    ... ).select(sf.some("flag")).show()
    +----------+
    |some(flag)|
    +----------+
    |     false|
    +----------+
    """
    return _invoke_function_over_columns("some", col)


@try_remote_functions
def bool_or(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns true if at least one value of `col` is true.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to check if at least one value is true.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if at least one value of `col` is true, false otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([[True], [True], [True]], ["flag"])
    >>> df.select(bool_or("flag")).show()
    +-------------+
    |bool_or(flag)|
    +-------------+
    |         true|
    +-------------+
    >>> df = spark.createDataFrame([[True], [False], [True]], ["flag"])
    >>> df.select(bool_or("flag")).show()
    +-------------+
    |bool_or(flag)|
    +-------------+
    |         true|
    +-------------+
    >>> df = spark.createDataFrame([[False], [False], [False]], ["flag"])
    >>> df.select(bool_or("flag")).show()
    +-------------+
    |bool_or(flag)|
    +-------------+
    |        false|
    +-------------+
    """
    return _invoke_function_over_columns("bool_or", col)


@try_remote_functions
def bit_and(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the bitwise AND of all non-null input values, or null if none.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the bitwise AND of all non-null input values, or null if none.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(bit_and("c")).first()
    Row(bit_and(c)=0)
    """
    return _invoke_function_over_columns("bit_and", col)


@try_remote_functions
def bit_or(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the bitwise OR of all non-null input values, or null if none.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the bitwise OR of all non-null input values, or null if none.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(bit_or("c")).first()
    Row(bit_or(c)=3)
    """
    return _invoke_function_over_columns("bit_or", col)


@try_remote_functions
def bit_xor(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the bitwise XOR of all non-null input values, or null if none.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the bitwise XOR of all non-null input values, or null if none.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(bit_xor("c")).first()
    Row(bit_xor(c)=2)
    """
    return _invoke_function_over_columns("bit_xor", col)


@try_remote_functions
def skewness(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the skewness of the values in a group.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        skewness of given column.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(skewness(df.c)).first()
    Row(skewness(c)=0.70710...)
    """
    return _invoke_function_over_columns("skewness", col)


@try_remote_functions
def kurtosis(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the kurtosis of the values in a group.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        kurtosis of given column.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.select(kurtosis(df.c)).show()
    +-----------+
    |kurtosis(c)|
    +-----------+
    |       -1.5|
    +-----------+
    """
    return _invoke_function_over_columns("kurtosis", col)


@try_remote_functions
def collect_list(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns a list of objects with duplicates.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic because the order of collected results depends
    on the order of the rows which may be non-deterministic after a shuffle.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        list of objects with duplicates.

    Examples
    --------
    >>> df2 = spark.createDataFrame([(2,), (5,), (5,)], ('age',))
    >>> df2.agg(collect_list('age')).collect()
    [Row(collect_list(age)=[2, 5, 5])]
    """
    return _invoke_function_over_columns("collect_list", col)


@try_remote_functions
def array_agg(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns a list of objects with duplicates.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        list of objects with duplicates.

    Examples
    --------
    >>> df = spark.createDataFrame([[1],[1],[2]], ["c"])
    >>> df.agg(array_agg('c').alias('r')).collect()
    [Row(r=[1, 1, 2])]
    """
    return _invoke_function_over_columns("array_agg", col)


@try_remote_functions
def collect_set(col: "ColumnOrName") -> Column:
    """
    Aggregate function: returns a set of objects with duplicate elements eliminated.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic because the order of collected results depends
    on the order of the rows which may be non-deterministic after a shuffle.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        list of objects with no duplicates.

    Examples
    --------
    >>> df2 = spark.createDataFrame([(2,), (5,), (5,)], ('age',))
    >>> df2.agg(array_sort(collect_set('age')).alias('c')).collect()
    [Row(c=[2, 5])]
    """
    return _invoke_function_over_columns("collect_set", col)


@try_remote_functions
def degrees(col: "ColumnOrName") -> Column:
    """
    Converts an angle measured in radians to an approximately equivalent angle
    measured in degrees.

    .. versionadded:: 2.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        angle in radians

    Returns
    -------
    :class:`~pyspark.sql.Column`
        angle in degrees, as if computed by `java.lang.Math.toDegrees()`

    Examples
    --------
    >>> import math
    >>> df = spark.range(1)
    >>> df.select(degrees(lit(math.pi))).first()
    Row(DEGREES(3.14159...)=180.0)
    """
    return _invoke_function_over_columns("degrees", col)


@try_remote_functions
def radians(col: "ColumnOrName") -> Column:
    """
    Converts an angle measured in degrees to an approximately equivalent angle
    measured in radians.

    .. versionadded:: 2.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        angle in degrees

    Returns
    -------
    :class:`~pyspark.sql.Column`
        angle in radians, as if computed by `java.lang.Math.toRadians()`

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(radians(lit(180))).first()
    Row(RADIANS(180)=3.14159...)
    """
    return _invoke_function_over_columns("radians", col)


@try_remote_functions
def atan2(col1: Union["ColumnOrName", float], col2: Union["ColumnOrName", float]) -> Column:
    """
    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : str, :class:`~pyspark.sql.Column` or float
        coordinate on y-axis
    col2 : str, :class:`~pyspark.sql.Column` or float
        coordinate on x-axis

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the `theta` component of the point
        (`r`, `theta`)
        in polar coordinates that corresponds to the point
        (`x`, `y`) in Cartesian coordinates,
        as if computed by `java.lang.Math.atan2()`

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(atan2(lit(1), lit(2))).first()
    Row(ATAN2(1, 2)=0.46364...)
    """
    return _invoke_binary_math_function("atan2", col1, col2)


@try_remote_functions
def hypot(col1: Union["ColumnOrName", float], col2: Union["ColumnOrName", float]) -> Column:
    """
    Computes ``sqrt(a^2 + b^2)`` without intermediate overflow or underflow.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : str, :class:`~pyspark.sql.Column` or float
        a leg.
    col2 : str, :class:`~pyspark.sql.Column` or float
        b leg.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        length of the hypotenuse.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(hypot(lit(1), lit(2))).first()
    Row(HYPOT(1, 2)=2.23606...)
    """
    return _invoke_binary_math_function("hypot", col1, col2)


@try_remote_functions
def pow(col1: Union["ColumnOrName", float], col2: Union["ColumnOrName", float]) -> Column:
    """
    Returns the value of the first argument raised to the power of the second argument.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : str, :class:`~pyspark.sql.Column` or float
        the base number.
    col2 : str, :class:`~pyspark.sql.Column` or float
        the exponent number.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the base rased to the power the argument.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(pow(lit(3), lit(2))).first()
    Row(POWER(3, 2)=9.0)
    """
    return _invoke_binary_math_function("pow", col1, col2)


power = pow


@try_remote_functions
def pmod(dividend: Union["ColumnOrName", float], divisor: Union["ColumnOrName", float]) -> Column:
    """
    Returns the positive value of dividend mod divisor.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    dividend : str, :class:`~pyspark.sql.Column` or float
        the column that contains dividend, or the specified dividend value
    divisor : str, :class:`~pyspark.sql.Column` or float
        the column that contains divisor, or the specified divisor value

    Returns
    -------
    :class:`~pyspark.sql.Column`
        positive value of dividend mod divisor.

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> from pyspark.sql.functions import pmod
    >>> df = spark.createDataFrame([
    ...     (1.0, float('nan')), (float('nan'), 2.0), (10.0, 3.0),
    ...     (float('nan'), float('nan')), (-3.0, 4.0), (-10.0, 3.0),
    ...     (-5.0, -6.0), (7.0, -8.0), (1.0, 2.0)],
    ...     ("a", "b"))
    >>> df.select(pmod("a", "b")).show()
    +----------+
    |pmod(a, b)|
    +----------+
    |       NaN|
    |       NaN|
    |       1.0|
    |       NaN|
    |       1.0|
    |       2.0|
    |      -5.0|
    |       7.0|
    |       1.0|
    +----------+
    """
    return _invoke_binary_math_function("pmod", dividend, divisor)


@try_remote_functions
def width_bucket(
    v: "ColumnOrName",
    min: "ColumnOrName",
    max: "ColumnOrName",
    numBucket: Union["ColumnOrName", int],
) -> Column:
    """
    Returns the bucket number into which the value of this expression would fall
    after being evaluated. Note that input arguments must follow conditions listed below;
    otherwise, the method will return null.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    v : str or :class:`~pyspark.sql.Column`
        value to compute a bucket number in the histogram
    min : str or :class:`~pyspark.sql.Column`
        minimum value of the histogram
    max : str or :class:`~pyspark.sql.Column`
        maximum value of the histogram
    numBucket : str, :class:`~pyspark.sql.Column` or int
        the number of buckets

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the bucket number into which the value would fall after being evaluated

    Examples
    --------
    >>> df = spark.createDataFrame([
    ...     (5.3, 0.2, 10.6, 5),
    ...     (-2.1, 1.3, 3.4, 3),
    ...     (8.1, 0.0, 5.7, 4),
    ...     (-0.9, 5.2, 0.5, 2)],
    ...     ['v', 'min', 'max', 'n'])
    >>> df.select(width_bucket('v', 'min', 'max', 'n')).show()
    +----------------------------+
    |width_bucket(v, min, max, n)|
    +----------------------------+
    |                           3|
    |                           0|
    |                           5|
    |                           3|
    +----------------------------+
    """
    numBucket = lit(numBucket) if isinstance(numBucket, int) else numBucket
    return _invoke_function_over_columns("width_bucket", v, min, max, numBucket)


@try_remote_functions
def row_number() -> Column:
    """
    Window function: returns a sequential number starting at 1 within a window partition.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for calculating row numbers.

    Examples
    --------
    >>> from pyspark.sql import Window
    >>> df = spark.range(3)
    >>> w = Window.orderBy(df.id.desc())
    >>> df.withColumn("desc_order", row_number().over(w)).show()
    +---+----------+
    | id|desc_order|
    +---+----------+
    |  2|         1|
    |  1|         2|
    |  0|         3|
    +---+----------+
    """
    return _invoke_function("row_number")


@try_remote_functions
def dense_rank() -> Column:
    """
    Window function: returns the rank of rows within a window partition, without any gaps.

    The difference between rank and dense_rank is that dense_rank leaves no gaps in ranking
    sequence when there are ties. That is, if you were ranking a competition using dense_rank
    and had three people tie for second place, you would say that all three were in second
    place and that the next person came in third. Rank would give me sequential numbers, making
    the person that came in third place (after the ties) would register as coming in fifth.

    This is equivalent to the DENSE_RANK function in SQL.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for calculating ranks.

    Examples
    --------
    >>> from pyspark.sql import Window, types
    >>> df = spark.createDataFrame([1, 1, 2, 3, 3, 4], types.IntegerType())
    >>> w = Window.orderBy("value")
    >>> df.withColumn("drank", dense_rank().over(w)).show()
    +-----+-----+
    |value|drank|
    +-----+-----+
    |    1|    1|
    |    1|    1|
    |    2|    2|
    |    3|    3|
    |    3|    3|
    |    4|    4|
    +-----+-----+
    """
    return _invoke_function("dense_rank")


@try_remote_functions
def rank() -> Column:
    """
    Window function: returns the rank of rows within a window partition.

    The difference between rank and dense_rank is that dense_rank leaves no gaps in ranking
    sequence when there are ties. That is, if you were ranking a competition using dense_rank
    and had three people tie for second place, you would say that all three were in second
    place and that the next person came in third. Rank would give me sequential numbers, making
    the person that came in third place (after the ties) would register as coming in fifth.

    This is equivalent to the RANK function in SQL.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for calculating ranks.

    Examples
    --------
    >>> from pyspark.sql import Window, types
    >>> df = spark.createDataFrame([1, 1, 2, 3, 3, 4], types.IntegerType())
    >>> w = Window.orderBy("value")
    >>> df.withColumn("drank", rank().over(w)).show()
    +-----+-----+
    |value|drank|
    +-----+-----+
    |    1|    1|
    |    1|    1|
    |    2|    3|
    |    3|    4|
    |    3|    4|
    |    4|    6|
    +-----+-----+
    """
    return _invoke_function("rank")


@try_remote_functions
def cume_dist() -> Column:
    """
    Window function: returns the cumulative distribution of values within a window partition,
    i.e. the fraction of rows that are below the current row.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for calculating cumulative distribution.

    Examples
    --------
    >>> from pyspark.sql import Window, types
    >>> df = spark.createDataFrame([1, 2, 3, 3, 4], types.IntegerType())
    >>> w = Window.orderBy("value")
    >>> df.withColumn("cd", cume_dist().over(w)).show()
    +-----+---+
    |value| cd|
    +-----+---+
    |    1|0.2|
    |    2|0.4|
    |    3|0.8|
    |    3|0.8|
    |    4|1.0|
    +-----+---+
    """
    return _invoke_function("cume_dist")


@try_remote_functions
def percent_rank() -> Column:
    """
    Window function: returns the relative rank (i.e. percentile) of rows within a window partition.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for calculating relative rank.

    Examples
    --------
    >>> from pyspark.sql import Window, types
    >>> df = spark.createDataFrame([1, 1, 2, 3, 3, 4], types.IntegerType())
    >>> w = Window.orderBy("value")
    >>> df.withColumn("pr", percent_rank().over(w)).show()
    +-----+---+
    |value| pr|
    +-----+---+
    |    1|0.0|
    |    1|0.0|
    |    2|0.4|
    |    3|0.6|
    |    3|0.6|
    |    4|1.0|
    +-----+---+
    """
    return _invoke_function("percent_rank")


@try_remote_functions
def approxCountDistinct(col: "ColumnOrName", rsd: Optional[float] = None) -> Column:
    """
    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 2.1.0
        Use :func:`approx_count_distinct` instead.
    """
    warnings.warn("Deprecated in 2.1, use approx_count_distinct instead.", FutureWarning)
    return approx_count_distinct(col, rsd)


@try_remote_functions
def approx_count_distinct(col: "ColumnOrName", rsd: Optional[float] = None) -> Column:
    """Aggregate function: returns a new :class:`~pyspark.sql.Column` for approximate distinct count
    of column `col`.

    .. versionadded:: 2.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
    rsd : float, optional
        maximum relative standard deviation allowed (default = 0.05).
        For rsd < 0.01, it is more efficient to use :func:`count_distinct`

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column of computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([1,2,2,3], "INT")
    >>> df.agg(approx_count_distinct("value").alias('distinct_values')).show()
    +---------------+
    |distinct_values|
    +---------------+
    |              3|
    +---------------+
    """
    if rsd is None:
        return _invoke_function_over_columns("approx_count_distinct", col)
    else:
        return _invoke_function("approx_count_distinct", _to_java_column(col), rsd)


@try_remote_functions
def broadcast(df: DataFrame) -> DataFrame:
    """
    Marks a DataFrame as small enough for use in broadcast joins.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.DataFrame`
        DataFrame marked as ready for broadcast join.

    Examples
    --------
    >>> from pyspark.sql import types
    >>> df = spark.createDataFrame([1, 2, 3, 3, 4], types.IntegerType())
    >>> df_small = spark.range(3)
    >>> df_b = broadcast(df_small)
    >>> df.join(df_b, df.value == df_small.id).show()
    +-----+---+
    |value| id|
    +-----+---+
    |    1|  1|
    |    2|  2|
    +-----+---+
    """

    sc = get_active_spark_context()
    return DataFrame(cast(JVMView, sc._jvm).functions.broadcast(df._jdf), df.sparkSession)


@try_remote_functions
def coalesce(*cols: "ColumnOrName") -> Column:
    """Returns the first column that is not null.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        list of columns to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value of the first column that is not null.

    Examples
    --------
    >>> cDf = spark.createDataFrame([(None, None), (1, None), (None, 2)], ("a", "b"))
    >>> cDf.show()
    +----+----+
    |   a|   b|
    +----+----+
    |NULL|NULL|
    |   1|NULL|
    |NULL|   2|
    +----+----+

    >>> cDf.select(coalesce(cDf["a"], cDf["b"])).show()
    +--------------+
    |coalesce(a, b)|
    +--------------+
    |          NULL|
    |             1|
    |             2|
    +--------------+

    >>> cDf.select('*', coalesce(cDf["a"], lit(0.0))).show()
    +----+----+----------------+
    |   a|   b|coalesce(a, 0.0)|
    +----+----+----------------+
    |NULL|NULL|             0.0|
    |   1|NULL|             1.0|
    |NULL|   2|             0.0|
    +----+----+----------------+
    """
    return _invoke_function_over_seq_of_columns("coalesce", cols)


@try_remote_functions
def corr(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """Returns a new :class:`~pyspark.sql.Column` for the Pearson Correlation Coefficient for
    ``col1`` and ``col2``.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        first column to calculate correlation.
    col1 : :class:`~pyspark.sql.Column` or str
        second column to calculate correlation.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        Pearson Correlation Coefficient of these two column values.

    Examples
    --------
    >>> a = range(20)
    >>> b = [2 * x for x in range(20)]
    >>> df = spark.createDataFrame(zip(a, b), ["a", "b"])
    >>> df.agg(corr("a", "b").alias('c')).collect()
    [Row(c=1.0)]
    """
    return _invoke_function_over_columns("corr", col1, col2)


@try_remote_functions
def covar_pop(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """Returns a new :class:`~pyspark.sql.Column` for the population covariance of ``col1`` and
    ``col2``.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        first column to calculate covariance.
    col1 : :class:`~pyspark.sql.Column` or str
        second column to calculate covariance.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        covariance of these two column values.

    Examples
    --------
    >>> a = [1] * 10
    >>> b = [1] * 10
    >>> df = spark.createDataFrame(zip(a, b), ["a", "b"])
    >>> df.agg(covar_pop("a", "b").alias('c')).collect()
    [Row(c=0.0)]
    """
    return _invoke_function_over_columns("covar_pop", col1, col2)


@try_remote_functions
def covar_samp(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """Returns a new :class:`~pyspark.sql.Column` for the sample covariance of ``col1`` and
    ``col2``.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        first column to calculate covariance.
    col1 : :class:`~pyspark.sql.Column` or str
        second column to calculate covariance.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        sample covariance of these two column values.

    Examples
    --------
    >>> a = [1] * 10
    >>> b = [1] * 10
    >>> df = spark.createDataFrame(zip(a, b), ["a", "b"])
    >>> df.agg(covar_samp("a", "b").alias('c')).collect()
    [Row(c=0.0)]
    """
    return _invoke_function_over_columns("covar_samp", col1, col2)


@try_remote_functions
def countDistinct(col: "ColumnOrName", *cols: "ColumnOrName") -> Column:
    """Returns a new :class:`~pyspark.sql.Column` for distinct count of ``col`` or ``cols``.

    An alias of :func:`count_distinct`, and it is encouraged to use :func:`count_distinct`
    directly.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.
    """
    return count_distinct(col, *cols)


@try_remote_functions
def count_distinct(col: "ColumnOrName", *cols: "ColumnOrName") -> Column:
    """Returns a new :class:`Column` for distinct count of ``col`` or ``cols``.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        first column to compute on.
    cols : :class:`~pyspark.sql.Column` or str
        other columns to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        distinct values of these two column values.

    Examples
    --------
    >>> from pyspark.sql import types
    >>> df1 = spark.createDataFrame([1, 1, 3], types.IntegerType())
    >>> df2 = spark.createDataFrame([1, 2], types.IntegerType())
    >>> df1.join(df2).show()
    +-----+-----+
    |value|value|
    +-----+-----+
    |    1|    1|
    |    1|    2|
    |    1|    1|
    |    1|    2|
    |    3|    1|
    |    3|    2|
    +-----+-----+
    >>> df1.join(df2).select(count_distinct(df1.value, df2.value)).show()
    +----------------------------+
    |count(DISTINCT value, value)|
    +----------------------------+
    |                           4|
    +----------------------------+
    """
    sc = get_active_spark_context()
    return _invoke_function(
        "count_distinct", _to_java_column(col), _to_seq(sc, cols, _to_java_column)
    )


@try_remote_functions
def first(col: "ColumnOrName", ignorenulls: bool = False) -> Column:
    """Aggregate function: returns the first value in a group.

    The function by default returns the first values it sees. It will return the first non-null
    value it sees when ignoreNulls is set to true. If all values are null, then null is returned.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic because its results depends on the order of the
    rows which may be non-deterministic after a shuffle.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to fetch first value for.
    ignorenulls : :class:`~pyspark.sql.Column` or str
        if first value is null then look for first non-null value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        first value of the group.

    Examples
    --------
    >>> df = spark.createDataFrame([("Alice", 2), ("Bob", 5), ("Alice", None)], ("name", "age"))
    >>> df = df.orderBy(df.age)
    >>> df.groupby("name").agg(first("age")).orderBy("name").show()
    +-----+----------+
    | name|first(age)|
    +-----+----------+
    |Alice|      NULL|
    |  Bob|         5|
    +-----+----------+

    Now, to ignore any nulls we needs to set ``ignorenulls`` to `True`

    >>> df.groupby("name").agg(first("age", ignorenulls=True)).orderBy("name").show()
    +-----+----------+
    | name|first(age)|
    +-----+----------+
    |Alice|         2|
    |  Bob|         5|
    +-----+----------+
    """
    return _invoke_function("first", _to_java_column(col), ignorenulls)


@try_remote_functions
def grouping(col: "ColumnOrName") -> Column:
    """
    Aggregate function: indicates whether a specified column in a GROUP BY list is aggregated
    or not, returns 1 for aggregated or 0 for not aggregated in the result set.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to check if it's aggregated.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        returns 1 for aggregated or 0 for not aggregated in the result set.

    Examples
    --------
    >>> df = spark.createDataFrame([("Alice", 2), ("Bob", 5)], ("name", "age"))
    >>> df.cube("name").agg(grouping("name"), sum("age")).orderBy("name").show()
    +-----+--------------+--------+
    | name|grouping(name)|sum(age)|
    +-----+--------------+--------+
    | NULL|             1|       7|
    |Alice|             0|       2|
    |  Bob|             0|       5|
    +-----+--------------+--------+
    """
    return _invoke_function_over_columns("grouping", col)


@try_remote_functions
def grouping_id(*cols: "ColumnOrName") -> Column:
    """
    Aggregate function: returns the level of grouping, equals to

       (grouping(c1) << (n-1)) + (grouping(c2) << (n-2)) + ... + grouping(cn)

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The list of columns should match with grouping columns exactly, or empty (means all
    the grouping columns).

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        columns to check for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        returns level of the grouping it relates to.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, "a", "a"),
    ...                             (3, "a", "a"),
    ...                             (4, "b", "c")], ["c1", "c2", "c3"])
    >>> df.cube("c2", "c3").agg(grouping_id(), sum("c1")).orderBy("c2", "c3").show()
    +----+----+-------------+-------+
    |  c2|  c3|grouping_id()|sum(c1)|
    +----+----+-------------+-------+
    |NULL|NULL|            3|      8|
    |NULL|   a|            2|      4|
    |NULL|   c|            2|      4|
    |   a|NULL|            1|      4|
    |   a|   a|            0|      4|
    |   b|NULL|            1|      4|
    |   b|   c|            0|      4|
    +----+----+-------------+-------+
    """
    return _invoke_function_over_seq_of_columns("grouping_id", cols)


@try_remote_functions
def count_min_sketch(
    col: "ColumnOrName",
    eps: "ColumnOrName",
    confidence: "ColumnOrName",
    seed: "ColumnOrName",
) -> Column:
    """
    Returns a count-min sketch of a column with the given esp, confidence and seed.
    The result is an array of bytes, which can be deserialized to a `CountMinSketch` before usage.
    Count-min sketch is a probabilistic data structure used for cardinality estimation
    using sub-linear space.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    eps : :class:`~pyspark.sql.Column` or str
        relative error, must be positive
    confidence : :class:`~pyspark.sql.Column` or str
        confidence, must be positive and less than 1.0
    seed : :class:`~pyspark.sql.Column` or str
        random seed

    Returns
    -------
    :class:`~pyspark.sql.Column`
        count-min sketch of the column

    Examples
    --------
    >>> df = spark.createDataFrame([[1], [2], [1]], ['data'])
    >>> df = df.agg(count_min_sketch(df.data, lit(0.5), lit(0.5), lit(1)).alias('sketch'))
    >>> df.select(hex(df.sketch).alias('r')).collect()
    [Row(r='0000000100000000000000030000000100000004000000005D8D6AB90000000000000000000000000000000200000000000000010000000000000000')]
    """
    return _invoke_function_over_columns("count_min_sketch", col, eps, confidence, seed)


@try_remote_functions
def input_file_name() -> Column:
    """
    Creates a string column for the file name of the current Spark task.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        file names.

    Examples
    --------
    >>> import os
    >>> path = os.path.abspath(__file__)
    >>> df = spark.read.text(path)
    >>> df.select(input_file_name()).first()
    Row(input_file_name()='file:///...')
    """
    return _invoke_function("input_file_name")


@try_remote_functions
def isnan(col: "ColumnOrName") -> Column:
    """An expression that returns true if the column is NaN.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        True if value is NaN and False otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([(1.0, float('nan')), (float('nan'), 2.0)], ("a", "b"))
    >>> df.select("a", "b", isnan("a").alias("r1"), isnan(df.b).alias("r2")).show()
    +---+---+-----+-----+
    |  a|  b|   r1|   r2|
    +---+---+-----+-----+
    |1.0|NaN|false| true|
    |NaN|2.0| true|false|
    +---+---+-----+-----+
    """
    return _invoke_function_over_columns("isnan", col)


@try_remote_functions
def isnull(col: "ColumnOrName") -> Column:
    """An expression that returns true if the column is null.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        True if value is null and False otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, None), (None, 2)], ("a", "b"))
    >>> df.select("a", "b", isnull("a").alias("r1"), isnull(df.b).alias("r2")).show()
    +----+----+-----+-----+
    |   a|   b|   r1|   r2|
    +----+----+-----+-----+
    |   1|NULL|false| true|
    |NULL|   2| true|false|
    +----+----+-----+-----+
    """
    return _invoke_function_over_columns("isnull", col)


@try_remote_functions
def last(col: "ColumnOrName", ignorenulls: bool = False) -> Column:
    """Aggregate function: returns the last value in a group.

    The function by default returns the last values it sees. It will return the last non-null
    value it sees when ignoreNulls is set to true. If all values are null, then null is returned.

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic because its results depends on the order of the
    rows which may be non-deterministic after a shuffle.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column to fetch last value for.
    ignorenulls : :class:`~pyspark.sql.Column` or str
        if last value is null then look for non-null value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        last value of the group.

    Examples
    --------
    >>> df = spark.createDataFrame([("Alice", 2), ("Bob", 5), ("Alice", None)], ("name", "age"))
    >>> df = df.orderBy(df.age.desc())
    >>> df.groupby("name").agg(last("age")).orderBy("name").show()
    +-----+---------+
    | name|last(age)|
    +-----+---------+
    |Alice|     NULL|
    |  Bob|        5|
    +-----+---------+

    Now, to ignore any nulls we needs to set ``ignorenulls`` to `True`

    >>> df.groupby("name").agg(last("age", ignorenulls=True)).orderBy("name").show()
    +-----+---------+
    | name|last(age)|
    +-----+---------+
    |Alice|        2|
    |  Bob|        5|
    +-----+---------+
    """
    return _invoke_function("last", _to_java_column(col), ignorenulls)


@try_remote_functions
def monotonically_increasing_id() -> Column:
    """A column that generates monotonically increasing 64-bit integers.

    The generated ID is guaranteed to be monotonically increasing and unique, but not consecutive.
    The current implementation puts the partition ID in the upper 31 bits, and the record number
    within each partition in the lower 33 bits. The assumption is that the data frame has
    less than 1 billion partitions, and each partition has less than 8 billion records.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic because its result depends on partition IDs.

    As an example, consider a :class:`DataFrame` with two partitions, each with 3 records.
    This expression would return the following IDs:
    0, 1, 2, 8589934592 (1L << 33), 8589934593, 8589934594.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        last value of the group.

    Examples
    --------
    >>> from pyspark.sql import functions as sf
    >>> spark.range(0, 10, 1, 2).select(sf.monotonically_increasing_id()).show()
    +-----------------------------+
    |monotonically_increasing_id()|
    +-----------------------------+
    |                            0|
    |                            1|
    |                            2|
    |                            3|
    |                            4|
    |                   8589934592|
    |                   8589934593|
    |                   8589934594|
    |                   8589934595|
    |                   8589934596|
    +-----------------------------+
    """
    return _invoke_function("monotonically_increasing_id")


@try_remote_functions
def nanvl(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """Returns col1 if it is not NaN, or col2 if col1 is NaN.

    Both inputs should be floating point columns (:class:`DoubleType` or :class:`FloatType`).

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        first column to check.
    col2 : :class:`~pyspark.sql.Column` or str
        second column to return if first is NaN.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value from first column or second if first is NaN .

    Examples
    --------
    >>> df = spark.createDataFrame([(1.0, float('nan')), (float('nan'), 2.0)], ("a", "b"))
    >>> df.select(nanvl("a", "b").alias("r1"), nanvl(df.a, df.b).alias("r2")).collect()
    [Row(r1=1.0, r2=1.0), Row(r1=2.0, r2=2.0)]
    """
    return _invoke_function_over_columns("nanvl", col1, col2)


@try_remote_functions
def percentile(
    col: "ColumnOrName",
    percentage: Union[Column, float, List[float], Tuple[float]],
    frequency: Union[Column, int] = 1,
) -> Column:
    """Returns the exact percentile(s) of numeric column `expr` at the given percentage(s)
    with value range in [0.0, 1.0].

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str input column.
    percentage : :class:`~pyspark.sql.Column`, float, list of floats or tuple of floats
        percentage in decimal (must be between 0.0 and 1.0).
    frequency : :class:`~pyspark.sql.Column` or int is a positive numeric literal which
        controls frequency.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the exact `percentile` of the numeric column.

    Examples
    --------
    >>> key = (col("id") % 3).alias("key")
    >>> value = (randn(42) + key * 10).alias("value")
    >>> df = spark.range(0, 1000, 1, 1).select(key, value)
    >>> df.select(
    ...     percentile("value", [0.25, 0.5, 0.75], lit(1)).alias("quantiles")
    ... ).show()
    +--------------------+
    |           quantiles|
    +--------------------+
    |[0.74419914941216...|
    +--------------------+

    >>> df.groupBy("key").agg(
    ...     percentile("value", 0.5, lit(1)).alias("median")
    ... ).show()
    +---+--------------------+
    |key|              median|
    +---+--------------------+
    |  0|-0.03449962216667901|
    |  1|   9.990389751837329|
    |  2|  19.967859769284075|
    +---+--------------------+
    """
    sc = get_active_spark_context()

    if isinstance(percentage, (list, tuple)):
        # A local list
        percentage = _invoke_function(
            "array", _to_seq(sc, [_create_column_from_literal(x) for x in percentage])
        )._jc
    elif isinstance(percentage, Column):
        # Already a Column
        percentage = _to_java_column(percentage)
    else:
        # Probably scalar
        percentage = _create_column_from_literal(percentage)

    frequency = (
        _to_java_column(frequency)
        if isinstance(frequency, Column)
        else _create_column_from_literal(frequency)
    )

    return _invoke_function("percentile", _to_java_column(col), percentage, frequency)


@try_remote_functions
def percentile_approx(
    col: "ColumnOrName",
    percentage: Union[Column, float, List[float], Tuple[float]],
    accuracy: Union[Column, float] = 10000,
) -> Column:
    """Returns the approximate `percentile` of the numeric column `col` which is the smallest value
    in the ordered `col` values (sorted from least to greatest) such that no more than `percentage`
    of `col` values is less than the value or equal to that value.


    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column.
    percentage : :class:`~pyspark.sql.Column`, float, list of floats or tuple of floats
        percentage in decimal (must be between 0.0 and 1.0).
        When percentage is an array, each value of the percentage array must be between 0.0 and 1.0.
        In this case, returns the approximate percentile array of column col
        at the given percentage array.
    accuracy : :class:`~pyspark.sql.Column` or float
        is a positive numeric literal which controls approximation accuracy
        at the cost of memory. Higher value of accuracy yields better accuracy,
        1.0/accuracy is the relative error of the approximation. (default: 10000).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        approximate `percentile` of the numeric column.

    Examples
    --------
    >>> key = (col("id") % 3).alias("key")
    >>> value = (randn(42) + key * 10).alias("value")
    >>> df = spark.range(0, 1000, 1, 1).select(key, value)
    >>> df.select(
    ...     percentile_approx("value", [0.25, 0.5, 0.75], 1000000).alias("quantiles")
    ... ).printSchema()
    root
     |-- quantiles: array (nullable = true)
     |    |-- element: double (containsNull = false)

    >>> df.groupBy("key").agg(
    ...     percentile_approx("value", 0.5, lit(1000000)).alias("median")
    ... ).printSchema()
    root
     |-- key: long (nullable = true)
     |-- median: double (nullable = true)
    """
    sc = get_active_spark_context()

    if isinstance(percentage, (list, tuple)):
        # A local list
        percentage = _invoke_function(
            "array", _to_seq(sc, [_create_column_from_literal(x) for x in percentage])
        )._jc
    elif isinstance(percentage, Column):
        # Already a Column
        percentage = _to_java_column(percentage)
    else:
        # Probably scalar
        percentage = _create_column_from_literal(percentage)

    accuracy = (
        _to_java_column(accuracy)
        if isinstance(accuracy, Column)
        else _create_column_from_literal(accuracy)
    )

    return _invoke_function("percentile_approx", _to_java_column(col), percentage, accuracy)


@try_remote_functions
def approx_percentile(
    col: "ColumnOrName",
    percentage: Union[Column, float, List[float], Tuple[float]],
    accuracy: Union[Column, float] = 10000,
) -> Column:
    """Returns the approximate `percentile` of the numeric column `col` which is the smallest value
    in the ordered `col` values (sorted from least to greatest) such that no more than `percentage`
    of `col` values is less than the value or equal to that value.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column.
    percentage : :class:`~pyspark.sql.Column`, float, list of floats or tuple of floats
        percentage in decimal (must be between 0.0 and 1.0).
        When percentage is an array, each value of the percentage array must be between 0.0 and 1.0.
        In this case, returns the approximate percentile array of column col
        at the given percentage array.
    accuracy : :class:`~pyspark.sql.Column` or float
        is a positive numeric literal which controls approximation accuracy
        at the cost of memory. Higher value of accuracy yields better accuracy,
        1.0/accuracy is the relative error of the approximation. (default: 10000).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        approximate `percentile` of the numeric column.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> key = (sf.col("id") % 3).alias("key")
    >>> value = (sf.randn(42) + key * 10).alias("value")
    >>> df = spark.range(0, 1000, 1, 1).select(key, value)
    >>> df.select(
    ...     sf.approx_percentile("value", [0.25, 0.5, 0.75], 1000000)
    ... ).printSchema()
    root
     |-- approx_percentile(value, array(0.25, 0.5, 0.75), 1000000): array (nullable = true)
     |    |-- element: double (containsNull = false)

    >>> df.groupBy("key").agg(
    ...     sf.approx_percentile("value", 0.5, sf.lit(1000000))
    ... ).printSchema()
    root
     |-- key: long (nullable = true)
     |-- approx_percentile(value, 0.5, 1000000): double (nullable = true)
    """
    sc = get_active_spark_context()

    if isinstance(percentage, (list, tuple)):
        # A local list
        percentage = _invoke_function(
            "array", _to_seq(sc, [_create_column_from_literal(x) for x in percentage])
        )._jc
    elif isinstance(percentage, Column):
        # Already a Column
        percentage = _to_java_column(percentage)
    else:
        # Probably scalar
        percentage = _create_column_from_literal(percentage)

    accuracy = (
        _to_java_column(accuracy)
        if isinstance(accuracy, Column)
        else _create_column_from_literal(accuracy)
    )

    return _invoke_function("approx_percentile", _to_java_column(col), percentage, accuracy)


@try_remote_functions
def rand(seed: Optional[int] = None) -> Column:
    """Generates a random column with independent and identically distributed (i.i.d.) samples
    uniformly distributed in [0.0, 1.0).

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic in general case.

    Parameters
    ----------
    seed : int (default: None)
        seed value for random generator.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        random values.

    Examples
    --------
    >>> from pyspark.sql import functions as sf
    >>> spark.range(0, 2, 1, 1).withColumn('rand', sf.rand(seed=42) * 3).show()
    +---+------------------+
    | id|              rand|
    +---+------------------+
    |  0|1.8575681106759028|
    |  1|1.5288056527339444|
    +---+------------------+
    """
    if seed is not None:
        return _invoke_function("rand", seed)
    else:
        return _invoke_function("rand")


@try_remote_functions
def randn(seed: Optional[int] = None) -> Column:
    """Generates a column with independent and identically distributed (i.i.d.) samples from
    the standard normal distribution.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic in general case.

    Parameters
    ----------
    seed : int (default: None)
        seed value for random generator.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        random values.

    Examples
    --------
    >>> from pyspark.sql import functions as sf
    >>> spark.range(0, 2, 1, 1).withColumn('randn', sf.randn(seed=42)).show()
    +---+------------------+
    | id|             randn|
    +---+------------------+
    |  0| 2.384479054241165|
    |  1|0.1920934041293524|
    +---+------------------+
    """
    if seed is not None:
        return _invoke_function("randn", seed)
    else:
        return _invoke_function("randn")


@try_remote_functions
def round(col: "ColumnOrName", scale: int = 0) -> Column:
    """
    Round the given value to `scale` decimal places using HALF_UP rounding mode if `scale` >= 0
    or at integral part when `scale` < 0.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column to round.
    scale : int optional default 0
        scale value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        rounded values.

    Examples
    --------
    >>> spark.createDataFrame([(2.5,)], ['a']).select(round('a', 0).alias('r')).collect()
    [Row(r=3.0)]
    """
    return _invoke_function("round", _to_java_column(col), scale)


@try_remote_functions
def bround(col: "ColumnOrName", scale: int = 0) -> Column:
    """
    Round the given value to `scale` decimal places using HALF_EVEN rounding mode if `scale` >= 0
    or at integral part when `scale` < 0.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column to round.
    scale : int optional default 0
        scale value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        rounded values.

    Examples
    --------
    >>> spark.createDataFrame([(2.5,)], ['a']).select(bround('a', 0).alias('r')).collect()
    [Row(r=2.0)]
    """
    return _invoke_function("bround", _to_java_column(col), scale)


@try_remote_functions
def shiftLeft(col: "ColumnOrName", numBits: int) -> Column:
    """Shift the given value numBits left.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 3.2.0
        Use :func:`shiftleft` instead.
    """
    warnings.warn("Deprecated in 3.2, use shiftleft instead.", FutureWarning)
    return shiftleft(col, numBits)


@try_remote_functions
def shiftleft(col: "ColumnOrName", numBits: int) -> Column:
    """Shift the given value numBits left.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column of values to shift.
    numBits : int
        number of bits to shift.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        shifted value.

    Examples
    --------
    >>> spark.createDataFrame([(21,)], ['a']).select(shiftleft('a', 1).alias('r')).collect()
    [Row(r=42)]
    """
    return _invoke_function("shiftleft", _to_java_column(col), numBits)


@try_remote_functions
def shiftRight(col: "ColumnOrName", numBits: int) -> Column:
    """(Signed) shift the given value numBits right.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 3.2.0
        Use :func:`shiftright` instead.
    """
    warnings.warn("Deprecated in 3.2, use shiftright instead.", FutureWarning)
    return shiftright(col, numBits)


@try_remote_functions
def shiftright(col: "ColumnOrName", numBits: int) -> Column:
    """(Signed) shift the given value numBits right.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column of values to shift.
    numBits : int
        number of bits to shift.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        shifted values.

    Examples
    --------
    >>> spark.createDataFrame([(42,)], ['a']).select(shiftright('a', 1).alias('r')).collect()
    [Row(r=21)]
    """
    return _invoke_function("shiftright", _to_java_column(col), numBits)


@try_remote_functions
def shiftRightUnsigned(col: "ColumnOrName", numBits: int) -> Column:
    """Unsigned shift the given value numBits right.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    .. deprecated:: 3.2.0
        Use :func:`shiftrightunsigned` instead.
    """
    warnings.warn("Deprecated in 3.2, use shiftrightunsigned instead.", FutureWarning)
    return shiftrightunsigned(col, numBits)


@try_remote_functions
def shiftrightunsigned(col: "ColumnOrName", numBits: int) -> Column:
    """Unsigned shift the given value numBits right.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column of values to shift.
    numBits : int
        number of bits to shift.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        shifted value.

    Examples
    --------
    >>> df = spark.createDataFrame([(-42,)], ['a'])
    >>> df.select(shiftrightunsigned('a', 1).alias('r')).collect()
    [Row(r=9223372036854775787)]
    """
    return _invoke_function("shiftrightunsigned", _to_java_column(col), numBits)


@try_remote_functions
def spark_partition_id() -> Column:
    """A column for partition ID.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    This is non deterministic because it depends on data partitioning and task scheduling.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        partition id the record belongs to.

    Examples
    --------
    >>> df = spark.range(2)
    >>> df.repartition(1).select(spark_partition_id().alias("pid")).collect()
    [Row(pid=0), Row(pid=0)]
    """
    return _invoke_function("spark_partition_id")


@try_remote_functions
def expr(str: str) -> Column:
    """Parses the expression string into the column that it represents

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    str : str
        expression defined in string.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column representing the expression.

    Examples
    --------
    >>> df = spark.createDataFrame([["Alice"], ["Bob"]], ["name"])
    >>> df.select("name", expr("length(name)")).show()
    +-----+------------+
    | name|length(name)|
    +-----+------------+
    |Alice|           5|
    |  Bob|           3|
    +-----+------------+
    """
    return _invoke_function("expr", str)


@overload
def struct(*cols: "ColumnOrName") -> Column:
    ...


@overload
def struct(__cols: Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]) -> Column:
    ...


@try_remote_functions
def struct(
    *cols: Union["ColumnOrName", Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]]
) -> Column:
    """Creates a new struct column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : list, set, str or :class:`~pyspark.sql.Column`
        column names or :class:`~pyspark.sql.Column`\\s to contain in the output struct.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a struct type column of given columns.

    Examples
    --------
    >>> df = spark.createDataFrame([("Alice", 2), ("Bob", 5)], ("name", "age"))
    >>> df.select(struct('age', 'name').alias("struct")).collect()
    [Row(struct=Row(age=2, name='Alice')), Row(struct=Row(age=5, name='Bob'))]
    >>> df.select(struct([df.age, df.name]).alias("struct")).collect()
    [Row(struct=Row(age=2, name='Alice')), Row(struct=Row(age=5, name='Bob'))]
    """
    if len(cols) == 1 and isinstance(cols[0], (list, set)):
        cols = cols[0]  # type: ignore[assignment]
    return _invoke_function_over_seq_of_columns("struct", cols)  # type: ignore[arg-type]


@try_remote_functions
def named_struct(*cols: "ColumnOrName") -> Column:
    """
    Creates a struct with the given field names and values.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        list of columns to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`

    Examples
    --------
    >>> df = spark.createDataFrame([(1, 2, 3)], ['a', 'b', 'c'])
    >>> df.select(named_struct(lit('x'), df.a, lit('y'), df.b).alias('r')).collect()
    [Row(r=Row(x=1, y=2))]
    """
    return _invoke_function_over_seq_of_columns("named_struct", cols)


@try_remote_functions
def greatest(*cols: "ColumnOrName") -> Column:
    """
    Returns the greatest value of the list of column names, skipping null values.
    This function takes at least 2 parameters. It will return null if all parameters are null.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        columns to check for gratest value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        gratest value.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, 4, 3)], ['a', 'b', 'c'])
    >>> df.select(greatest(df.a, df.b, df.c).alias("greatest")).collect()
    [Row(greatest=4)]
    """
    if len(cols) < 2:
        raise PySparkValueError(
            error_class="WRONG_NUM_COLUMNS",
            message_parameters={"func_name": "greatest", "num_cols": "2"},
        )
    return _invoke_function_over_seq_of_columns("greatest", cols)


@try_remote_functions
def least(*cols: "ColumnOrName") -> Column:
    """
    Returns the least value of the list of column names, skipping null values.
    This function takes at least 2 parameters. It will return null if all parameters are null.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        column names or columns to be compared

    Returns
    -------
    :class:`~pyspark.sql.Column`
        least value.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, 4, 3)], ['a', 'b', 'c'])
    >>> df.select(least(df.a, df.b, df.c).alias("least")).collect()
    [Row(least=1)]
    """
    if len(cols) < 2:
        raise PySparkValueError(
            error_class="WRONG_NUM_COLUMNS",
            message_parameters={"func_name": "least", "num_cols": "2"},
        )
    return _invoke_function_over_seq_of_columns("least", cols)


@try_remote_functions
def when(condition: Column, value: Any) -> Column:
    """Evaluates a list of conditions and returns one of multiple possible result expressions.
    If :func:`pyspark.sql.Column.otherwise` is not invoked, None is returned for unmatched
    conditions.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    condition : :class:`~pyspark.sql.Column`
        a boolean :class:`~pyspark.sql.Column` expression.
    value :
        a literal value, or a :class:`~pyspark.sql.Column` expression.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        column representing when expression.

    Examples
    --------
    >>> df = spark.range(3)
    >>> df.select(when(df['id'] == 2, 3).otherwise(4).alias("age")).show()
    +---+
    |age|
    +---+
    |  4|
    |  4|
    |  3|
    +---+

    >>> df.select(when(df.id == 2, df.id + 1).alias("age")).show()
    +----+
    | age|
    +----+
    |NULL|
    |NULL|
    |   3|
    +----+
    """
    # Explicitly not using ColumnOrName type here to make reading condition less opaque
    if not isinstance(condition, Column):
        raise PySparkTypeError(
            error_class="NOT_COLUMN",
            message_parameters={"arg_name": "condition", "arg_type": type(condition).__name__},
        )
    v = value._jc if isinstance(value, Column) else value

    return _invoke_function("when", condition._jc, v)


@overload  # type: ignore[no-redef]
def log(arg1: "ColumnOrName") -> Column:
    ...


@overload
def log(arg1: float, arg2: "ColumnOrName") -> Column:
    ...


@try_remote_functions
def log(arg1: Union["ColumnOrName", float], arg2: Optional["ColumnOrName"] = None) -> Column:
    """Returns the first argument-based logarithm of the second argument.

    If there is only one argument, then this takes the natural logarithm of the argument.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    arg1 : :class:`~pyspark.sql.Column`, str or float
        base number or actual number (in this case base is `e`)
    arg2 : :class:`~pyspark.sql.Column`, str or float
        number to calculate logariphm for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        logariphm of given value.

    Examples
    --------
    >>> from pyspark.sql import functions as sf
    >>> df = spark.sql("SELECT * FROM VALUES (1), (2), (4) AS t(value)")
    >>> df.select(sf.log(2.0, df.value).alias('log2_value')).show()
    +----------+
    |log2_value|
    +----------+
    |       0.0|
    |       1.0|
    |       2.0|
    +----------+

    And Natural logarithm

    >>> df.select(sf.log(df.value).alias('ln_value')).show()
    +------------------+
    |          ln_value|
    +------------------+
    |               0.0|
    |0.6931471805599453|
    |1.3862943611198906|
    +------------------+
    """
    if arg2 is None:
        return _invoke_function_over_columns("log", cast("ColumnOrName", arg1))
    else:
        return _invoke_function("log", arg1, _to_java_column(arg2))


@try_remote_functions
def ln(col: "ColumnOrName") -> Column:
    """Returns the natural logarithm of the argument.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        a column to calculate logariphm for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        natural logarithm of given value.

    Examples
    --------
    >>> df = spark.createDataFrame([(4,)], ['a'])
    >>> df.select(ln('a')).show()
    +------------------+
    |             ln(a)|
    +------------------+
    |1.3862943611198906|
    +------------------+
    """
    return _invoke_function_over_columns("ln", col)


@try_remote_functions
def log2(col: "ColumnOrName") -> Column:
    """Returns the base-2 logarithm of the argument.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        a column to calculate logariphm for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        logariphm of given value.

    Examples
    --------
    >>> df = spark.createDataFrame([(4,)], ['a'])
    >>> df.select(log2('a').alias('log2')).show()
    +----+
    |log2|
    +----+
    | 2.0|
    +----+
    """
    return _invoke_function_over_columns("log2", col)


@try_remote_functions
def conv(col: "ColumnOrName", fromBase: int, toBase: int) -> Column:
    """
    Convert a number in a string column from one base to another.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        a column to convert base for.
    fromBase: int
        from base number.
    toBase: int
        to base number.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        logariphm of given value.

    Examples
    --------
    >>> df = spark.createDataFrame([("010101",)], ['n'])
    >>> df.select(conv(df.n, 2, 16).alias('hex')).collect()
    [Row(hex='15')]
    """
    return _invoke_function("conv", _to_java_column(col), fromBase, toBase)


@try_remote_functions
def factorial(col: "ColumnOrName") -> Column:
    """
    Computes the factorial of the given value.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        a column to calculate factorial for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        factorial of given value.

    Examples
    --------
    >>> df = spark.createDataFrame([(5,)], ['n'])
    >>> df.select(factorial(df.n).alias('f')).collect()
    [Row(f=120)]
    """
    return _invoke_function_over_columns("factorial", col)


# ---------------  Window functions ------------------------


@try_remote_functions
def lag(col: "ColumnOrName", offset: int = 1, default: Optional[Any] = None) -> Column:
    """
    Window function: returns the value that is `offset` rows before the current row, and
    `default` if there is less than `offset` rows before the current row. For example,
    an `offset` of one will return the previous row at any given point in the window partition.

    This is equivalent to the LAG function in SQL.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    offset : int, optional default 1
        number of row to extend
    default : optional
        default value

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value before current row based on `offset`.

    Examples
    --------
    >>> from pyspark.sql import Window
    >>> df = spark.createDataFrame([("a", 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.show()
    +---+---+
    | c1| c2|
    +---+---+
    |  a|  1|
    |  a|  2|
    |  a|  3|
    |  b|  8|
    |  b|  2|
    +---+---+
    >>> w = Window.partitionBy("c1").orderBy("c2")
    >>> df.withColumn("previos_value", lag("c2").over(w)).show()
    +---+---+-------------+
    | c1| c2|previos_value|
    +---+---+-------------+
    |  a|  1|         NULL|
    |  a|  2|            1|
    |  a|  3|            2|
    |  b|  2|         NULL|
    |  b|  8|            2|
    +---+---+-------------+
    >>> df.withColumn("previos_value", lag("c2", 1, 0).over(w)).show()
    +---+---+-------------+
    | c1| c2|previos_value|
    +---+---+-------------+
    |  a|  1|            0|
    |  a|  2|            1|
    |  a|  3|            2|
    |  b|  2|            0|
    |  b|  8|            2|
    +---+---+-------------+
    >>> df.withColumn("previos_value", lag("c2", 2, -1).over(w)).show()
    +---+---+-------------+
    | c1| c2|previos_value|
    +---+---+-------------+
    |  a|  1|           -1|
    |  a|  2|           -1|
    |  a|  3|            1|
    |  b|  2|           -1|
    |  b|  8|           -1|
    +---+---+-------------+
    """
    return _invoke_function("lag", _to_java_column(col), offset, default)


@try_remote_functions
def lead(col: "ColumnOrName", offset: int = 1, default: Optional[Any] = None) -> Column:
    """
    Window function: returns the value that is `offset` rows after the current row, and
    `default` if there is less than `offset` rows after the current row. For example,
    an `offset` of one will return the next row at any given point in the window partition.

    This is equivalent to the LEAD function in SQL.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    offset : int, optional default 1
        number of row to extend
    default : optional
        default value

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value after current row based on `offset`.

    Examples
    --------
    >>> from pyspark.sql import Window
    >>> df = spark.createDataFrame([("a", 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.show()
    +---+---+
    | c1| c2|
    +---+---+
    |  a|  1|
    |  a|  2|
    |  a|  3|
    |  b|  8|
    |  b|  2|
    +---+---+
    >>> w = Window.partitionBy("c1").orderBy("c2")
    >>> df.withColumn("next_value", lead("c2").over(w)).show()
    +---+---+----------+
    | c1| c2|next_value|
    +---+---+----------+
    |  a|  1|         2|
    |  a|  2|         3|
    |  a|  3|      NULL|
    |  b|  2|         8|
    |  b|  8|      NULL|
    +---+---+----------+
    >>> df.withColumn("next_value", lead("c2", 1, 0).over(w)).show()
    +---+---+----------+
    | c1| c2|next_value|
    +---+---+----------+
    |  a|  1|         2|
    |  a|  2|         3|
    |  a|  3|         0|
    |  b|  2|         8|
    |  b|  8|         0|
    +---+---+----------+
    >>> df.withColumn("next_value", lead("c2", 2, -1).over(w)).show()
    +---+---+----------+
    | c1| c2|next_value|
    +---+---+----------+
    |  a|  1|         3|
    |  a|  2|        -1|
    |  a|  3|        -1|
    |  b|  2|        -1|
    |  b|  8|        -1|
    +---+---+----------+
    """
    return _invoke_function("lead", _to_java_column(col), offset, default)


@try_remote_functions
def nth_value(col: "ColumnOrName", offset: int, ignoreNulls: Optional[bool] = False) -> Column:
    """
    Window function: returns the value that is the `offset`\\th row of the window frame
    (counting from 1), and `null` if the size of window frame is less than `offset` rows.

    It will return the `offset`\\th non-null value it sees when `ignoreNulls` is set to
    true. If all values are null, then null is returned.

    This is equivalent to the nth_value function in SQL.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    offset : int
        number of row to use as the value
    ignoreNulls : bool, optional
        indicates the Nth value should skip null in the
        determination of which row to use

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value of nth row.

    Examples
    --------
    >>> from pyspark.sql import Window
    >>> df = spark.createDataFrame([("a", 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.show()
    +---+---+
    | c1| c2|
    +---+---+
    |  a|  1|
    |  a|  2|
    |  a|  3|
    |  b|  8|
    |  b|  2|
    +---+---+
    >>> w = Window.partitionBy("c1").orderBy("c2")
    >>> df.withColumn("nth_value", nth_value("c2", 1).over(w)).show()
    +---+---+---------+
    | c1| c2|nth_value|
    +---+---+---------+
    |  a|  1|        1|
    |  a|  2|        1|
    |  a|  3|        1|
    |  b|  2|        2|
    |  b|  8|        2|
    +---+---+---------+
    >>> df.withColumn("nth_value", nth_value("c2", 2).over(w)).show()
    +---+---+---------+
    | c1| c2|nth_value|
    +---+---+---------+
    |  a|  1|     NULL|
    |  a|  2|        2|
    |  a|  3|        2|
    |  b|  2|     NULL|
    |  b|  8|        8|
    +---+---+---------+
    """
    return _invoke_function("nth_value", _to_java_column(col), offset, ignoreNulls)


@try_remote_functions
def any_value(col: "ColumnOrName", ignoreNulls: Optional[Union[bool, Column]] = None) -> Column:
    """Returns some value of `col` for a group of rows.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    ignorenulls : :class:`~pyspark.sql.Column` or bool
        if first value is null then look for first non-null value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        some value of `col` for a group of rows.

    Examples
    --------
    >>> df = spark.createDataFrame([(None, 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.select(any_value('c1'), any_value('c2')).collect()
    [Row(any_value(c1)=None, any_value(c2)=1)]
    >>> df.select(any_value('c1', True), any_value('c2', True)).collect()
    [Row(any_value(c1)='a', any_value(c2)=1)]
    """
    if ignoreNulls is None:
        return _invoke_function_over_columns("any_value", col)
    else:
        ignoreNulls = lit(ignoreNulls) if isinstance(ignoreNulls, bool) else ignoreNulls
        return _invoke_function_over_columns("any_value", col, ignoreNulls)


@try_remote_functions
def first_value(col: "ColumnOrName", ignoreNulls: Optional[Union[bool, Column]] = None) -> Column:
    """Returns the first value of `col` for a group of rows. It will return the first non-null
    value it sees when `ignoreNulls` is set to true. If all values are null, then null is returned.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    ignorenulls : :class:`~pyspark.sql.Column` or bool
        if first value is null then look for first non-null value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        some value of `col` for a group of rows.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [(None, 1), ("a", 2), ("a", 3), ("b", 8), ("b", 2)], ["a", "b"]
    ... ).select(sf.first_value('a'), sf.first_value('b')).show()
    +--------------+--------------+
    |first_value(a)|first_value(b)|
    +--------------+--------------+
    |          NULL|             1|
    +--------------+--------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [(None, 1), ("a", 2), ("a", 3), ("b", 8), ("b", 2)], ["a", "b"]
    ... ).select(sf.first_value('a', True), sf.first_value('b', True)).show()
    +--------------+--------------+
    |first_value(a)|first_value(b)|
    +--------------+--------------+
    |             a|             1|
    +--------------+--------------+
    """
    if ignoreNulls is None:
        return _invoke_function_over_columns("first_value", col)
    else:
        ignoreNulls = lit(ignoreNulls) if isinstance(ignoreNulls, bool) else ignoreNulls
        return _invoke_function_over_columns("first_value", col, ignoreNulls)


@try_remote_functions
def last_value(col: "ColumnOrName", ignoreNulls: Optional[Union[bool, Column]] = None) -> Column:
    """Returns the last value of `col` for a group of rows. It will return the last non-null
    value it sees when `ignoreNulls` is set to true. If all values are null, then null is returned.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    ignorenulls : :class:`~pyspark.sql.Column` or bool
        if first value is null then look for first non-null value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        some value of `col` for a group of rows.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("a", 1), ("a", 2), ("a", 3), ("b", 8), (None, 2)], ["a", "b"]
    ... ).select(sf.last_value('a'), sf.last_value('b')).show()
    +-------------+-------------+
    |last_value(a)|last_value(b)|
    +-------------+-------------+
    |         NULL|            2|
    +-------------+-------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("a", 1), ("a", 2), ("a", 3), ("b", 8), (None, 2)], ["a", "b"]
    ... ).select(sf.last_value('a', True), sf.last_value('b', True)).show()
    +-------------+-------------+
    |last_value(a)|last_value(b)|
    +-------------+-------------+
    |            b|            2|
    +-------------+-------------+
    """
    if ignoreNulls is None:
        return _invoke_function_over_columns("last_value", col)
    else:
        ignoreNulls = lit(ignoreNulls) if isinstance(ignoreNulls, bool) else ignoreNulls
        return _invoke_function_over_columns("last_value", col, ignoreNulls)


@try_remote_functions
def count_if(col: "ColumnOrName") -> Column:
    """Returns the number of `TRUE` values for the `col`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the number of `TRUE` values for the `col`.

    Examples
    --------
    >>> df = spark.createDataFrame([("a", 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.select(count_if(col('c2') % 2 == 0)).show()
    +------------------------+
    |count_if(((c2 % 2) = 0))|
    +------------------------+
    |                       3|
    +------------------------+
    """
    return _invoke_function_over_columns("count_if", col)


@try_remote_functions
def histogram_numeric(col: "ColumnOrName", nBins: "ColumnOrName") -> Column:
    """Computes a histogram on numeric 'col' using nb bins.
    The return value is an array of (x,y) pairs representing the centers of the
    histogram's bins. As the value of 'nb' is increased, the histogram approximation
    gets finer-grained, but may yield artifacts around outliers. In practice, 20-40
    histogram bins appear to work well, with more bins being required for skewed or
    smaller datasets. Note that this function creates a histogram with non-uniform
    bin widths. It offers no guarantees in terms of the mean-squared-error of the
    histogram, but in practice is comparable to the histograms produced by the R/S-Plus
    statistical computing packages. Note: the output type of the 'x' field in the return value is
    propagated from the input value consumed in the aggregate function.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    nBins : :class:`~pyspark.sql.Column` or str
        number of Histogram columns.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a histogram on numeric 'col' using nb bins.

    Examples
    --------
    >>> df = spark.createDataFrame([("a", 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.select(histogram_numeric('c2', lit(5))).show()
    +------------------------+
    |histogram_numeric(c2, 5)|
    +------------------------+
    |    [{1, 1.0}, {2, 1....|
    +------------------------+
    """
    return _invoke_function_over_columns("histogram_numeric", col, nBins)


@try_remote_functions
def ntile(n: int) -> Column:
    """
    Window function: returns the ntile group id (from 1 to `n` inclusive)
    in an ordered window partition. For example, if `n` is 4, the first
    quarter of the rows will get value 1, the second quarter will get 2,
    the third quarter will get 3, and the last quarter will get 4.

    This is equivalent to the NTILE function in SQL.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    n : int
        an integer

    Returns
    -------
    :class:`~pyspark.sql.Column`
        portioned group id.

    Examples
    --------
    >>> from pyspark.sql import Window
    >>> df = spark.createDataFrame([("a", 1),
    ...                             ("a", 2),
    ...                             ("a", 3),
    ...                             ("b", 8),
    ...                             ("b", 2)], ["c1", "c2"])
    >>> df.show()
    +---+---+
    | c1| c2|
    +---+---+
    |  a|  1|
    |  a|  2|
    |  a|  3|
    |  b|  8|
    |  b|  2|
    +---+---+
    >>> w = Window.partitionBy("c1").orderBy("c2")
    >>> df.withColumn("ntile", ntile(2).over(w)).show()
    +---+---+-----+
    | c1| c2|ntile|
    +---+---+-----+
    |  a|  1|    1|
    |  a|  2|    1|
    |  a|  3|    2|
    |  b|  2|    1|
    |  b|  8|    2|
    +---+---+-----+
    """
    return _invoke_function("ntile", int(n))


# ---------------------- Date/Timestamp functions ------------------------------


@try_remote_functions
def curdate() -> Column:
    """
    Returns the current date at the start of query evaluation as a :class:`DateType` column.
    All calls of current_date within the same query return the same value.

    .. versionadded:: 3.5.0

    Returns
    -------
    :class:`~pyspark.sql.Column`
        current date.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.curdate()).show() # doctest: +SKIP
    +--------------+
    |current_date()|
    +--------------+
    |    2022-08-26|
    +--------------+
    """
    return _invoke_function("curdate")


@try_remote_functions
def current_date() -> Column:
    """
    Returns the current date at the start of query evaluation as a :class:`DateType` column.
    All calls of current_date within the same query return the same value.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        current date.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(current_date()).show() # doctest: +SKIP
    +--------------+
    |current_date()|
    +--------------+
    |    2022-08-26|
    +--------------+
    """
    return _invoke_function("current_date")


@try_remote_functions
def current_timezone() -> Column:
    """
    Returns the current session local timezone.

    .. versionadded:: 3.5.0

    Returns
    -------
    :class:`~pyspark.sql.Column`
        current session local timezone.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> spark.range(1).select(current_timezone()).show()
    +-------------------+
    | current_timezone()|
    +-------------------+
    |America/Los_Angeles|
    +-------------------+
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function("current_timezone")


@try_remote_functions
def current_timestamp() -> Column:
    """
    Returns the current timestamp at the start of query evaluation as a :class:`TimestampType`
    column. All calls of current_timestamp within the same query return the same value.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        current date and time.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(current_timestamp()).show(truncate=False) # doctest: +SKIP
    +-----------------------+
    |current_timestamp()    |
    +-----------------------+
    |2022-08-26 21:23:22.716|
    +-----------------------+
    """
    return _invoke_function("current_timestamp")


@try_remote_functions
def now() -> Column:
    """
    Returns the current timestamp at the start of query evaluation.

    .. versionadded:: 3.5.0

    Returns
    -------
    :class:`~pyspark.sql.Column`
        current timestamp at the start of query evaluation.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(now()).show(truncate=False) # doctest: +SKIP
    +-----------------------+
    |now()    |
    +-----------------------+
    |2022-08-26 21:23:22.716|
    +-----------------------+
    """
    return _invoke_function("current_timestamp")


@try_remote_functions
def localtimestamp() -> Column:
    """
    Returns the current timestamp without time zone at the start of query evaluation
    as a timestamp without time zone column. All calls of localtimestamp within the
    same query return the same value.

    .. versionadded:: 3.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        current local date and time.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(localtimestamp()).show(truncate=False) # doctest: +SKIP
    +-----------------------+
    |localtimestamp()       |
    +-----------------------+
    |2022-08-26 21:28:34.639|
    +-----------------------+
    """
    return _invoke_function("localtimestamp")


@try_remote_functions
def date_format(date: "ColumnOrName", format: str) -> Column:
    """
    Converts a date/timestamp/string to a value of string in the format specified by the date
    format given by the second argument.

    A pattern could be for instance `dd.MM.yyyy` and could return a string like '18.03.1993'. All
    pattern letters of `datetime pattern`_. can be used.

    .. _datetime pattern: https://spark.apache.org/docs/latest/sql-ref-datetime-pattern.html

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    Whenever possible, use specialized functions like `year`.

    Parameters
    ----------
    date : :class:`~pyspark.sql.Column` or str
        input column of values to format.
    format: str
        format to use to represent datetime values.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string value representing formatted datetime.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(date_format('dt', 'MM/dd/yyy').alias('date')).collect()
    [Row(date='04/08/2015')]
    """
    return _invoke_function("date_format", _to_java_column(date), format)


@try_remote_functions
def year(col: "ColumnOrName") -> Column:
    """
    Extract the year of a given date/timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        year part of the date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(year('dt').alias('year')).collect()
    [Row(year=2015)]
    """
    return _invoke_function_over_columns("year", col)


@try_remote_functions
def quarter(col: "ColumnOrName") -> Column:
    """
    Extract the quarter of a given date/timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        quarter of the date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(quarter('dt').alias('quarter')).collect()
    [Row(quarter=2)]
    """
    return _invoke_function_over_columns("quarter", col)


@try_remote_functions
def month(col: "ColumnOrName") -> Column:
    """
    Extract the month of a given date/timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        month part of the date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(month('dt').alias('month')).collect()
    [Row(month=4)]
    """
    return _invoke_function_over_columns("month", col)


@try_remote_functions
def dayofweek(col: "ColumnOrName") -> Column:
    """
    Extract the day of the week of a given date/timestamp as integer.
    Ranges from 1 for a Sunday through to 7 for a Saturday

    .. versionadded:: 2.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        day of the week for given date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(dayofweek('dt').alias('day')).collect()
    [Row(day=4)]
    """
    return _invoke_function_over_columns("dayofweek", col)


@try_remote_functions
def dayofmonth(col: "ColumnOrName") -> Column:
    """
    Extract the day of the month of a given date/timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        day of the month for given date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(dayofmonth('dt').alias('day')).collect()
    [Row(day=8)]
    """
    return _invoke_function_over_columns("dayofmonth", col)


@try_remote_functions
def day(col: "ColumnOrName") -> Column:
    """
    Extract the day of the month of a given date/timestamp as integer.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        day of the month for given date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(day('dt').alias('day')).collect()
    [Row(day=8)]
    """
    return _invoke_function_over_columns("day", col)


@try_remote_functions
def dayofyear(col: "ColumnOrName") -> Column:
    """
    Extract the day of the year of a given date/timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        day of the year for given date/timestamp as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(dayofyear('dt').alias('day')).collect()
    [Row(day=98)]
    """
    return _invoke_function_over_columns("dayofyear", col)


@try_remote_functions
def hour(col: "ColumnOrName") -> Column:
    """
    Extract the hours of a given timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hour part of the timestamp as integer.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame([(datetime.datetime(2015, 4, 8, 13, 8, 15),)], ['ts'])
    >>> df.select(hour('ts').alias('hour')).collect()
    [Row(hour=13)]
    """
    return _invoke_function_over_columns("hour", col)


@try_remote_functions
def minute(col: "ColumnOrName") -> Column:
    """
    Extract the minutes of a given timestamp as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        minutes part of the timestamp as integer.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame([(datetime.datetime(2015, 4, 8, 13, 8, 15),)], ['ts'])
    >>> df.select(minute('ts').alias('minute')).collect()
    [Row(minute=8)]
    """
    return _invoke_function_over_columns("minute", col)


@try_remote_functions
def second(col: "ColumnOrName") -> Column:
    """
    Extract the seconds of a given date as integer.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        `seconds` part of the timestamp as integer.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame([(datetime.datetime(2015, 4, 8, 13, 8, 15),)], ['ts'])
    >>> df.select(second('ts').alias('second')).collect()
    [Row(second=15)]
    """
    return _invoke_function_over_columns("second", col)


@try_remote_functions
def weekofyear(col: "ColumnOrName") -> Column:
    """
    Extract the week number of a given date as integer.
    A week is considered to start on a Monday and week 1 is the first week with more than 3 days,
    as defined by ISO 8601

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        `week` of the year for given date as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(weekofyear(df.dt).alias('week')).collect()
    [Row(week=15)]
    """
    return _invoke_function_over_columns("weekofyear", col)


@try_remote_functions
def weekday(col: "ColumnOrName") -> Column:
    """
    Returns the day of the week for date/timestamp (0 = Monday, 1 = Tuesday, ..., 6 = Sunday).

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date/timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the day of the week for date/timestamp (0 = Monday, 1 = Tuesday, ..., 6 = Sunday).

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(weekday('dt').alias('day')).show()
    +---+
    |day|
    +---+
    |  2|
    +---+
    """
    return _invoke_function_over_columns("weekday", col)


@try_remote_functions
def extract(field: "ColumnOrName", source: "ColumnOrName") -> Column:
    """
    Extracts a part of the date/timestamp or interval source.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    field : :class:`~pyspark.sql.Column` or str
        selects which part of the source should be extracted.
    source : :class:`~pyspark.sql.Column` or str
        a date/timestamp or interval column from where `field` should be extracted.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a part of the date/timestamp or interval source.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame([(datetime.datetime(2015, 4, 8, 13, 8, 15),)], ['ts'])
    >>> df.select(
    ...     extract(lit('YEAR'), 'ts').alias('year'),
    ...     extract(lit('month'), 'ts').alias('month'),
    ...     extract(lit('WEEK'), 'ts').alias('week'),
    ...     extract(lit('D'), 'ts').alias('day'),
    ...     extract(lit('M'), 'ts').alias('minute'),
    ...     extract(lit('S'), 'ts').alias('second')
    ... ).collect()
    [Row(year=2015, month=4, week=15, day=8, minute=8, second=Decimal('15.000000'))]
    """
    return _invoke_function_over_columns("extract", field, source)


@try_remote_functions
def date_part(field: "ColumnOrName", source: "ColumnOrName") -> Column:
    """
    Extracts a part of the date/timestamp or interval source.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    field : :class:`~pyspark.sql.Column` or str
        selects which part of the source should be extracted, and supported string values
        are as same as the fields of the equivalent function `extract`.
    source : :class:`~pyspark.sql.Column` or str
        a date/timestamp or interval column from where `field` should be extracted.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a part of the date/timestamp or interval source.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame([(datetime.datetime(2015, 4, 8, 13, 8, 15),)], ['ts'])
    >>> df.select(
    ...     date_part(lit('YEAR'), 'ts').alias('year'),
    ...     date_part(lit('month'), 'ts').alias('month'),
    ...     date_part(lit('WEEK'), 'ts').alias('week'),
    ...     date_part(lit('D'), 'ts').alias('day'),
    ...     date_part(lit('M'), 'ts').alias('minute'),
    ...     date_part(lit('S'), 'ts').alias('second')
    ... ).collect()
    [Row(year=2015, month=4, week=15, day=8, minute=8, second=Decimal('15.000000'))]
    """
    return _invoke_function_over_columns("date_part", field, source)


@try_remote_functions
def datepart(field: "ColumnOrName", source: "ColumnOrName") -> Column:
    """
    Extracts a part of the date/timestamp or interval source.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    field : :class:`~pyspark.sql.Column` or str
        selects which part of the source should be extracted, and supported string values
        are as same as the fields of the equivalent function `extract`.
    source : :class:`~pyspark.sql.Column` or str
        a date/timestamp or interval column from where `field` should be extracted.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a part of the date/timestamp or interval source.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame([(datetime.datetime(2015, 4, 8, 13, 8, 15),)], ['ts'])
    >>> df.select(
    ...     datepart(lit('YEAR'), 'ts').alias('year'),
    ...     datepart(lit('month'), 'ts').alias('month'),
    ...     datepart(lit('WEEK'), 'ts').alias('week'),
    ...     datepart(lit('D'), 'ts').alias('day'),
    ...     datepart(lit('M'), 'ts').alias('minute'),
    ...     datepart(lit('S'), 'ts').alias('second')
    ... ).collect()
    [Row(year=2015, month=4, week=15, day=8, minute=8, second=Decimal('15.000000'))]
    """
    return _invoke_function_over_columns("datepart", field, source)


@try_remote_functions
def make_date(year: "ColumnOrName", month: "ColumnOrName", day: "ColumnOrName") -> Column:
    """
    Returns a column with a date built from the year, month and day columns.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    year : :class:`~pyspark.sql.Column` or str
        The year to build the date
    month : :class:`~pyspark.sql.Column` or str
        The month to build the date
    day : :class:`~pyspark.sql.Column` or str
        The day to build the date

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a date built from given parts.

    Examples
    --------
    >>> df = spark.createDataFrame([(2020, 6, 26)], ['Y', 'M', 'D'])
    >>> df.select(make_date(df.Y, df.M, df.D).alias("datefield")).collect()
    [Row(datefield=datetime.date(2020, 6, 26))]
    """
    return _invoke_function_over_columns("make_date", year, month, day)


@try_remote_functions
def date_add(start: "ColumnOrName", days: Union["ColumnOrName", int]) -> Column:
    """
    Returns the date that is `days` days after `start`. If `days` is a negative value
    then these amount of days will be deducted from `start`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    start : :class:`~pyspark.sql.Column` or str
        date column to work on.
    days : :class:`~pyspark.sql.Column` or str or int
        how many days after the given date to calculate.
        Accepts negative value as well to calculate backwards in time.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a date after/before given number of days.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08', 2,)], ['dt', 'add'])
    >>> df.select(date_add(df.dt, 1).alias('next_date')).collect()
    [Row(next_date=datetime.date(2015, 4, 9))]
    >>> df.select(date_add(df.dt, df.add.cast('integer')).alias('next_date')).collect()
    [Row(next_date=datetime.date(2015, 4, 10))]
    >>> df.select(date_add('dt', -1).alias('prev_date')).collect()
    [Row(prev_date=datetime.date(2015, 4, 7))]
    """
    days = lit(days) if isinstance(days, int) else days
    return _invoke_function_over_columns("date_add", start, days)


@try_remote_functions
def dateadd(start: "ColumnOrName", days: Union["ColumnOrName", int]) -> Column:
    """
    Returns the date that is `days` days after `start`. If `days` is a negative value
    then these amount of days will be deducted from `start`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    start : :class:`~pyspark.sql.Column` or str
        date column to work on.
    days : :class:`~pyspark.sql.Column` or str or int
        how many days after the given date to calculate.
        Accepts negative value as well to calculate backwards in time.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a date after/before given number of days.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [('2015-04-08', 2,)], ['dt', 'add']
    ... ).select(sf.dateadd("dt", 1)).show()
    +---------------+
    |date_add(dt, 1)|
    +---------------+
    |     2015-04-09|
    +---------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [('2015-04-08', 2,)], ['dt', 'add']
    ... ).select(sf.dateadd("dt", sf.lit(2))).show()
    +---------------+
    |date_add(dt, 2)|
    +---------------+
    |     2015-04-10|
    +---------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [('2015-04-08', 2,)], ['dt', 'add']
    ... ).select(sf.dateadd("dt", -1)).show()
    +----------------+
    |date_add(dt, -1)|
    +----------------+
    |      2015-04-07|
    +----------------+
    """
    days = lit(days) if isinstance(days, int) else days
    return _invoke_function_over_columns("dateadd", start, days)


@try_remote_functions
def date_sub(start: "ColumnOrName", days: Union["ColumnOrName", int]) -> Column:
    """
    Returns the date that is `days` days before `start`. If `days` is a negative value
    then these amount of days will be added to `start`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    start : :class:`~pyspark.sql.Column` or str
        date column to work on.
    days : :class:`~pyspark.sql.Column` or str or int
        how many days before the given date to calculate.
        Accepts negative value as well to calculate forward in time.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a date before/after given number of days.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08', 2,)], ['dt', 'sub'])
    >>> df.select(date_sub(df.dt, 1).alias('prev_date')).collect()
    [Row(prev_date=datetime.date(2015, 4, 7))]
    >>> df.select(date_sub(df.dt, df.sub.cast('integer')).alias('prev_date')).collect()
    [Row(prev_date=datetime.date(2015, 4, 6))]
    >>> df.select(date_sub('dt', -1).alias('next_date')).collect()
    [Row(next_date=datetime.date(2015, 4, 9))]
    """
    days = lit(days) if isinstance(days, int) else days
    return _invoke_function_over_columns("date_sub", start, days)


@try_remote_functions
def datediff(end: "ColumnOrName", start: "ColumnOrName") -> Column:
    """
    Returns the number of days from `start` to `end`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    end : :class:`~pyspark.sql.Column` or str
        to date column to work on.
    start : :class:`~pyspark.sql.Column` or str
        from date column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        difference in days between two dates.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08','2015-05-10')], ['d1', 'd2'])
    >>> df.select(datediff(df.d2, df.d1).alias('diff')).collect()
    [Row(diff=32)]
    """
    return _invoke_function_over_columns("datediff", end, start)


@try_remote_functions
def date_diff(end: "ColumnOrName", start: "ColumnOrName") -> Column:
    """
    Returns the number of days from `start` to `end`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    end : :class:`~pyspark.sql.Column` or str
        to date column to work on.
    start : :class:`~pyspark.sql.Column` or str
        from date column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        difference in days between two dates.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08','2015-05-10')], ['d1', 'd2'])
    >>> df.select(date_diff(df.d2, df.d1).alias('diff')).collect()
    [Row(diff=32)]
    """
    return _invoke_function_over_columns("date_diff", end, start)


@try_remote_functions
def date_from_unix_date(days: "ColumnOrName") -> Column:
    """
    Create date from the number of `days` since 1970-01-01.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    days : :class:`~pyspark.sql.Column` or str
        the target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the date from the number of days since 1970-01-01.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(date_from_unix_date(lit(1))).show()
    +----------------------+
    |date_from_unix_date(1)|
    +----------------------+
    |            1970-01-02|
    +----------------------+
    """
    return _invoke_function_over_columns("date_from_unix_date", days)


@try_remote_functions
def add_months(start: "ColumnOrName", months: Union["ColumnOrName", int]) -> Column:
    """
    Returns the date that is `months` months after `start`. If `months` is a negative value
    then these amount of months will be deducted from the `start`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    start : :class:`~pyspark.sql.Column` or str
        date column to work on.
    months : :class:`~pyspark.sql.Column` or str or int
        how many months after the given date to calculate.
        Accepts negative value as well to calculate backwards.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a date after/before given number of months.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08', 2)], ['dt', 'add'])
    >>> df.select(add_months(df.dt, 1).alias('next_month')).collect()
    [Row(next_month=datetime.date(2015, 5, 8))]
    >>> df.select(add_months(df.dt, df.add.cast('integer')).alias('next_month')).collect()
    [Row(next_month=datetime.date(2015, 6, 8))]
    >>> df.select(add_months('dt', -2).alias('prev_month')).collect()
    [Row(prev_month=datetime.date(2015, 2, 8))]
    """
    months = lit(months) if isinstance(months, int) else months
    return _invoke_function_over_columns("add_months", start, months)


@try_remote_functions
def months_between(date1: "ColumnOrName", date2: "ColumnOrName", roundOff: bool = True) -> Column:
    """
    Returns number of months between dates date1 and date2.
    If date1 is later than date2, then the result is positive.
    A whole number is returned if both inputs have the same day of month or both are the last day
    of their respective months. Otherwise, the difference is calculated assuming 31 days per month.
    The result is rounded off to 8 digits unless `roundOff` is set to `False`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    date1 : :class:`~pyspark.sql.Column` or str
        first date column.
    date2 : :class:`~pyspark.sql.Column` or str
        second date column.
    roundOff : bool, optional
        whether to round (to 8 digits) the final value or not (default: True).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        number of months between two dates.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 10:30:00', '1996-10-30')], ['date1', 'date2'])
    >>> df.select(months_between(df.date1, df.date2).alias('months')).collect()
    [Row(months=3.94959677)]
    >>> df.select(months_between(df.date1, df.date2, False).alias('months')).collect()
    [Row(months=3.9495967741935485)]
    """
    return _invoke_function(
        "months_between", _to_java_column(date1), _to_java_column(date2), roundOff
    )


@try_remote_functions
def to_date(col: "ColumnOrName", format: Optional[str] = None) -> Column:
    """Converts a :class:`~pyspark.sql.Column` into :class:`pyspark.sql.types.DateType`
    using the optionally specified format. Specify formats according to `datetime pattern`_.
    By default, it follows casting rules to :class:`pyspark.sql.types.DateType` if the format
    is omitted. Equivalent to ``col.cast("date")``.

    .. _datetime pattern: https://spark.apache.org/docs/latest/sql-ref-datetime-pattern.html

    .. versionadded:: 2.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column of values to convert.
    format: str, optional
        format to use to convert date values.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        date value as :class:`pyspark.sql.types.DateType` type.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 10:30:00',)], ['t'])
    >>> df.select(to_date(df.t).alias('date')).collect()
    [Row(date=datetime.date(1997, 2, 28))]

    >>> df = spark.createDataFrame([('1997-02-28 10:30:00',)], ['t'])
    >>> df.select(to_date(df.t, 'yyyy-MM-dd HH:mm:ss').alias('date')).collect()
    [Row(date=datetime.date(1997, 2, 28))]
    """
    if format is None:
        return _invoke_function_over_columns("to_date", col)
    else:
        return _invoke_function("to_date", _to_java_column(col), format)


@try_remote_functions
def unix_date(col: "ColumnOrName") -> Column:
    """Returns the number of days since 1970-01-01.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([('1970-01-02',)], ['t'])
    >>> df.select(unix_date(to_date(df.t)).alias('n')).collect()
    [Row(n=1)]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns("unix_date", col)


@try_remote_functions
def unix_micros(col: "ColumnOrName") -> Column:
    """Returns the number of microseconds since 1970-01-01 00:00:00 UTC.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([('2015-07-22 10:00:00',)], ['t'])
    >>> df.select(unix_micros(to_timestamp(df.t)).alias('n')).collect()
    [Row(n=1437584400000000)]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns("unix_micros", col)


@try_remote_functions
def unix_millis(col: "ColumnOrName") -> Column:
    """Returns the number of milliseconds since 1970-01-01 00:00:00 UTC.
    Truncates higher levels of precision.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([('2015-07-22 10:00:00',)], ['t'])
    >>> df.select(unix_millis(to_timestamp(df.t)).alias('n')).collect()
    [Row(n=1437584400000)]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns("unix_millis", col)


@try_remote_functions
def unix_seconds(col: "ColumnOrName") -> Column:
    """Returns the number of seconds since 1970-01-01 00:00:00 UTC.
    Truncates higher levels of precision.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([('2015-07-22 10:00:00',)], ['t'])
    >>> df.select(unix_seconds(to_timestamp(df.t)).alias('n')).collect()
    [Row(n=1437584400)]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns("unix_seconds", col)


@overload
def to_timestamp(col: "ColumnOrName") -> Column:
    ...


@overload
def to_timestamp(col: "ColumnOrName", format: str) -> Column:
    ...


@try_remote_functions
def to_timestamp(col: "ColumnOrName", format: Optional[str] = None) -> Column:
    """Converts a :class:`~pyspark.sql.Column` into :class:`pyspark.sql.types.TimestampType`
    using the optionally specified format. Specify formats according to `datetime pattern`_.
    By default, it follows casting rules to :class:`pyspark.sql.types.TimestampType` if the format
    is omitted. Equivalent to ``col.cast("timestamp")``.

    .. _datetime pattern: https://spark.apache.org/docs/latest/sql-ref-datetime-pattern.html

    .. versionadded:: 2.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column values to convert.
    format: str, optional
        format to use to convert timestamp values.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        timestamp value as :class:`pyspark.sql.types.TimestampType` type.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 10:30:00',)], ['t'])
    >>> df.select(to_timestamp(df.t).alias('dt')).collect()
    [Row(dt=datetime.datetime(1997, 2, 28, 10, 30))]

    >>> df = spark.createDataFrame([('1997-02-28 10:30:00',)], ['t'])
    >>> df.select(to_timestamp(df.t, 'yyyy-MM-dd HH:mm:ss').alias('dt')).collect()
    [Row(dt=datetime.datetime(1997, 2, 28, 10, 30))]
    """
    if format is None:
        return _invoke_function_over_columns("to_timestamp", col)
    else:
        return _invoke_function("to_timestamp", _to_java_column(col), format)


@try_remote_functions
def try_to_timestamp(col: "ColumnOrName", format: Optional["ColumnOrName"] = None) -> Column:
    """
    Parses the `col` with the `format` to a timestamp. The function always
    returns null on an invalid input with/without ANSI SQL mode enabled. The result data type is
    consistent with the value of configuration `spark.sql.timestampType`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column values to convert.
    format: str, optional
        format to use to convert timestamp values.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 10:30:00',)], ['t'])
    >>> df.select(try_to_timestamp(df.t).alias('dt')).collect()
    [Row(dt=datetime.datetime(1997, 2, 28, 10, 30))]

    >>> df.select(try_to_timestamp(df.t, lit('yyyy-MM-dd HH:mm:ss')).alias('dt')).collect()
    [Row(dt=datetime.datetime(1997, 2, 28, 10, 30))]
    """
    if format is not None:
        return _invoke_function_over_columns("try_to_timestamp", col, format)
    else:
        return _invoke_function_over_columns("try_to_timestamp", col)


@try_remote_functions
def xpath(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns a string array of values within the nodes of xml that match the XPath expression.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [('<a><b>b1</b><b>b2</b><b>b3</b><c>c1</c><c>c2</c></a>',)], ['x'])
    >>> df.select(xpath(df.x, lit('a/b/text()')).alias('r')).collect()
    [Row(r=['b1', 'b2', 'b3'])]
    """
    return _invoke_function_over_columns("xpath", xml, path)


@try_remote_functions
def xpath_boolean(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns true if the XPath expression evaluates to true, or if a matching node is found.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>1</b></a>',)], ['x'])
    >>> df.select(xpath_boolean(df.x, lit('a/b')).alias('r')).collect()
    [Row(r=True)]
    """
    return _invoke_function_over_columns("xpath_boolean", xml, path)


@try_remote_functions
def xpath_double(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns a double value, the value zero if no match is found,
    or NaN if a match is found but the value is non-numeric.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>1</b><b>2</b></a>',)], ['x'])
    >>> df.select(xpath_double(df.x, lit('sum(a/b)')).alias('r')).collect()
    [Row(r=3.0)]
    """
    return _invoke_function_over_columns("xpath_double", xml, path)


@try_remote_functions
def xpath_number(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns a double value, the value zero if no match is found,
    or NaN if a match is found but the value is non-numeric.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [('<a><b>1</b><b>2</b></a>',)], ['x']
    ... ).select(sf.xpath_number('x', sf.lit('sum(a/b)'))).show()
    +-------------------------+
    |xpath_number(x, sum(a/b))|
    +-------------------------+
    |                      3.0|
    +-------------------------+
    """
    return _invoke_function_over_columns("xpath_number", xml, path)


@try_remote_functions
def xpath_float(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns a float value, the value zero if no match is found,
    or NaN if a match is found but the value is non-numeric.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>1</b><b>2</b></a>',)], ['x'])
    >>> df.select(xpath_float(df.x, lit('sum(a/b)')).alias('r')).collect()
    [Row(r=3.0)]
    """
    return _invoke_function_over_columns("xpath_float", xml, path)


@try_remote_functions
def xpath_int(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns an integer value, or the value zero if no match is found,
    or a match is found but the value is non-numeric.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>1</b><b>2</b></a>',)], ['x'])
    >>> df.select(xpath_int(df.x, lit('sum(a/b)')).alias('r')).collect()
    [Row(r=3)]
    """
    return _invoke_function_over_columns("xpath_int", xml, path)


@try_remote_functions
def xpath_long(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns a long integer value, or the value zero if no match is found,
    or a match is found but the value is non-numeric.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>1</b><b>2</b></a>',)], ['x'])
    >>> df.select(xpath_long(df.x, lit('sum(a/b)')).alias('r')).collect()
    [Row(r=3)]
    """
    return _invoke_function_over_columns("xpath_long", xml, path)


@try_remote_functions
def xpath_short(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns a short integer value, or the value zero if no match is found,
    or a match is found but the value is non-numeric.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>1</b><b>2</b></a>',)], ['x'])
    >>> df.select(xpath_short(df.x, lit('sum(a/b)')).alias('r')).collect()
    [Row(r=3)]
    """
    return _invoke_function_over_columns("xpath_short", xml, path)


@try_remote_functions
def xpath_string(xml: "ColumnOrName", path: "ColumnOrName") -> Column:
    """
    Returns the text contents of the first xml node that matches the XPath expression.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.createDataFrame([('<a><b>b</b><c>cc</c></a>',)], ['x'])
    >>> df.select(xpath_string(df.x, lit('a/c')).alias('r')).collect()
    [Row(r='cc')]
    """
    return _invoke_function_over_columns("xpath_string", xml, path)


@try_remote_functions
def trunc(date: "ColumnOrName", format: str) -> Column:
    """
    Returns date truncated to the unit specified by the format.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    date : :class:`~pyspark.sql.Column` or str
        input column of values to truncate.
    format : str
        'year', 'yyyy', 'yy' to truncate by year,
        or 'month', 'mon', 'mm' to truncate by month
        Other options are: 'week', 'quarter'

    Returns
    -------
    :class:`~pyspark.sql.Column`
        truncated date.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28',)], ['d'])
    >>> df.select(trunc(df.d, 'year').alias('year')).collect()
    [Row(year=datetime.date(1997, 1, 1))]
    >>> df.select(trunc(df.d, 'mon').alias('month')).collect()
    [Row(month=datetime.date(1997, 2, 1))]
    """
    return _invoke_function("trunc", _to_java_column(date), format)


@try_remote_functions
def date_trunc(format: str, timestamp: "ColumnOrName") -> Column:
    """
    Returns timestamp truncated to the unit specified by the format.

    .. versionadded:: 2.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    format : str
        'year', 'yyyy', 'yy' to truncate by year,
        'month', 'mon', 'mm' to truncate by month,
        'day', 'dd' to truncate by day,
        Other options are:
        'microsecond', 'millisecond', 'second', 'minute', 'hour', 'week', 'quarter'
    timestamp : :class:`~pyspark.sql.Column` or str
        input column of values to truncate.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        truncated timestamp.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 05:02:11',)], ['t'])
    >>> df.select(date_trunc('year', df.t).alias('year')).collect()
    [Row(year=datetime.datetime(1997, 1, 1, 0, 0))]
    >>> df.select(date_trunc('mon', df.t).alias('month')).collect()
    [Row(month=datetime.datetime(1997, 2, 1, 0, 0))]
    """
    return _invoke_function("date_trunc", format, _to_java_column(timestamp))


@try_remote_functions
def next_day(date: "ColumnOrName", dayOfWeek: str) -> Column:
    """
    Returns the first date which is later than the value of the date column
    based on second `week day` argument.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    date : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    dayOfWeek : str
        day of the week, case-insensitive, accepts:
            "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column of computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-07-27',)], ['d'])
    >>> df.select(next_day(df.d, 'Sun').alias('date')).collect()
    [Row(date=datetime.date(2015, 8, 2))]
    """
    return _invoke_function("next_day", _to_java_column(date), dayOfWeek)


@try_remote_functions
def last_day(date: "ColumnOrName") -> Column:
    """
    Returns the last day of the month which the given date belongs to.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    date : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        last day of the month.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-10',)], ['d'])
    >>> df.select(last_day(df.d).alias('date')).collect()
    [Row(date=datetime.date(1997, 2, 28))]
    """
    return _invoke_function("last_day", _to_java_column(date))


@try_remote_functions
def from_unixtime(timestamp: "ColumnOrName", format: str = "yyyy-MM-dd HH:mm:ss") -> Column:
    """
    Converts the number of seconds from unix epoch (1970-01-01 00:00:00 UTC) to a string
    representing the timestamp of that moment in the current system time zone in the given
    format.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str
        column of unix time values.
    format : str, optional
        format to use to convert to (default: yyyy-MM-dd HH:mm:ss)

    Returns
    -------
    :class:`~pyspark.sql.Column`
        formatted timestamp as string.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> time_df = spark.createDataFrame([(1428476400,)], ['unix_time'])
    >>> time_df.select(from_unixtime('unix_time').alias('ts')).collect()
    [Row(ts='2015-04-08 00:00:00')]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function("from_unixtime", _to_java_column(timestamp), format)


@overload
def unix_timestamp(timestamp: "ColumnOrName", format: str = ...) -> Column:
    ...


@overload
def unix_timestamp() -> Column:
    ...


@try_remote_functions
def unix_timestamp(
    timestamp: Optional["ColumnOrName"] = None, format: str = "yyyy-MM-dd HH:mm:ss"
) -> Column:
    """
    Convert time string with given pattern ('yyyy-MM-dd HH:mm:ss', by default)
    to Unix time stamp (in seconds), using the default timezone and the default
    locale, returns null if failed.

    if `timestamp` is None, then it returns current timestamp.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str, optional
        timestamps of string values.
    format : str, optional
        alternative format to use for converting (default: yyyy-MM-dd HH:mm:ss).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        unix time as long integer.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> time_df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> time_df.select(unix_timestamp('dt', 'yyyy-MM-dd').alias('unix_time')).collect()
    [Row(unix_time=1428476400)]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    if timestamp is None:
        return _invoke_function("unix_timestamp")
    return _invoke_function("unix_timestamp", _to_java_column(timestamp), format)


@try_remote_functions
def from_utc_timestamp(timestamp: "ColumnOrName", tz: "ColumnOrName") -> Column:
    """
    This is a common function for databases supporting TIMESTAMP WITHOUT TIMEZONE. This function
    takes a timestamp which is timezone-agnostic, and interprets it as a timestamp in UTC, and
    renders that timestamp as a timestamp in the given time zone.

    However, timestamp in Spark represents number of microseconds from the Unix epoch, which is not
    timezone-agnostic. So in Spark this function just shift the timestamp value from UTC timezone to
    the given timezone.

    This function may return confusing result if the input is a string with timezone, e.g.
    '2018-03-13T06:18:23+00:00'. The reason is that, Spark firstly cast the string to timestamp
    according to the timezone in the string, and finally display the result by converting the
    timestamp to string according to the session local timezone.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str
        the column that contains timestamps
    tz : :class:`~pyspark.sql.Column` or str
        A string detailing the time zone ID that the input should be adjusted to. It should
        be in the format of either region-based zone IDs or zone offsets. Region IDs must
        have the form 'area/city', such as 'America/Los_Angeles'. Zone offsets must be in
        the format '(+|-)HH:mm', for example '-08:00' or '+01:00'. Also 'UTC' and 'Z' are
        supported as aliases of '+00:00'. Other short names are not recommended to use
        because they can be ambiguous.

        .. versionchanged:: 2.4
           `tz` can take a :class:`~pyspark.sql.Column` containing timezone ID strings.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        timestamp value represented in given timezone.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 10:30:00', 'JST')], ['ts', 'tz'])
    >>> df.select(from_utc_timestamp(df.ts, "PST").alias('local_time')).collect()
    [Row(local_time=datetime.datetime(1997, 2, 28, 2, 30))]
    >>> df.select(from_utc_timestamp(df.ts, df.tz).alias('local_time')).collect()
    [Row(local_time=datetime.datetime(1997, 2, 28, 19, 30))]
    """
    if isinstance(tz, Column):
        tz = _to_java_column(tz)
    return _invoke_function("from_utc_timestamp", _to_java_column(timestamp), tz)


@try_remote_functions
def to_utc_timestamp(timestamp: "ColumnOrName", tz: "ColumnOrName") -> Column:
    """
    This is a common function for databases supporting TIMESTAMP WITHOUT TIMEZONE. This function
    takes a timestamp which is timezone-agnostic, and interprets it as a timestamp in the given
    timezone, and renders that timestamp as a timestamp in UTC.

    However, timestamp in Spark represents number of microseconds from the Unix epoch, which is not
    timezone-agnostic. So in Spark this function just shift the timestamp value from the given
    timezone to UTC timezone.

    This function may return confusing result if the input is a string with timezone, e.g.
    '2018-03-13T06:18:23+00:00'. The reason is that, Spark firstly cast the string to timestamp
    according to the timezone in the string, and finally display the result by converting the
    timestamp to string according to the session local timezone.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str
        the column that contains timestamps
    tz : :class:`~pyspark.sql.Column` or str
        A string detailing the time zone ID that the input should be adjusted to. It should
        be in the format of either region-based zone IDs or zone offsets. Region IDs must
        have the form 'area/city', such as 'America/Los_Angeles'. Zone offsets must be in
        the format '(+|-)HH:mm', for example '-08:00' or '+01:00'. Also 'UTC' and 'Z' are
        supported as aliases of '+00:00'. Other short names are not recommended to use
        because they can be ambiguous.

        .. versionchanged:: 2.4.0
           `tz` can take a :class:`~pyspark.sql.Column` containing timezone ID strings.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        timestamp value represented in UTC timezone.

    Examples
    --------
    >>> df = spark.createDataFrame([('1997-02-28 10:30:00', 'JST')], ['ts', 'tz'])
    >>> df.select(to_utc_timestamp(df.ts, "PST").alias('utc_time')).collect()
    [Row(utc_time=datetime.datetime(1997, 2, 28, 18, 30))]
    >>> df.select(to_utc_timestamp(df.ts, df.tz).alias('utc_time')).collect()
    [Row(utc_time=datetime.datetime(1997, 2, 28, 1, 30))]
    """
    if isinstance(tz, Column):
        tz = _to_java_column(tz)
    return _invoke_function("to_utc_timestamp", _to_java_column(timestamp), tz)


@try_remote_functions
def timestamp_seconds(col: "ColumnOrName") -> Column:
    """
    Converts the number of seconds from the Unix epoch (1970-01-01T00:00:00Z)
    to a timestamp.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        unix time values.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        converted timestamp value.

    Examples
    --------
    >>> from pyspark.sql.functions import timestamp_seconds
    >>> spark.conf.set("spark.sql.session.timeZone", "UTC")
    >>> time_df = spark.createDataFrame([(1230219000,)], ['unix_time'])
    >>> time_df.select(timestamp_seconds(time_df.unix_time).alias('ts')).show()
    +-------------------+
    |                 ts|
    +-------------------+
    |2008-12-25 15:30:00|
    +-------------------+
    >>> time_df.select(timestamp_seconds('unix_time').alias('ts')).printSchema()
    root
     |-- ts: timestamp (nullable = true)
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """

    return _invoke_function_over_columns("timestamp_seconds", col)


@try_remote_functions
def timestamp_millis(col: "ColumnOrName") -> Column:
    """
    Creates timestamp from the number of milliseconds since UTC epoch.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        unix time values.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        converted timestamp value.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "UTC")
    >>> time_df = spark.createDataFrame([(1230219000,)], ['unix_time'])
    >>> time_df.select(timestamp_millis(time_df.unix_time).alias('ts')).show()
    +-------------------+
    |                 ts|
    +-------------------+
    |1970-01-15 05:43:39|
    +-------------------+
    >>> time_df.select(timestamp_millis('unix_time').alias('ts')).printSchema()
    root
     |-- ts: timestamp (nullable = true)
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns("timestamp_millis", col)


@try_remote_functions
def timestamp_micros(col: "ColumnOrName") -> Column:
    """
    Creates timestamp from the number of microseconds since UTC epoch.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        unix time values.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        converted timestamp value.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "UTC")
    >>> time_df = spark.createDataFrame([(1230219000,)], ['unix_time'])
    >>> time_df.select(timestamp_micros(time_df.unix_time).alias('ts')).show()
    +--------------------+
    |                  ts|
    +--------------------+
    |1970-01-01 00:20:...|
    +--------------------+
    >>> time_df.select(timestamp_micros('unix_time').alias('ts')).printSchema()
    root
     |-- ts: timestamp (nullable = true)
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns("timestamp_micros", col)


@try_remote_functions
def window(
    timeColumn: "ColumnOrName",
    windowDuration: str,
    slideDuration: Optional[str] = None,
    startTime: Optional[str] = None,
) -> Column:
    """Bucketize rows into one or more time windows given a timestamp specifying column. Window
    starts are inclusive but the window ends are exclusive, e.g. 12:05 will be in the window
    [12:05,12:10) but not in [12:00,12:05). Windows can support microsecond precision. Windows in
    the order of months are not supported.

    The time column must be of :class:`pyspark.sql.types.TimestampType`.

    Durations are provided as strings, e.g. '1 second', '1 day 12 hours', '2 minutes'. Valid
    interval strings are 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond'.
    If the ``slideDuration`` is not provided, the windows will be tumbling windows.

    The startTime is the offset with respect to 1970-01-01 00:00:00 UTC with which to start
    window intervals. For example, in order to have hourly tumbling windows that start 15 minutes
    past the hour, e.g. 12:15-13:15, 13:15-14:15... provide `startTime` as `15 minutes`.

    The output column will be a struct called 'window' by default with the nested columns 'start'
    and 'end', where 'start' and 'end' will be of :class:`pyspark.sql.types.TimestampType`.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    timeColumn : :class:`~pyspark.sql.Column`
        The column or the expression to use as the timestamp for windowing by time.
        The time column must be of TimestampType or TimestampNTZType.
    windowDuration : str
        A string specifying the width of the window, e.g. `10 minutes`,
        `1 second`. Check `org.apache.spark.unsafe.types.CalendarInterval` for
        valid duration identifiers. Note that the duration is a fixed length of
        time, and does not vary over time according to a calendar. For example,
        `1 day` always means 86,400,000 milliseconds, not a calendar day.
    slideDuration : str, optional
        A new window will be generated every `slideDuration`. Must be less than
        or equal to the `windowDuration`. Check
        `org.apache.spark.unsafe.types.CalendarInterval` for valid duration
        identifiers. This duration is likewise absolute, and does not vary
        according to a calendar.
    startTime : str, optional
        The offset with respect to 1970-01-01 00:00:00 UTC with which to start
        window intervals. For example, in order to have hourly tumbling windows that
        start 15 minutes past the hour, e.g. 12:15-13:15, 13:15-14:15... provide
        `startTime` as `15 minutes`.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame(
    ...     [(datetime.datetime(2016, 3, 11, 9, 0, 7), 1)],
    ... ).toDF("date", "val")
    >>> w = df.groupBy(window("date", "5 seconds")).agg(sum("val").alias("sum"))
    >>> w.select(w.window.start.cast("string").alias("start"),
    ...          w.window.end.cast("string").alias("end"), "sum").collect()
    [Row(start='2016-03-11 09:00:05', end='2016-03-11 09:00:10', sum=1)]
    """

    def check_string_field(field, fieldName):  # type: ignore[no-untyped-def]
        if not field or type(field) is not str:
            raise PySparkTypeError(
                error_class="NOT_STR",
                message_parameters={"arg_name": fieldName, "arg_type": type(field).__name__},
            )

    time_col = _to_java_column(timeColumn)
    check_string_field(windowDuration, "windowDuration")
    if slideDuration and startTime:
        check_string_field(slideDuration, "slideDuration")
        check_string_field(startTime, "startTime")
        return _invoke_function("window", time_col, windowDuration, slideDuration, startTime)
    elif slideDuration:
        check_string_field(slideDuration, "slideDuration")
        return _invoke_function("window", time_col, windowDuration, slideDuration)
    elif startTime:
        check_string_field(startTime, "startTime")
        return _invoke_function("window", time_col, windowDuration, windowDuration, startTime)
    else:
        return _invoke_function("window", time_col, windowDuration)


@try_remote_functions
def window_time(
    windowColumn: "ColumnOrName",
) -> Column:
    """Computes the event time from a window column. The column window values are produced
    by window aggregating operators and are of type `STRUCT<start: TIMESTAMP, end: TIMESTAMP>`
    where start is inclusive and end is exclusive. The event time of records produced by window
    aggregating operators can be computed as ``window_time(window)`` and are
    ``window.end - lit(1).alias("microsecond")`` (as microsecond is the minimal supported event
    time precision). The window column must be one produced by a window aggregating operator.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    windowColumn : :class:`~pyspark.sql.Column`
        The window column of a window aggregate records.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> import datetime
    >>> df = spark.createDataFrame(
    ...     [(datetime.datetime(2016, 3, 11, 9, 0, 7), 1)],
    ... ).toDF("date", "val")

    Group the data into 5 second time windows and aggregate as sum.

    >>> w = df.groupBy(window("date", "5 seconds")).agg(sum("val").alias("sum"))

    Extract the window event time using the window_time function.

    >>> w.select(
    ...     w.window.end.cast("string").alias("end"),
    ...     window_time(w.window).cast("string").alias("window_time"),
    ...     "sum"
    ... ).collect()
    [Row(end='2016-03-11 09:00:10', window_time='2016-03-11 09:00:09.999999', sum=1)]
    """
    window_col = _to_java_column(windowColumn)
    return _invoke_function("window_time", window_col)


@try_remote_functions
def session_window(timeColumn: "ColumnOrName", gapDuration: Union[Column, str]) -> Column:
    """
    Generates session window given a timestamp specifying column.
    Session window is one of dynamic windows, which means the length of window is varying
    according to the given inputs. The length of session window is defined as "the timestamp
    of latest input of the session + gap duration", so when the new inputs are bound to the
    current session window, the end time of session window can be expanded according to the new
    inputs.
    Windows can support microsecond precision. Windows in the order of months are not supported.
    For a streaming query, you may use the function `current_timestamp` to generate windows on
    processing time.
    gapDuration is provided as strings, e.g. '1 second', '1 day 12 hours', '2 minutes'. Valid
    interval strings are 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond'.
    It could also be a Column which can be evaluated to gap duration dynamically based on the
    input row.
    The output column will be a struct called 'session_window' by default with the nested columns
    'start' and 'end', where 'start' and 'end' will be of :class:`pyspark.sql.types.TimestampType`.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    timeColumn : :class:`~pyspark.sql.Column` or str
        The column name or column to use as the timestamp for windowing by time.
        The time column must be of TimestampType or TimestampNTZType.
    gapDuration : :class:`~pyspark.sql.Column` or str
        A Python string literal or column specifying the timeout of the session. It could be
        static value, e.g. `10 minutes`, `1 second`, or an expression/UDF that specifies gap
        duration dynamically based on the input row.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([("2016-03-11 09:00:07", 1)]).toDF("date", "val")
    >>> w = df.groupBy(session_window("date", "5 seconds")).agg(sum("val").alias("sum"))
    >>> w.select(w.session_window.start.cast("string").alias("start"),
    ...          w.session_window.end.cast("string").alias("end"), "sum").collect()
    [Row(start='2016-03-11 09:00:07', end='2016-03-11 09:00:12', sum=1)]
    >>> w = df.groupBy(session_window("date", lit("5 seconds"))).agg(sum("val").alias("sum"))
    >>> w.select(w.session_window.start.cast("string").alias("start"),
    ...          w.session_window.end.cast("string").alias("end"), "sum").collect()
    [Row(start='2016-03-11 09:00:07', end='2016-03-11 09:00:12', sum=1)]
    """

    def check_field(field: Union[Column, str], fieldName: str) -> None:
        if field is None or not isinstance(field, (str, Column)):
            raise PySparkTypeError(
                error_class="NOT_COLUMN_OR_STR",
                message_parameters={"arg_name": fieldName, "arg_type": type(field).__name__},
            )

    time_col = _to_java_column(timeColumn)
    check_field(gapDuration, "gapDuration")
    gap_duration = gapDuration if isinstance(gapDuration, str) else _to_java_column(gapDuration)
    return _invoke_function("session_window", time_col, gap_duration)


@try_remote_functions
def to_unix_timestamp(
    timestamp: "ColumnOrName",
    format: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Returns the UNIX timestamp of the given time.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert UNIX timestamp values.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([("2016-04-08",)], ["e"])
    >>> df.select(to_unix_timestamp(df.e, lit("yyyy-MM-dd")).alias('r')).collect()
    [Row(r=1460098800)]
    >>> spark.conf.unset("spark.sql.session.timeZone")

    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([("2016-04-08",)], ["e"])
    >>> df.select(to_unix_timestamp(df.e).alias('r')).collect()
    [Row(r=None)]
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    if format is not None:
        return _invoke_function_over_columns("to_unix_timestamp", timestamp, format)
    else:
        return _invoke_function_over_columns("to_unix_timestamp", timestamp)


@try_remote_functions
def to_timestamp_ltz(
    timestamp: "ColumnOrName",
    format: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Parses the `timestamp` with the `format` to a timestamp without time zone.
    Returns null with invalid input.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert type `TimestampType` timestamp values.

    Examples
    --------
    >>> df = spark.createDataFrame([("2016-12-31",)], ["e"])
    >>> df.select(to_timestamp_ltz(df.e, lit("yyyy-MM-dd")).alias('r')).collect()
    ... # doctest: +SKIP
    [Row(r=datetime.datetime(2016, 12, 31, 0, 0))]

    >>> df = spark.createDataFrame([("2016-12-31",)], ["e"])
    >>> df.select(to_timestamp_ltz(df.e).alias('r')).collect()
    ... # doctest: +SKIP
    [Row(r=datetime.datetime(2016, 12, 31, 0, 0))]
    """
    if format is not None:
        return _invoke_function_over_columns("to_timestamp_ltz", timestamp, format)
    else:
        return _invoke_function_over_columns("to_timestamp_ltz", timestamp)


@try_remote_functions
def to_timestamp_ntz(
    timestamp: "ColumnOrName",
    format: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Parses the `timestamp` with the `format` to a timestamp without time zone.
    Returns null with invalid input.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    timestamp : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert type `TimestampNTZType` timestamp values.

    Examples
    --------
    >>> df = spark.createDataFrame([("2016-04-08",)], ["e"])
    >>> df.select(to_timestamp_ntz(df.e, lit("yyyy-MM-dd")).alias('r')).collect()
    ... # doctest: +SKIP
    [Row(r=datetime.datetime(2016, 4, 8, 0, 0))]

    >>> df = spark.createDataFrame([("2016-04-08",)], ["e"])
    >>> df.select(to_timestamp_ntz(df.e).alias('r')).collect()
    ... # doctest: +SKIP
    [Row(r=datetime.datetime(2016, 4, 8, 0, 0))]
    """
    if format is not None:
        return _invoke_function_over_columns("to_timestamp_ntz", timestamp, format)
    else:
        return _invoke_function_over_columns("to_timestamp_ntz", timestamp)


# ---------------------------- misc functions ----------------------------------


@try_remote_functions
def current_catalog() -> Column:
    """Returns the current catalog.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.range(1).select(current_catalog()).show()
    +-----------------+
    |current_catalog()|
    +-----------------+
    |    spark_catalog|
    +-----------------+
    """
    return _invoke_function("current_catalog")


@try_remote_functions
def current_database() -> Column:
    """Returns the current database.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.range(1).select(current_database()).show()
    +------------------+
    |current_database()|
    +------------------+
    |           default|
    +------------------+
    """
    return _invoke_function("current_database")


@try_remote_functions
def current_schema() -> Column:
    """Returns the current database.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.current_schema()).show()
    +------------------+
    |current_database()|
    +------------------+
    |           default|
    +------------------+
    """
    return _invoke_function("current_schema")


@try_remote_functions
def current_user() -> Column:
    """Returns the current database.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> spark.range(1).select(current_user()).show() # doctest: +SKIP
    +--------------+
    |current_user()|
    +--------------+
    | ruifeng.zheng|
    +--------------+
    """
    return _invoke_function("current_user")


@try_remote_functions
def user() -> Column:
    """Returns the current database.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.user()).show() # doctest: +SKIP
    +--------------+
    |current_user()|
    +--------------+
    | ruifeng.zheng|
    +--------------+
    """
    return _invoke_function("user")


@try_remote_functions
def crc32(col: "ColumnOrName") -> Column:
    """
    Calculates the cyclic redundancy check value  (CRC32) of a binary column and
    returns the value as a bigint.

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    .. versionadded:: 1.5.0

    Examples
    --------
    >>> spark.createDataFrame([('ABC',)], ['a']).select(crc32('a').alias('crc32')).collect()
    [Row(crc32=2743272264)]
    """
    return _invoke_function_over_columns("crc32", col)


@try_remote_functions
def md5(col: "ColumnOrName") -> Column:
    """Calculates the MD5 digest and returns the value as a 32 character hex string.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> spark.createDataFrame([('ABC',)], ['a']).select(md5('a').alias('hash')).collect()
    [Row(hash='902fbdd2b1df0c4f70b4a5d23525e932')]
    """
    return _invoke_function_over_columns("md5", col)


@try_remote_functions
def sha1(col: "ColumnOrName") -> Column:
    """Returns the hex string result of SHA-1.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> spark.createDataFrame([('ABC',)], ['a']).select(sha1('a').alias('hash')).collect()
    [Row(hash='3c01bdbb26f358bab27f267924aa2c9a03fcfdb8')]
    """
    return _invoke_function_over_columns("sha1", col)


@try_remote_functions
def sha2(col: "ColumnOrName", numBits: int) -> Column:
    """Returns the hex string result of SHA-2 family of hash functions (SHA-224, SHA-256, SHA-384,
    and SHA-512). The numBits indicates the desired bit length of the result, which must have a
    value of 224, 256, 384, 512, or 0 (which is equivalent to 256).

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.
    numBits : int
        the desired bit length of the result, which must have a
        value of 224, 256, 384, 512, or 0 (which is equivalent to 256).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([["Alice"], ["Bob"]], ["name"])
    >>> df.withColumn("sha2", sha2(df.name, 256)).show(truncate=False)
    +-----+----------------------------------------------------------------+
    |name |sha2                                                            |
    +-----+----------------------------------------------------------------+
    |Alice|3bc51062973c458d5a6f2d8d64a023246354ad7e064b1e4e009ec8a0699a3043|
    |Bob  |cd9fb1e148ccd8442e5aa74904cc73bf6fb54d1d54d333bd596aa9bb4bb4e961|
    +-----+----------------------------------------------------------------+
    """
    return _invoke_function("sha2", _to_java_column(col), numBits)


@try_remote_functions
def hash(*cols: "ColumnOrName") -> Column:
    """Calculates the hash code of given columns, and returns the result as an int column.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        one or more columns to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hash value as int column.

    Examples
    --------
    >>> df = spark.createDataFrame([('ABC', 'DEF')], ['c1', 'c2'])

    Hash for one column

    >>> df.select(hash('c1').alias('hash')).show()
    +----------+
    |      hash|
    +----------+
    |-757602832|
    +----------+

    Two or more columns

    >>> df.select(hash('c1', 'c2').alias('hash')).show()
    +---------+
    |     hash|
    +---------+
    |599895104|
    +---------+
    """
    return _invoke_function_over_seq_of_columns("hash", cols)


@try_remote_functions
def xxhash64(*cols: "ColumnOrName") -> Column:
    """Calculates the hash code of given columns using the 64-bit variant of the xxHash algorithm,
    and returns the result as a long column. The hash computation uses an initial seed of 42.

    .. versionadded:: 3.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        one or more columns to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hash value as long column.

    Examples
    --------
    >>> df = spark.createDataFrame([('ABC', 'DEF')], ['c1', 'c2'])

    Hash for one column

    >>> df.select(xxhash64('c1').alias('hash')).show()
    +-------------------+
    |               hash|
    +-------------------+
    |4105715581806190027|
    +-------------------+

    Two or more columns

    >>> df.select(xxhash64('c1', 'c2').alias('hash')).show()
    +-------------------+
    |               hash|
    +-------------------+
    |3233247871021311208|
    +-------------------+
    """
    return _invoke_function_over_seq_of_columns("xxhash64", cols)


@try_remote_functions
def assert_true(col: "ColumnOrName", errMsg: Optional[Union[Column, str]] = None) -> Column:
    """
    Returns `null` if the input column is `true`; throws an exception
    with the provided error message otherwise.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column name or column that represents the input column to test
    errMsg : :class:`~pyspark.sql.Column` or str, optional
        A Python string literal or column containing the error message

    Returns
    -------
    :class:`~pyspark.sql.Column`
        `null` if the input column is `true` otherwise throws an error with specified message.

    Examples
    --------
    >>> df = spark.createDataFrame([(0,1)], ['a', 'b'])
    >>> df.select(assert_true(df.a < df.b).alias('r')).collect()
    [Row(r=None)]
    >>> df.select(assert_true(df.a < df.b, df.a).alias('r')).collect()
    [Row(r=None)]
    >>> df.select(assert_true(df.a < df.b, 'error').alias('r')).collect()
    [Row(r=None)]
    >>> df.select(assert_true(df.a > df.b, 'My error msg').alias('r')).collect() # doctest: +SKIP
    ...
    java.lang.RuntimeException: My error msg
    ...
    """
    if errMsg is None:
        return _invoke_function_over_columns("assert_true", col)
    if not isinstance(errMsg, (str, Column)):
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_STR",
            message_parameters={"arg_name": "errMsg", "arg_type": type(errMsg).__name__},
        )

    errMsg = (
        _create_column_from_literal(errMsg) if isinstance(errMsg, str) else _to_java_column(errMsg)
    )
    return _invoke_function("assert_true", _to_java_column(col), errMsg)


@try_remote_functions
def raise_error(errMsg: Union[Column, str]) -> Column:
    """
    Throws an exception with the provided error message.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    errMsg : :class:`~pyspark.sql.Column` or str
        A Python string literal or column containing the error message

    Returns
    -------
    :class:`~pyspark.sql.Column`
        throws an error with specified message.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(raise_error("My error message")).show() # doctest: +SKIP
    ...
    java.lang.RuntimeException: My error message
    ...
    """
    if not isinstance(errMsg, (str, Column)):
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_STR",
            message_parameters={"arg_name": "errMsg", "arg_type": type(errMsg).__name__},
        )

    errMsg = (
        _create_column_from_literal(errMsg) if isinstance(errMsg, str) else _to_java_column(errMsg)
    )
    return _invoke_function("raise_error", errMsg)


# ---------------------- String/Binary functions ------------------------------


@try_remote_functions
def upper(col: "ColumnOrName") -> Column:
    """
    Converts a string expression to upper case.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        upper case values.

    Examples
    --------
    >>> df = spark.createDataFrame(["Spark", "PySpark", "Pandas API"], "STRING")
    >>> df.select(upper("value")).show()
    +------------+
    |upper(value)|
    +------------+
    |       SPARK|
    |     PYSPARK|
    |  PANDAS API|
    +------------+
    """
    return _invoke_function_over_columns("upper", col)


@try_remote_functions
def lower(col: "ColumnOrName") -> Column:
    """
    Converts a string expression to lower case.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        lower case values.

    Examples
    --------
    >>> df = spark.createDataFrame(["Spark", "PySpark", "Pandas API"], "STRING")
    >>> df.select(lower("value")).show()
    +------------+
    |lower(value)|
    +------------+
    |       spark|
    |     pyspark|
    |  pandas api|
    +------------+
    """
    return _invoke_function_over_columns("lower", col)


@try_remote_functions
def ascii(col: "ColumnOrName") -> Column:
    """
    Computes the numeric value of the first character of the string column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        numeric value.

    Examples
    --------
    >>> df = spark.createDataFrame(["Spark", "PySpark", "Pandas API"], "STRING")
    >>> df.select(ascii("value")).show()
    +------------+
    |ascii(value)|
    +------------+
    |          83|
    |          80|
    |          80|
    +------------+
    """
    return _invoke_function_over_columns("ascii", col)


@try_remote_functions
def base64(col: "ColumnOrName") -> Column:
    """
    Computes the BASE64 encoding of a binary column and returns it as a string column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        BASE64 encoding of string value.

    Examples
    --------
    >>> df = spark.createDataFrame(["Spark", "PySpark", "Pandas API"], "STRING")
    >>> df.select(base64("value")).show()
    +----------------+
    |   base64(value)|
    +----------------+
    |        U3Bhcms=|
    |    UHlTcGFyaw==|
    |UGFuZGFzIEFQSQ==|
    +----------------+
    """
    return _invoke_function_over_columns("base64", col)


@try_remote_functions
def unbase64(col: "ColumnOrName") -> Column:
    """
    Decodes a BASE64 encoded string column and returns it as a binary column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        encoded string value.

    Examples
    --------
    >>> df = spark.createDataFrame(["U3Bhcms=",
    ...                             "UHlTcGFyaw==",
    ...                             "UGFuZGFzIEFQSQ=="], "STRING")
    >>> df.select(unbase64("value")).show()
    +--------------------+
    |     unbase64(value)|
    +--------------------+
    |    [53 70 61 72 6B]|
    |[50 79 53 70 61 7...|
    |[50 61 6E 64 61 7...|
    +--------------------+
    """
    return _invoke_function_over_columns("unbase64", col)


@try_remote_functions
def ltrim(col: "ColumnOrName") -> Column:
    """
    Trim the spaces from left end for the specified string value.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        left trimmed values.

    Examples
    --------
    >>> df = spark.createDataFrame(["   Spark", "Spark  ", " Spark"], "STRING")
    >>> df.select(ltrim("value").alias("r")).withColumn("length", length("r")).show()
    +-------+------+
    |      r|length|
    +-------+------+
    |  Spark|     5|
    |Spark  |     7|
    |  Spark|     5|
    +-------+------+
    """
    return _invoke_function_over_columns("ltrim", col)


@try_remote_functions
def rtrim(col: "ColumnOrName") -> Column:
    """
    Trim the spaces from right end for the specified string value.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        right trimmed values.

    Examples
    --------
    >>> df = spark.createDataFrame(["   Spark", "Spark  ", " Spark"], "STRING")
    >>> df.select(rtrim("value").alias("r")).withColumn("length", length("r")).show()
    +--------+------+
    |       r|length|
    +--------+------+
    |   Spark|     8|
    |   Spark|     5|
    |   Spark|     6|
    +--------+------+
    """
    return _invoke_function_over_columns("rtrim", col)


@try_remote_functions
def trim(col: "ColumnOrName") -> Column:
    """
    Trim the spaces from both ends for the specified string column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        trimmed values from both sides.

    Examples
    --------
    >>> df = spark.createDataFrame(["   Spark", "Spark  ", " Spark"], "STRING")
    >>> df.select(trim("value").alias("r")).withColumn("length", length("r")).show()
    +-----+------+
    |    r|length|
    +-----+------+
    |Spark|     5|
    |Spark|     5|
    |Spark|     5|
    +-----+------+
    """
    return _invoke_function_over_columns("trim", col)


@try_remote_functions
def concat_ws(sep: str, *cols: "ColumnOrName") -> Column:
    """
    Concatenates multiple input string columns together into a single string column,
    using the given separator.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    sep : str
        words separator.
    cols : :class:`~pyspark.sql.Column` or str
        list of columns to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string of concatenated words.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd','123')], ['s', 'd'])
    >>> df.select(concat_ws('-', df.s, df.d).alias('s')).collect()
    [Row(s='abcd-123')]
    """
    sc = get_active_spark_context()
    return _invoke_function("concat_ws", sep, _to_seq(sc, cols, _to_java_column))


@try_remote_functions
def decode(col: "ColumnOrName", charset: str) -> Column:
    """
    Computes the first argument into a string from a binary using the provided character set
    (one of 'US-ASCII', 'ISO-8859-1', 'UTF-8', 'UTF-16BE', 'UTF-16LE', 'UTF-16').

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    charset : str
        charset to use to decode to.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['a'])
    >>> df.select(decode("a", "UTF-8")).show()
    +----------------+
    |decode(a, UTF-8)|
    +----------------+
    |            abcd|
    +----------------+
    """
    return _invoke_function("decode", _to_java_column(col), charset)


@try_remote_functions
def encode(col: "ColumnOrName", charset: str) -> Column:
    """
    Computes the first argument into a binary from a string using the provided character set
    (one of 'US-ASCII', 'ISO-8859-1', 'UTF-8', 'UTF-16BE', 'UTF-16LE', 'UTF-16').

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    charset : str
        charset to use to encode.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column for computed results.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['c'])
    >>> df.select(encode("c", "UTF-8")).show()
    +----------------+
    |encode(c, UTF-8)|
    +----------------+
    |   [61 62 63 64]|
    +----------------+
    """
    return _invoke_function("encode", _to_java_column(col), charset)


@try_remote_functions
def format_number(col: "ColumnOrName", d: int) -> Column:
    """
    Formats the number X to a format like '#,--#,--#.--', rounded to d decimal places
    with HALF_EVEN round mode, and returns the result as a string.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        the column name of the numeric value to be formatted
    d : int
        the N decimal places

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column of formatted results.

    >>> spark.createDataFrame([(5,)], ['a']).select(format_number('a', 4).alias('v')).collect()
    [Row(v='5.0000')]
    """
    return _invoke_function("format_number", _to_java_column(col), d)


@try_remote_functions
def format_string(format: str, *cols: "ColumnOrName") -> Column:
    """
    Formats the arguments in printf-style and returns the result as a string column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    format : str
        string that can contain embedded format tags and used as result column's value
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s to be used in formatting

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the column of formatted results.

    Examples
    --------
    >>> df = spark.createDataFrame([(5, "hello")], ['a', 'b'])
    >>> df.select(format_string('%d %s', df.a, df.b).alias('v')).collect()
    [Row(v='5 hello')]
    """
    sc = get_active_spark_context()
    return _invoke_function("format_string", format, _to_seq(sc, cols, _to_java_column))


@try_remote_functions
def instr(str: "ColumnOrName", substr: str) -> Column:
    """
    Locate the position of the first occurrence of substr column in the given string.
    Returns null if either of the arguments are null.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The position is not zero based, but 1 based index. Returns 0 if substr
    could not be found in str.

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    substr : str
        substring to look for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        location of the first occurrence of the substring as integer.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['s',])
    >>> df.select(instr(df.s, 'b').alias('s')).collect()
    [Row(s=2)]
    """
    return _invoke_function("instr", _to_java_column(str), substr)


@try_remote_functions
def overlay(
    src: "ColumnOrName",
    replace: "ColumnOrName",
    pos: Union["ColumnOrName", int],
    len: Union["ColumnOrName", int] = -1,
) -> Column:
    """
    Overlay the specified portion of `src` with `replace`,
    starting from byte position `pos` of `src` and proceeding for `len` bytes.

    .. versionadded:: 3.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    src : :class:`~pyspark.sql.Column` or str
        column name or column containing the string that will be replaced
    replace : :class:`~pyspark.sql.Column` or str
        column name or column containing the substitution string
    pos : :class:`~pyspark.sql.Column` or str or int
        column name, column, or int containing the starting position in src
    len : :class:`~pyspark.sql.Column` or str or int, optional
        column name, column, or int containing the number of bytes to replace in src
        string by 'replace' defaults to -1, which represents the length of the 'replace' string

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string with replaced values.

    Examples
    --------
    >>> df = spark.createDataFrame([("SPARK_SQL", "CORE")], ("x", "y"))
    >>> df.select(overlay("x", "y", 7).alias("overlayed")).collect()
    [Row(overlayed='SPARK_CORE')]
    >>> df.select(overlay("x", "y", 7, 0).alias("overlayed")).collect()
    [Row(overlayed='SPARK_CORESQL')]
    >>> df.select(overlay("x", "y", 7, 2).alias("overlayed")).collect()
    [Row(overlayed='SPARK_COREL')]
    """
    if not isinstance(pos, (int, str, Column)):
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_INT_OR_STR",
            message_parameters={"arg_name": "pos", "arg_type": type(pos).__name__},
        )
    if len is not None and not isinstance(len, (int, str, Column)):
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_INT_OR_STR",
            message_parameters={"arg_name": "len", "arg_type": type(len).__name__},
        )

    pos = _create_column_from_literal(pos) if isinstance(pos, int) else _to_java_column(pos)
    len = _create_column_from_literal(len) if isinstance(len, int) else _to_java_column(len)

    return _invoke_function("overlay", _to_java_column(src), _to_java_column(replace), pos, len)


@try_remote_functions
def sentences(
    string: "ColumnOrName",
    language: Optional["ColumnOrName"] = None,
    country: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Splits a string into arrays of sentences, where each sentence is an array of words.
    The 'language' and 'country' arguments are optional, and if omitted, the default locale is used.

    .. versionadded:: 3.2.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    string : :class:`~pyspark.sql.Column` or str
        a string to be split
    language : :class:`~pyspark.sql.Column` or str, optional
        a language of the locale
    country : :class:`~pyspark.sql.Column` or str, optional
        a country of the locale

    Returns
    -------
    :class:`~pyspark.sql.Column`
        arrays of split sentences.

    Examples
    --------
    >>> df = spark.createDataFrame([["This is an example sentence."]], ["string"])
    >>> df.select(sentences(df.string, lit("en"), lit("US"))).show(truncate=False)
    +-----------------------------------+
    |sentences(string, en, US)          |
    +-----------------------------------+
    |[[This, is, an, example, sentence]]|
    +-----------------------------------+
    >>> df = spark.createDataFrame([["Hello world. How are you?"]], ["s"])
    >>> df.select(sentences("s")).show(truncate=False)
    +---------------------------------+
    |sentences(s, , )                 |
    +---------------------------------+
    |[[Hello, world], [How, are, you]]|
    +---------------------------------+
    """
    if language is None:
        language = lit("")
    if country is None:
        country = lit("")

    return _invoke_function_over_columns("sentences", string, language, country)


@try_remote_functions
def substring(str: "ColumnOrName", pos: int, len: int) -> Column:
    """
    Substring starts at `pos` and is of length `len` when str is String type or
    returns the slice of byte array that starts at `pos` in byte and is of length `len`
    when str is Binary type.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The position is not zero based, but 1 based index.

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    pos : int
        starting position in str.
    len : int
        length of chars.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        substring of given value.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['s',])
    >>> df.select(substring(df.s, 1, 2).alias('s')).collect()
    [Row(s='ab')]
    """
    return _invoke_function("substring", _to_java_column(str), pos, len)


@try_remote_functions
def substring_index(str: "ColumnOrName", delim: str, count: int) -> Column:
    """
    Returns the substring from string str before count occurrences of the delimiter delim.
    If count is positive, everything the left of the final delimiter (counting from left) is
    returned. If count is negative, every to the right of the final delimiter (counting from the
    right) is returned. substring_index performs a case-sensitive match when searching for delim.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    delim : str
        delimiter of values.
    count : int
        number of occurrences.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        substring of given value.

    Examples
    --------
    >>> df = spark.createDataFrame([('a.b.c.d',)], ['s'])
    >>> df.select(substring_index(df.s, '.', 2).alias('s')).collect()
    [Row(s='a.b')]
    >>> df.select(substring_index(df.s, '.', -3).alias('s')).collect()
    [Row(s='b.c.d')]
    """
    return _invoke_function("substring_index", _to_java_column(str), delim, count)


@try_remote_functions
def levenshtein(
    left: "ColumnOrName", right: "ColumnOrName", threshold: Optional[int] = None
) -> Column:
    """Computes the Levenshtein distance of the two given strings.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
        first column value.
    right : :class:`~pyspark.sql.Column` or str
        second column value.
    threshold : int, optional
        if set when the levenshtein distance of the two given strings
        less than or equal to a given threshold then return result distance, or -1

        .. versionchanged: 3.5.0
            Added ``threshold`` argument.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        Levenshtein distance as integer value.

    Examples
    --------
    >>> df0 = spark.createDataFrame([('kitten', 'sitting',)], ['l', 'r'])
    >>> df0.select(levenshtein('l', 'r').alias('d')).collect()
    [Row(d=3)]
    >>> df0.select(levenshtein('l', 'r', 2).alias('d')).collect()
    [Row(d=-1)]
    """
    if threshold is None:
        return _invoke_function_over_columns("levenshtein", left, right)
    else:
        return _invoke_function(
            "levenshtein", _to_java_column(left), _to_java_column(right), threshold
        )


@try_remote_functions
def locate(substr: str, str: "ColumnOrName", pos: int = 1) -> Column:
    """
    Locate the position of the first occurrence of substr in a string column, after position pos.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    substr : str
        a string
    str : :class:`~pyspark.sql.Column` or str
        a Column of :class:`pyspark.sql.types.StringType`
    pos : int, optional
        start position (zero based)

    Returns
    -------
    :class:`~pyspark.sql.Column`
        position of the substring.

    Notes
    -----
    The position is not zero based, but 1 based index. Returns 0 if substr
    could not be found in str.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['s',])
    >>> df.select(locate('b', df.s, 1).alias('s')).collect()
    [Row(s=2)]
    """
    return _invoke_function("locate", substr, _to_java_column(str), pos)


@try_remote_functions
def lpad(col: "ColumnOrName", len: int, pad: str) -> Column:
    """
    Left-pad the string column to width `len` with `pad`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    len : int
        length of the final string.
    pad : str
        chars to prepend.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        left padded result.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['s',])
    >>> df.select(lpad(df.s, 6, '#').alias('s')).collect()
    [Row(s='##abcd')]
    """
    return _invoke_function("lpad", _to_java_column(col), len, pad)


@try_remote_functions
def rpad(col: "ColumnOrName", len: int, pad: str) -> Column:
    """
    Right-pad the string column to width `len` with `pad`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    len : int
        length of the final string.
    pad : str
        chars to append.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        right padded result.

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd',)], ['s',])
    >>> df.select(rpad(df.s, 6, '#').alias('s')).collect()
    [Row(s='abcd##')]
    """
    return _invoke_function("rpad", _to_java_column(col), len, pad)


@try_remote_functions
def repeat(col: "ColumnOrName", n: int) -> Column:
    """
    Repeats a string column n times, and returns it as a new string column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    n : int
        number of times to repeat value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string with repeated values.

    Examples
    --------
    >>> df = spark.createDataFrame([('ab',)], ['s',])
    >>> df.select(repeat(df.s, 3).alias('s')).collect()
    [Row(s='ababab')]
    """
    return _invoke_function("repeat", _to_java_column(col), n)


@try_remote_functions
def split(str: "ColumnOrName", pattern: str, limit: int = -1) -> Column:
    """
    Splits str around matches of the given pattern.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        a string expression to split
    pattern : str
        a string representing a regular expression. The regex string should be
        a Java regular expression.
    limit : int, optional
        an integer which controls the number of times `pattern` is applied.

        * ``limit > 0``: The resulting array's length will not be more than `limit`, and the
                         resulting array's last entry will contain all input beyond the last
                         matched pattern.
        * ``limit <= 0``: `pattern` will be applied as many times as possible, and the resulting
                          array can be of any size.

        .. versionchanged:: 3.0
           `split` now takes an optional `limit` field. If not provided, default limit value is -1.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        array of separated strings.

    Examples
    --------
    >>> df = spark.createDataFrame([('oneAtwoBthreeC',)], ['s',])
    >>> df.select(split(df.s, '[ABC]', 2).alias('s')).collect()
    [Row(s=['one', 'twoBthreeC'])]
    >>> df.select(split(df.s, '[ABC]', -1).alias('s')).collect()
    [Row(s=['one', 'two', 'three', ''])]
    """
    return _invoke_function("split", _to_java_column(str), pattern, limit)


@try_remote_functions
def rlike(str: "ColumnOrName", regexp: "ColumnOrName") -> Column:
    r"""Returns true if `str` matches the Java regex `regexp`, or false otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if `str` matches a Java regex, or false otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([("1a 2b 14m", r"(\d+)")], ["str", "regexp"])
    >>> df.select(rlike('str', lit(r'(\d+)')).alias('d')).collect()
    [Row(d=True)]
    >>> df.select(rlike('str', lit(r'\d{2}b')).alias('d')).collect()
    [Row(d=False)]
    >>> df.select(rlike("str", col("regexp")).alias('d')).collect()
    [Row(d=True)]
    """
    return _invoke_function_over_columns("rlike", str, regexp)


@try_remote_functions
def regexp(str: "ColumnOrName", regexp: "ColumnOrName") -> Column:
    r"""Returns true if `str` matches the Java regex `regexp`, or false otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if `str` matches a Java regex, or false otherwise.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("1a 2b 14m", r"(\d+)")], ["str", "regexp"]
    ... ).select(sf.regexp('str', sf.lit(r'(\d+)'))).show()
    +------------------+
    |REGEXP(str, (\d+))|
    +------------------+
    |              true|
    +------------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("1a 2b 14m", r"(\d+)")], ["str", "regexp"]
    ... ).select(sf.regexp('str', sf.lit(r'\d{2}b'))).show()
    +-------------------+
    |REGEXP(str, \d{2}b)|
    +-------------------+
    |              false|
    +-------------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("1a 2b 14m", r"(\d+)")], ["str", "regexp"]
    ... ).select(sf.regexp('str', sf.col("regexp"))).show()
    +-------------------+
    |REGEXP(str, regexp)|
    +-------------------+
    |               true|
    +-------------------+
    """
    return _invoke_function_over_columns("regexp", str, regexp)


@try_remote_functions
def regexp_like(str: "ColumnOrName", regexp: "ColumnOrName") -> Column:
    r"""Returns true if `str` matches the Java regex `regexp`, or false otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        true if `str` matches a Java regex, or false otherwise.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("1a 2b 14m", r"(\d+)")], ["str", "regexp"]
    ... ).select(sf.regexp_like('str', sf.lit(r'(\d+)'))).show()
    +-----------------------+
    |REGEXP_LIKE(str, (\d+))|
    +-----------------------+
    |                   true|
    +-----------------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("1a 2b 14m", r"(\d+)")], ["str", "regexp"]
    ... ).select(sf.regexp_like('str', sf.lit(r'\d{2}b'))).show()
    +------------------------+
    |REGEXP_LIKE(str, \d{2}b)|
    +------------------------+
    |                   false|
    +------------------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("1a 2b 14m", r"(\d+)")], ["str", "regexp"]
    ... ).select(sf.regexp_like('str', sf.col("regexp"))).show()
    +------------------------+
    |REGEXP_LIKE(str, regexp)|
    +------------------------+
    |                    true|
    +------------------------+
    """
    return _invoke_function_over_columns("regexp_like", str, regexp)


@try_remote_functions
def regexp_count(str: "ColumnOrName", regexp: "ColumnOrName") -> Column:
    r"""Returns a count of the number of times that the Java regex pattern `regexp` is matched
    in the string `str`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the number of times that a Java regex pattern is matched in the string.

    Examples
    --------
    >>> df = spark.createDataFrame([("1a 2b 14m", r"\d+")], ["str", "regexp"])
    >>> df.select(regexp_count('str', lit(r'\d+')).alias('d')).collect()
    [Row(d=3)]
    >>> df.select(regexp_count('str', lit(r'mmm')).alias('d')).collect()
    [Row(d=0)]
    >>> df.select(regexp_count("str", col("regexp")).alias('d')).collect()
    [Row(d=3)]
    """
    return _invoke_function_over_columns("regexp_count", str, regexp)


@try_remote_functions
def regexp_extract(str: "ColumnOrName", pattern: str, idx: int) -> Column:
    r"""Extract a specific group matched by the Java regex `regexp`, from the specified string column.
    If the regex did not match, or the specified group did not match, an empty string is returned.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    pattern : str
        regex pattern to apply.
    idx : int
        matched group id.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        matched value specified by `idx` group id.

    Examples
    --------
    >>> df = spark.createDataFrame([('100-200',)], ['str'])
    >>> df.select(regexp_extract('str', r'(\d+)-(\d+)', 1).alias('d')).collect()
    [Row(d='100')]
    >>> df = spark.createDataFrame([('foo',)], ['str'])
    >>> df.select(regexp_extract('str', r'(\d+)', 1).alias('d')).collect()
    [Row(d='')]
    >>> df = spark.createDataFrame([('aaaac',)], ['str'])
    >>> df.select(regexp_extract('str', '(a+)(b)?(c)', 2).alias('d')).collect()
    [Row(d='')]
    """
    return _invoke_function("regexp_extract", _to_java_column(str), pattern, idx)


@try_remote_functions
def regexp_extract_all(
    str: "ColumnOrName", regexp: "ColumnOrName", idx: Optional[Union[int, Column]] = None
) -> Column:
    r"""Extract all strings in the `str` that match the Java regex `regexp`
    and corresponding to the regex group index.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.
    idx : int
        matched group id.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        all strings in the `str` that match a Java regex and corresponding to the regex group index.

    Examples
    --------
    >>> df = spark.createDataFrame([("100-200, 300-400", r"(\d+)-(\d+)")], ["str", "regexp"])
    >>> df.select(regexp_extract_all('str', lit(r'(\d+)-(\d+)')).alias('d')).collect()
    [Row(d=['100', '300'])]
    >>> df.select(regexp_extract_all('str', lit(r'(\d+)-(\d+)'), 1).alias('d')).collect()
    [Row(d=['100', '300'])]
    >>> df.select(regexp_extract_all('str', lit(r'(\d+)-(\d+)'), 2).alias('d')).collect()
    [Row(d=['200', '400'])]
    >>> df.select(regexp_extract_all('str', col("regexp")).alias('d')).collect()
    [Row(d=['100', '300'])]
    """
    if idx is None:
        return _invoke_function_over_columns("regexp_extract_all", str, regexp)
    else:
        idx = lit(idx) if isinstance(idx, int) else idx
        return _invoke_function_over_columns("regexp_extract_all", str, regexp, idx)


@try_remote_functions
def regexp_replace(
    string: "ColumnOrName", pattern: Union[str, Column], replacement: Union[str, Column]
) -> Column:
    r"""Replace all substrings of the specified string value that match regexp with replacement.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    string : :class:`~pyspark.sql.Column` or str
        column name or column containing the string value
    pattern : :class:`~pyspark.sql.Column` or str
        column object or str containing the regexp pattern
    replacement : :class:`~pyspark.sql.Column` or str
        column object or str containing the replacement

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string with all substrings replaced.

    Examples
    --------
    >>> df = spark.createDataFrame([("100-200", r"(\d+)", "--")], ["str", "pattern", "replacement"])
    >>> df.select(regexp_replace('str', r'(\d+)', '--').alias('d')).collect()
    [Row(d='-----')]
    >>> df.select(regexp_replace("str", col("pattern"), col("replacement")).alias('d')).collect()
    [Row(d='-----')]
    """
    if isinstance(pattern, str):
        pattern_col = _create_column_from_literal(pattern)
    else:
        pattern_col = _to_java_column(pattern)
    if isinstance(replacement, str):
        replacement_col = _create_column_from_literal(replacement)
    else:
        replacement_col = _to_java_column(replacement)
    return _invoke_function("regexp_replace", _to_java_column(string), pattern_col, replacement_col)


@try_remote_functions
def regexp_substr(str: "ColumnOrName", regexp: "ColumnOrName") -> Column:
    r"""Returns the substring that matches the Java regex `regexp` within the string `str`.
    If the regular expression is not found, the result is null.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        the substring that matches a Java regex within the string `str`.

    Examples
    --------
    >>> df = spark.createDataFrame([("1a 2b 14m", r"\d+")], ["str", "regexp"])
    >>> df.select(regexp_substr('str', lit(r'\d+')).alias('d')).collect()
    [Row(d='1')]
    >>> df.select(regexp_substr('str', lit(r'mmm')).alias('d')).collect()
    [Row(d=None)]
    >>> df.select(regexp_substr("str", col("regexp")).alias('d')).collect()
    [Row(d='1')]
    """
    return _invoke_function_over_columns("regexp_substr", str, regexp)


@try_remote_functions
def regexp_instr(
    str: "ColumnOrName", regexp: "ColumnOrName", idx: Optional[Union[int, Column]] = None
) -> Column:
    r"""Extract all strings in the `str` that match the Java regex `regexp`
    and corresponding to the regex group index.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        target column to work on.
    regexp : :class:`~pyspark.sql.Column` or str
        regex pattern to apply.
    idx : int
        matched group id.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        all strings in the `str` that match a Java regex and corresponding to the regex group index.

    Examples
    --------
    >>> df = spark.createDataFrame([("1a 2b 14m", r"\d+(a|b|m)")], ["str", "regexp"])
    >>> df.select(regexp_instr('str', lit(r'\d+(a|b|m)')).alias('d')).collect()
    [Row(d=1)]
    >>> df.select(regexp_instr('str', lit(r'\d+(a|b|m)'), 1).alias('d')).collect()
    [Row(d=1)]
    >>> df.select(regexp_instr('str', lit(r'\d+(a|b|m)'), 2).alias('d')).collect()
    [Row(d=1)]
    >>> df.select(regexp_instr('str', col("regexp")).alias('d')).collect()
    [Row(d=1)]
    """
    if idx is None:
        return _invoke_function_over_columns("regexp_instr", str, regexp)
    else:
        idx = lit(idx) if isinstance(idx, int) else idx
        return _invoke_function_over_columns("regexp_instr", str, regexp, idx)


@try_remote_functions
def initcap(col: "ColumnOrName") -> Column:
    """Translate the first letter of each word to upper case in the sentence.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string with all first letters are uppercase in each word.

    Examples
    --------
    >>> spark.createDataFrame([('ab cd',)], ['a']).select(initcap("a").alias('v')).collect()
    [Row(v='Ab Cd')]
    """
    return _invoke_function_over_columns("initcap", col)


@try_remote_functions
def soundex(col: "ColumnOrName") -> Column:
    """
    Returns the SoundEx encoding for a string

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        SoundEx encoded string.

    Examples
    --------
    >>> df = spark.createDataFrame([("Peters",),("Uhrbach",)], ['name'])
    >>> df.select(soundex(df.name).alias("soundex")).collect()
    [Row(soundex='P362'), Row(soundex='U612')]
    """
    return _invoke_function_over_columns("soundex", col)


@try_remote_functions
def bin(col: "ColumnOrName") -> Column:
    """Returns the string representation of the binary value of the given column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        binary representation of given value as string.

    Examples
    --------
    >>> df = spark.createDataFrame([2,5], "INT")
    >>> df.select(bin(df.value).alias('c')).collect()
    [Row(c='10'), Row(c='101')]
    """
    return _invoke_function_over_columns("bin", col)


@try_remote_functions
def hex(col: "ColumnOrName") -> Column:
    """Computes hex value of the given column, which could be :class:`pyspark.sql.types.StringType`,
    :class:`pyspark.sql.types.BinaryType`, :class:`pyspark.sql.types.IntegerType` or
    :class:`pyspark.sql.types.LongType`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        hexadecimal representation of given value as string.

    Examples
    --------
    >>> spark.createDataFrame([('ABC', 3)], ['a', 'b']).select(hex('a'), hex('b')).collect()
    [Row(hex(a)='414243', hex(b)='3')]
    """
    return _invoke_function_over_columns("hex", col)


@try_remote_functions
def unhex(col: "ColumnOrName") -> Column:
    """Inverse of hex. Interprets each pair of characters as a hexadecimal number
    and converts to the byte representation of number.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string representation of given hexadecimal value.

    Examples
    --------
    >>> spark.createDataFrame([('414243',)], ['a']).select(unhex('a')).collect()
    [Row(unhex(a)=bytearray(b'ABC'))]
    """
    return _invoke_function_over_columns("unhex", col)


@try_remote_functions
def length(col: "ColumnOrName") -> Column:
    """Computes the character length of string data or number of bytes of binary data.
    The length of character data includes the trailing spaces. The length of binary data
    includes binary zeros.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        length of the value.

    Examples
    --------
    >>> spark.createDataFrame([('ABC ',)], ['a']).select(length('a').alias('length')).collect()
    [Row(length=4)]
    """
    return _invoke_function_over_columns("length", col)


@try_remote_functions
def octet_length(col: "ColumnOrName") -> Column:
    """
    Calculates the byte length for the specified string column.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Source column or strings

    Returns
    -------
    :class:`~pyspark.sql.Column`
        Byte length of the col

    Examples
    --------
    >>> from pyspark.sql.functions import octet_length
    >>> spark.createDataFrame([('cat',), ( '\U0001F408',)], ['cat']) \\
    ...      .select(octet_length('cat')).collect()
        [Row(octet_length(cat)=3), Row(octet_length(cat)=4)]
    """
    return _invoke_function_over_columns("octet_length", col)


@try_remote_functions
def bit_length(col: "ColumnOrName") -> Column:
    """
    Calculates the bit length for the specified string column.

    .. versionadded:: 3.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Source column or strings

    Returns
    -------
    :class:`~pyspark.sql.Column`
        Bit length of the col

    Examples
    --------
    >>> from pyspark.sql.functions import bit_length
    >>> spark.createDataFrame([('cat',), ( '\U0001F408',)], ['cat']) \\
    ...      .select(bit_length('cat')).collect()
        [Row(bit_length(cat)=24), Row(bit_length(cat)=32)]
    """
    return _invoke_function_over_columns("bit_length", col)


@try_remote_functions
def translate(srcCol: "ColumnOrName", matching: str, replace: str) -> Column:
    """A function translate any character in the `srcCol` by a character in `matching`.
    The characters in `replace` is corresponding to the characters in `matching`.
    Translation will happen whenever any character in the string is matching with the character
    in the `matching`.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    srcCol : :class:`~pyspark.sql.Column` or str
        Source column or strings
    matching : str
        matching characters.
    replace : str
        characters for replacement. If this is shorter than `matching` string then
        those chars that don't have replacement will be dropped.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        replaced value.

    Examples
    --------
    >>> spark.createDataFrame([('translate',)], ['a']).select(translate('a', "rnlt", "123") \\
    ...     .alias('r')).collect()
    [Row(r='1a2s3ae')]
    """
    return _invoke_function("translate", _to_java_column(srcCol), matching, replace)


@try_remote_functions
def to_binary(col: "ColumnOrName", format: Optional["ColumnOrName"] = None) -> Column:
    """
    Converts the input `col` to a binary value based on the supplied `format`.
    The `format` can be a case-insensitive string literal of "hex", "utf-8", "utf8",
    or "base64". By default, the binary format for conversion is "hex" if
    `format` is omitted. The function returns NULL if at least one of the
    input parameters is NULL.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert binary values.

    Examples
    --------
    >>> df = spark.createDataFrame([("abc",)], ["e"])
    >>> df.select(to_binary(df.e, lit("utf-8")).alias('r')).collect()
    [Row(r=bytearray(b'abc'))]

    >>> df = spark.createDataFrame([("414243",)], ["e"])
    >>> df.select(to_binary(df.e).alias('r')).collect()
    [Row(r=bytearray(b'ABC'))]
    """
    if format is not None:
        return _invoke_function_over_columns("to_binary", col, format)
    else:
        return _invoke_function_over_columns("to_binary", col)


@try_remote_functions
def to_char(col: "ColumnOrName", format: "ColumnOrName") -> Column:
    """
    Convert `col` to a string based on the `format`.
    Throws an exception if the conversion fails. The format can consist of the following
    characters, case insensitive:
    '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the
    format string matches a sequence of digits in the input value, generating a result
    string of the same length as the corresponding sequence in the format string.
    The result string is left-padded with zeros if the 0/9 sequence comprises more digits
    than the matching part of the decimal value, starts with 0, and is before the decimal
    point. Otherwise, it is padded with spaces.
    '.' or 'D': Specifies the position of the decimal point (optional, only allowed once).
    ',' or 'G': Specifies the position of the grouping (thousands) separator (,).
    There must be a 0 or 9 to the left and right of each grouping separator.
    '$': Specifies the location of the $ currency sign. This character may only be specified once.
    'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at
    the beginning or end of the format string). Note that 'S' prints '+' for positive
    values but 'MI' prints a space.
    'PR': Only allowed at the end of the format string; specifies that the result string
    will be wrapped by angle brackets if the input value is negative.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert char values.

    Examples
    --------
    >>> df = spark.createDataFrame([(78.12,)], ["e"])
    >>> df.select(to_char(df.e, lit("$99.99")).alias('r')).collect()
    [Row(r='$78.12')]
    """
    return _invoke_function_over_columns("to_char", col, format)


@try_remote_functions
def to_varchar(col: "ColumnOrName", format: "ColumnOrName") -> Column:
    """
    Convert `col` to a string based on the `format`.
    Throws an exception if the conversion fails. The format can consist of the following
    characters, case insensitive:
    '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the
    format string matches a sequence of digits in the input value, generating a result
    string of the same length as the corresponding sequence in the format string.
    The result string is left-padded with zeros if the 0/9 sequence comprises more digits
    than the matching part of the decimal value, starts with 0, and is before the decimal
    point. Otherwise, it is padded with spaces.
    '.' or 'D': Specifies the position of the decimal point (optional, only allowed once).
    ',' or 'G': Specifies the position of the grouping (thousands) separator (,).
    There must be a 0 or 9 to the left and right of each grouping separator.
    '$': Specifies the location of the $ currency sign. This character may only be specified once.
    'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed once at
    the beginning or end of the format string). Note that 'S' prints '+' for positive
    values but 'MI' prints a space.
    'PR': Only allowed at the end of the format string; specifies that the result string
    will be wrapped by angle brackets if the input value is negative.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert char values.

    Examples
    --------
    >>> df = spark.createDataFrame([(78.12,)], ["e"])
    >>> df.select(to_varchar(df.e, lit("$99.99")).alias('r')).collect()
    [Row(r='$78.12')]
    """
    return _invoke_function_over_columns("to_varchar", col, format)


@try_remote_functions
def to_number(col: "ColumnOrName", format: "ColumnOrName") -> Column:
    """
    Convert string 'col' to a number based on the string format 'format'.
    Throws an exception if the conversion fails. The format can consist of the following
    characters, case insensitive:
    '0' or '9': Specifies an expected digit between 0 and 9. A sequence of 0 or 9 in the
    format string matches a sequence of digits in the input string. If the 0/9
    sequence starts with 0 and is before the decimal point, it can only match a digit
    sequence of the same size. Otherwise, if the sequence starts with 9 or is after
    the decimal point, it can match a digit sequence that has the same or smaller size.
    '.' or 'D': Specifies the position of the decimal point (optional, only allowed once).
    ',' or 'G': Specifies the position of the grouping (thousands) separator (,).
    There must be a 0 or 9 to the left and right of each grouping separator.
    'col' must match the grouping separator relevant for the size of the number.
    '$': Specifies the location of the $ currency sign. This character may only be
    specified once.
    'S' or 'MI': Specifies the position of a '-' or '+' sign (optional, only allowed
    once at the beginning or end of the format string). Note that 'S' allows '-'
    but 'MI' does not.
    'PR': Only allowed at the end of the format string; specifies that 'col' indicates a
    negative number with wrapping angled brackets.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert number values.

    Examples
    --------
    >>> df = spark.createDataFrame([("$78.12",)], ["e"])
    >>> df.select(to_number(df.e, lit("$99.99")).alias('r')).collect()
    [Row(r=Decimal('78.12'))]
    """
    return _invoke_function_over_columns("to_number", col, format)


@try_remote_functions
def replace(
    src: "ColumnOrName", search: "ColumnOrName", replace: Optional["ColumnOrName"] = None
) -> Column:
    """
    Replaces all occurrences of `search` with `replace`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    src : :class:`~pyspark.sql.Column` or str
        A column of string to be replaced.
    search : :class:`~pyspark.sql.Column` or str
        A column of string, If `search` is not found in `str`, `str` is returned unchanged.
    replace : :class:`~pyspark.sql.Column` or str, optional
        A column of string, If `replace` is not specified or is an empty string,
        nothing replaces the string that is removed from `str`.

    Examples
    --------
    >>> df = spark.createDataFrame([("ABCabc", "abc", "DEF",)], ["a", "b", "c"])
    >>> df.select(replace(df.a, df.b, df.c).alias('r')).collect()
    [Row(r='ABCDEF')]

    >>> df.select(replace(df.a, df.b).alias('r')).collect()
    [Row(r='ABC')]
    """
    if replace is not None:
        return _invoke_function_over_columns("replace", src, search, replace)
    else:
        return _invoke_function_over_columns("replace", src, search)


@try_remote_functions
def split_part(src: "ColumnOrName", delimiter: "ColumnOrName", partNum: "ColumnOrName") -> Column:
    """
    Splits `str` by delimiter and return requested part of the split (1-based).
    If any input is null, returns null. if `partNum` is out of range of split parts,
    returns empty string. If `partNum` is 0, throws an error. If `partNum` is negative,
    the parts are counted backward from the end of the string.
    If the `delimiter` is an empty string, the `str` is not split.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    src : :class:`~pyspark.sql.Column` or str
        A column of string to be splited.
    delimiter : :class:`~pyspark.sql.Column` or str
        A column of string, the delimiter used for split.
    partNum : :class:`~pyspark.sql.Column` or str
        A column of string, requested part of the split (1-based).

    Examples
    --------
    >>> df = spark.createDataFrame([("11.12.13", ".", 3,)], ["a", "b", "c"])
    >>> df.select(split_part(df.a, df.b, df.c).alias('r')).collect()
    [Row(r='13')]
    """
    return _invoke_function_over_columns("split_part", src, delimiter, partNum)


@try_remote_functions
def substr(
    str: "ColumnOrName", pos: "ColumnOrName", len: Optional["ColumnOrName"] = None
) -> Column:
    """
    Returns the substring of `str` that starts at `pos` and is of length `len`,
    or the slice of byte array that starts at `pos` and is of length `len`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    src : :class:`~pyspark.sql.Column` or str
        A column of string.
    pos : :class:`~pyspark.sql.Column` or str
        A column of string, the substring of `str` that starts at `pos`.
    len : :class:`~pyspark.sql.Column` or str, optional
        A column of string, the substring of `str` is of length `len`.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("Spark SQL", 5, 1,)], ["a", "b", "c"]
    ... ).select(sf.substr("a", "b", "c")).show()
    +---------------+
    |substr(a, b, c)|
    +---------------+
    |              k|
    +---------------+

    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("Spark SQL", 5, 1,)], ["a", "b", "c"]
    ... ).select(sf.substr("a", "b")).show()
    +------------------------+
    |substr(a, b, 2147483647)|
    +------------------------+
    |                   k SQL|
    +------------------------+
    """
    if len is not None:
        return _invoke_function_over_columns("substr", str, pos, len)
    else:
        return _invoke_function_over_columns("substr", str, pos)


@try_remote_functions
def parse_url(
    url: "ColumnOrName", partToExtract: "ColumnOrName", key: Optional["ColumnOrName"] = None
) -> Column:
    """
    Extracts a part from a URL.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    url : :class:`~pyspark.sql.Column` or str
        A column of string.
    partToExtract : :class:`~pyspark.sql.Column` or str
        A column of string, the path.
    key : :class:`~pyspark.sql.Column` or str, optional
        A column of string, the key.

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [("http://spark.apache.org/path?query=1", "QUERY", "query",)],
    ...     ["a", "b", "c"]
    ... )
    >>> df.select(parse_url(df.a, df.b, df.c).alias('r')).collect()
    [Row(r='1')]

    >>> df.select(parse_url(df.a, df.b).alias('r')).collect()
    [Row(r='query=1')]
    """
    if key is not None:
        return _invoke_function_over_columns("parse_url", url, partToExtract, key)
    else:
        return _invoke_function_over_columns("parse_url", url, partToExtract)


@try_remote_functions
def printf(format: "ColumnOrName", *cols: "ColumnOrName") -> Column:
    """
    Formats the arguments in printf-style and returns the result as a string column.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    format : :class:`~pyspark.sql.Column` or str
        string that can contain embedded format tags and used as result column's value
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s to be used in formatting

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("aa%d%s", 123, "cc",)], ["a", "b", "c"]
    ... ).select(sf.printf("a", "b", "c")).show()
    +---------------+
    |printf(a, b, c)|
    +---------------+
    |        aa123cc|
    +---------------+
    """
    sc = get_active_spark_context()
    return _invoke_function("printf", _to_java_column(format), _to_seq(sc, cols, _to_java_column))


@try_remote_functions
def url_decode(str: "ColumnOrName") -> Column:
    """
    Decodes a `str` in 'application/x-www-form-urlencoded' format
    using a specific encoding scheme.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        A column of string to decode.

    Examples
    --------
    >>> df = spark.createDataFrame([("https%3A%2F%2Fspark.apache.org",)], ["a"])
    >>> df.select(url_decode(df.a).alias('r')).collect()
    [Row(r='https://spark.apache.org')]
    """
    return _invoke_function_over_columns("url_decode", str)


@try_remote_functions
def url_encode(str: "ColumnOrName") -> Column:
    """
    Translates a string into 'application/x-www-form-urlencoded' format
    using a specific encoding scheme.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        A column of string to encode.

    Examples
    --------
    >>> df = spark.createDataFrame([("https://spark.apache.org",)], ["a"])
    >>> df.select(url_encode(df.a).alias('r')).collect()
    [Row(r='https%3A%2F%2Fspark.apache.org')]
    """
    return _invoke_function_over_columns("url_encode", str)


@try_remote_functions
def position(
    substr: "ColumnOrName", str: "ColumnOrName", start: Optional["ColumnOrName"] = None
) -> Column:
    """
    Returns the position of the first occurrence of `substr` in `str` after position `start`.
    The given `start` and return value are 1-based.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    substr : :class:`~pyspark.sql.Column` or str
        A column of string, substring.
    str : :class:`~pyspark.sql.Column` or str
        A column of string.
    start : :class:`~pyspark.sql.Column` or str, optional
        A column of string, start position.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [("bar", "foobarbar", 5,)], ["a", "b", "c"]
    ... ).select(sf.position("a", "b", "c")).show()
    +-----------------+
    |position(a, b, c)|
    +-----------------+
    |                7|
    +-----------------+

    >>> spark.createDataFrame(
    ...     [("bar", "foobarbar", 5,)], ["a", "b", "c"]
    ... ).select(sf.position("a", "b")).show()
    +-----------------+
    |position(a, b, 1)|
    +-----------------+
    |                4|
    +-----------------+
    """
    if start is not None:
        return _invoke_function_over_columns("position", substr, str, start)
    else:
        return _invoke_function_over_columns("position", substr, str)


@try_remote_functions
def endswith(str: "ColumnOrName", suffix: "ColumnOrName") -> Column:
    """
    Returns a boolean. The value is True if str ends with suffix.
    Returns NULL if either input expression is NULL. Otherwise, returns False.
    Both str or suffix must be of STRING or BINARY type.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        A column of string.
    suffix : :class:`~pyspark.sql.Column` or str
        A column of string, the suffix.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark SQL", "Spark",)], ["a", "b"])
    >>> df.select(endswith(df.a, df.b).alias('r')).collect()
    [Row(r=False)]

    >>> df = spark.createDataFrame([("414243", "4243",)], ["e", "f"])
    >>> df = df.select(to_binary("e").alias("e"), to_binary("f").alias("f"))
    >>> df.printSchema()
    root
     |-- e: binary (nullable = true)
     |-- f: binary (nullable = true)
    >>> df.select(endswith("e", "f"), endswith("f", "e")).show()
    +--------------+--------------+
    |endswith(e, f)|endswith(f, e)|
    +--------------+--------------+
    |          true|         false|
    +--------------+--------------+
    """
    return _invoke_function_over_columns("endswith", str, suffix)


@try_remote_functions
def startswith(str: "ColumnOrName", prefix: "ColumnOrName") -> Column:
    """
    Returns a boolean. The value is True if str starts with prefix.
    Returns NULL if either input expression is NULL. Otherwise, returns False.
    Both str or prefix must be of STRING or BINARY type.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        A column of string.
    prefix : :class:`~pyspark.sql.Column` or str
        A column of string, the prefix.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark SQL", "Spark",)], ["a", "b"])
    >>> df.select(startswith(df.a, df.b).alias('r')).collect()
    [Row(r=True)]

    >>> df = spark.createDataFrame([("414243", "4142",)], ["e", "f"])
    >>> df = df.select(to_binary("e").alias("e"), to_binary("f").alias("f"))
    >>> df.printSchema()
    root
     |-- e: binary (nullable = true)
     |-- f: binary (nullable = true)
    >>> df.select(startswith("e", "f"), startswith("f", "e")).show()
    +----------------+----------------+
    |startswith(e, f)|startswith(f, e)|
    +----------------+----------------+
    |            true|           false|
    +----------------+----------------+
    """
    return _invoke_function_over_columns("startswith", str, prefix)


@try_remote_functions
def char(col: "ColumnOrName") -> Column:
    """
    Returns the ASCII character having the binary equivalent to `col`. If col is larger than 256 the
    result is equivalent to char(col % 256)

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.char(sf.lit(65))).show()
    +--------+
    |char(65)|
    +--------+
    |       A|
    +--------+
    """
    return _invoke_function_over_columns("char", col)


@try_remote_functions
def btrim(str: "ColumnOrName", trim: Optional["ColumnOrName"] = None) -> Column:
    """
    Remove the leading and trailing `trim` characters from `str`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    trim : :class:`~pyspark.sql.Column` or str
        The trim string characters to trim, the default value is a single space

    Examples
    --------
    >>> df = spark.createDataFrame([("SSparkSQLS", "SL", )], ['a', 'b'])
    >>> df.select(btrim(df.a, df.b).alias('r')).collect()
    [Row(r='parkSQ')]

    >>> df = spark.createDataFrame([("    SparkSQL   ",)], ['a'])
    >>> df.select(btrim(df.a).alias('r')).collect()
    [Row(r='SparkSQL')]
    """
    if trim is not None:
        return _invoke_function_over_columns("btrim", str, trim)
    else:
        return _invoke_function_over_columns("btrim", str)


@try_remote_functions
def char_length(str: "ColumnOrName") -> Column:
    """
    Returns the character length of string data or number of bytes of binary data.
    The length of string data includes the trailing spaces.
    The length of binary data includes binary zeros.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.char_length(sf.lit("SparkSQL"))).show()
    +---------------------+
    |char_length(SparkSQL)|
    +---------------------+
    |                    8|
    +---------------------+
    """
    return _invoke_function_over_columns("char_length", str)


@try_remote_functions
def character_length(str: "ColumnOrName") -> Column:
    """
    Returns the character length of string data or number of bytes of binary data.
    The length of string data includes the trailing spaces.
    The length of binary data includes binary zeros.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.character_length(sf.lit("SparkSQL"))).show()
    +--------------------------+
    |character_length(SparkSQL)|
    +--------------------------+
    |                         8|
    +--------------------------+
    """
    return _invoke_function_over_columns("character_length", str)


@try_remote_functions
def try_to_binary(col: "ColumnOrName", format: Optional["ColumnOrName"] = None) -> Column:
    """
    This is a special version of `to_binary` that performs the same operation, but returns a NULL
    value instead of raising an error if the conversion cannot be performed.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert binary values.

    Examples
    --------
    >>> df = spark.createDataFrame([("abc",)], ["e"])
    >>> df.select(try_to_binary(df.e, lit("utf-8")).alias('r')).collect()
    [Row(r=bytearray(b'abc'))]

    >>> df = spark.createDataFrame([("414243",)], ["e"])
    >>> df.select(try_to_binary(df.e).alias('r')).collect()
    [Row(r=bytearray(b'ABC'))]
    """
    if format is not None:
        return _invoke_function_over_columns("try_to_binary", col, format)
    else:
        return _invoke_function_over_columns("try_to_binary", col)


@try_remote_functions
def try_to_number(col: "ColumnOrName", format: "ColumnOrName") -> Column:
    """
    Convert string 'col' to a number based on the string format `format`. Returns NULL if the
    string 'col' does not match the expected format. The format follows the same semantics as the
    to_number function.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    format : :class:`~pyspark.sql.Column` or str, optional
        format to use to convert number values.

    Examples
    --------
    >>> df = spark.createDataFrame([("$78.12",)], ["e"])
    >>> df.select(try_to_number(df.e, lit("$99.99")).alias('r')).collect()
    [Row(r=Decimal('78.12'))]
    """
    return _invoke_function_over_columns("try_to_number", col, format)


@try_remote_functions
def contains(left: "ColumnOrName", right: "ColumnOrName") -> Column:
    """
    Returns a boolean. The value is True if right is found inside left.
    Returns NULL if either input expression is NULL. Otherwise, returns False.
    Both left or right must be of STRING or BINARY type.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
        The input column or strings to check, may be NULL.
    right : :class:`~pyspark.sql.Column` or str
        The input column or strings to find, may be NULL.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark SQL", "Spark")], ['a', 'b'])
    >>> df.select(contains(df.a, df.b).alias('r')).collect()
    [Row(r=True)]

    >>> df = spark.createDataFrame([("414243", "4243",)], ["c", "d"])
    >>> df = df.select(to_binary("c").alias("c"), to_binary("d").alias("d"))
    >>> df.printSchema()
    root
     |-- c: binary (nullable = true)
     |-- d: binary (nullable = true)
    >>> df.select(contains("c", "d"), contains("d", "c")).show()
    +--------------+--------------+
    |contains(c, d)|contains(d, c)|
    +--------------+--------------+
    |          true|         false|
    +--------------+--------------+
    """
    return _invoke_function_over_columns("contains", left, right)


@try_remote_functions
def elt(*inputs: "ColumnOrName") -> Column:
    """
    Returns the `n`-th input, e.g., returns `input2` when `n` is 2.
    The function returns NULL if the index exceeds the length of the array
    and `spark.sql.ansi.enabled` is set to false. If `spark.sql.ansi.enabled` is set to true,
    it throws ArrayIndexOutOfBoundsException for invalid indices.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    inputs : :class:`~pyspark.sql.Column` or str
        Input columns or strings.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, "scala", "java")], ['a', 'b', 'c'])
    >>> df.select(elt(df.a, df.b, df.c).alias('r')).collect()
    [Row(r='scala')]
    """
    sc = get_active_spark_context()
    return _invoke_function("elt", _to_seq(sc, inputs, _to_java_column))


@try_remote_functions
def find_in_set(str: "ColumnOrName", str_array: "ColumnOrName") -> Column:
    """
    Returns the index (1-based) of the given string (`str`) in the comma-delimited
    list (`strArray`). Returns 0, if the string was not found or if the given string (`str`)
    contains a comma.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        The given string to be found.
    str_array : :class:`~pyspark.sql.Column` or str
        The comma-delimited list.

    Examples
    --------
    >>> df = spark.createDataFrame([("ab", "abc,b,ab,c,def")], ['a', 'b'])
    >>> df.select(find_in_set(df.a, df.b).alias('r')).collect()
    [Row(r=3)]
    """
    return _invoke_function_over_columns("find_in_set", str, str_array)


@try_remote_functions
def like(
    str: "ColumnOrName", pattern: "ColumnOrName", escapeChar: Optional["Column"] = None
) -> Column:
    """
    Returns true if str matches `pattern` with `escape`,
    null if any arguments are null, false otherwise.
    The default escape character is the '\'.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        A string.
    pattern : :class:`~pyspark.sql.Column` or str
        A string. The pattern is a string which is matched literally, with
        exception to the following special symbols:
        _ matches any one character in the input (similar to . in posix regular expressions)
        % matches zero or more characters in the input (similar to .* in posix regular
        expressions)
        Since Spark 2.0, string literals are unescaped in our SQL parser. For example, in order
        to match "\abc", the pattern should be "\\abc".
        When SQL config 'spark.sql.parser.escapedStringLiterals' is enabled, it falls back
        to Spark 1.6 behavior regarding string literal parsing. For example, if the config is
        enabled, the pattern to match "\abc" should be "\abc".
    escape : :class:`~pyspark.sql.Column`
        An character added since Spark 3.0. The default escape character is the '\'.
        If an escape character precedes a special symbol or another escape character, the
        following character is matched literally. It is invalid to escape any other character.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark", "_park")], ['a', 'b'])
    >>> df.select(like(df.a, df.b).alias('r')).collect()
    [Row(r=True)]

    >>> df = spark.createDataFrame(
    ...     [("%SystemDrive%/Users/John", "/%SystemDrive/%//Users%")],
    ...     ['a', 'b']
    ... )
    >>> df.select(like(df.a, df.b, lit('/')).alias('r')).collect()
    [Row(r=True)]
    """
    if escapeChar is not None:
        return _invoke_function_over_columns("like", str, pattern, escapeChar)
    else:
        return _invoke_function_over_columns("like", str, pattern)


@try_remote_functions
def ilike(
    str: "ColumnOrName", pattern: "ColumnOrName", escapeChar: Optional["Column"] = None
) -> Column:
    """
    Returns true if str matches `pattern` with `escape` case-insensitively,
    null if any arguments are null, false otherwise.
    The default escape character is the '\'.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        A string.
    pattern : :class:`~pyspark.sql.Column` or str
        A string. The pattern is a string which is matched literally, with
        exception to the following special symbols:
        _ matches any one character in the input (similar to . in posix regular expressions)
        % matches zero or more characters in the input (similar to .* in posix regular
        expressions)
        Since Spark 2.0, string literals are unescaped in our SQL parser. For example, in order
        to match "\abc", the pattern should be "\\abc".
        When SQL config 'spark.sql.parser.escapedStringLiterals' is enabled, it falls back
        to Spark 1.6 behavior regarding string literal parsing. For example, if the config is
        enabled, the pattern to match "\abc" should be "\abc".
    escape : :class:`~pyspark.sql.Column`
        An character added since Spark 3.0. The default escape character is the '\'.
        If an escape character precedes a special symbol or another escape character, the
        following character is matched literally. It is invalid to escape any other character.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark", "_park")], ['a', 'b'])
    >>> df.select(ilike(df.a, df.b).alias('r')).collect()
    [Row(r=True)]

    >>> df = spark.createDataFrame(
    ...     [("%SystemDrive%/Users/John", "/%SystemDrive/%//Users%")],
    ...     ['a', 'b']
    ... )
    >>> df.select(ilike(df.a, df.b, lit('/')).alias('r')).collect()
    [Row(r=True)]
    """
    if escapeChar is not None:
        return _invoke_function_over_columns("ilike", str, pattern, escapeChar)
    else:
        return _invoke_function_over_columns("ilike", str, pattern)


@try_remote_functions
def lcase(str: "ColumnOrName") -> Column:
    """
    Returns `str` with all characters changed to lowercase.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.lcase(sf.lit("Spark"))).show()
    +------------+
    |lcase(Spark)|
    +------------+
    |       spark|
    +------------+
    """
    return _invoke_function_over_columns("lcase", str)


@try_remote_functions
def ucase(str: "ColumnOrName") -> Column:
    """
    Returns `str` with all characters changed to uppercase.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.ucase(sf.lit("Spark"))).show()
    +------------+
    |ucase(Spark)|
    +------------+
    |       SPARK|
    +------------+
    """
    return _invoke_function_over_columns("ucase", str)


@try_remote_functions
def left(str: "ColumnOrName", len: "ColumnOrName") -> Column:
    """
    Returns the leftmost `len`(`len` can be string type) characters from the string `str`,
    if `len` is less or equal than 0 the result is an empty string.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    len : :class:`~pyspark.sql.Column` or str
        Input column or strings, the leftmost `len`.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark SQL", 3,)], ['a', 'b'])
    >>> df.select(left(df.a, df.b).alias('r')).collect()
    [Row(r='Spa')]
    """
    return _invoke_function_over_columns("left", str, len)


@try_remote_functions
def right(str: "ColumnOrName", len: "ColumnOrName") -> Column:
    """
    Returns the rightmost `len`(`len` can be string type) characters from the string `str`,
    if `len` is less or equal than 0 the result is an empty string.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    str : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    len : :class:`~pyspark.sql.Column` or str
        Input column or strings, the rightmost `len`.

    Examples
    --------
    >>> df = spark.createDataFrame([("Spark SQL", 3,)], ['a', 'b'])
    >>> df.select(right(df.a, df.b).alias('r')).collect()
    [Row(r='SQL')]
    """
    return _invoke_function_over_columns("right", str, len)


@try_remote_functions
def mask(
    col: "ColumnOrName",
    upperChar: Optional["ColumnOrName"] = None,
    lowerChar: Optional["ColumnOrName"] = None,
    digitChar: Optional["ColumnOrName"] = None,
    otherChar: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Masks the given string value. This can be useful for creating copies of tables with sensitive
    information removed.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col: :class:`~pyspark.sql.Column` or str
        target column to compute on.
    upperChar: :class:`~pyspark.sql.Column` or str
        character to replace upper-case characters with. Specify NULL to retain original character.
    lowerChar: :class:`~pyspark.sql.Column` or str
        character to replace lower-case characters with. Specify NULL to retain original character.
    digitChar: :class:`~pyspark.sql.Column` or str
        character to replace digit characters with. Specify NULL to retain original character.
    otherChar: :class:`~pyspark.sql.Column` or str
        character to replace all other characters with. Specify NULL to retain original character.

    Returns
    -------
    :class:`~pyspark.sql.Column`

    Examples
    --------
    >>> df = spark.createDataFrame([("AbCD123-@$#",), ("abcd-EFGH-8765-4321",)], ['data'])
    >>> df.select(mask(df.data).alias('r')).collect()
    [Row(r='XxXXnnn-@$#'), Row(r='xxxx-XXXX-nnnn-nnnn')]
    >>> df.select(mask(df.data, lit('Y')).alias('r')).collect()
    [Row(r='YxYYnnn-@$#'), Row(r='xxxx-YYYY-nnnn-nnnn')]
    >>> df.select(mask(df.data, lit('Y'), lit('y')).alias('r')).collect()
    [Row(r='YyYYnnn-@$#'), Row(r='yyyy-YYYY-nnnn-nnnn')]
    >>> df.select(mask(df.data, lit('Y'), lit('y'), lit('d')).alias('r')).collect()
    [Row(r='YyYYddd-@$#'), Row(r='yyyy-YYYY-dddd-dddd')]
    >>> df.select(mask(df.data, lit('Y'), lit('y'), lit('d'), lit('*')).alias('r')).collect()
    [Row(r='YyYYddd****'), Row(r='yyyy*YYYY*dddd*dddd')]
    """

    _upperChar = lit("X") if upperChar is None else upperChar
    _lowerChar = lit("x") if lowerChar is None else lowerChar
    _digitChar = lit("n") if digitChar is None else digitChar
    _otherChar = lit(None) if otherChar is None else otherChar
    return _invoke_function_over_columns(
        "mask", col, _upperChar, _lowerChar, _digitChar, _otherChar
    )


# ---------------------- Collection functions ------------------------------


@overload
def create_map(*cols: "ColumnOrName") -> Column:
    ...


@overload
def create_map(__cols: Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]) -> Column:
    ...


@try_remote_functions
def create_map(
    *cols: Union["ColumnOrName", Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]]
) -> Column:
    """Creates a new map column.

    .. versionadded:: 2.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s that are
        grouped as key-value pairs, e.g. (key1, value1, key2, value2, ...).

    Examples
    --------
    >>> df = spark.createDataFrame([("Alice", 2), ("Bob", 5)], ("name", "age"))
    >>> df.select(create_map('name', 'age').alias("map")).collect()
    [Row(map={'Alice': 2}), Row(map={'Bob': 5})]
    >>> df.select(create_map([df.name, df.age]).alias("map")).collect()
    [Row(map={'Alice': 2}), Row(map={'Bob': 5})]
    """
    if len(cols) == 1 and isinstance(cols[0], (list, set)):
        cols = cols[0]  # type: ignore[assignment]
    return _invoke_function_over_seq_of_columns("map", cols)  # type: ignore[arg-type]


@try_remote_functions
def map_from_arrays(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """Creates a new map from two arrays.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        name of column containing a set of keys. All elements should not be null
    col2 : :class:`~pyspark.sql.Column` or str
        name of column containing a set of values

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of map type.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 5], ['a', 'b'])], ['k', 'v'])
    >>> df = df.select(map_from_arrays(df.k, df.v).alias("col"))
    >>> df.show()
    +----------------+
    |             col|
    +----------------+
    |{2 -> a, 5 -> b}|
    +----------------+
    >>> df.printSchema()
    root
     |-- col: map (nullable = true)
     |    |-- key: long
     |    |-- value: string (valueContainsNull = true)
    """
    return _invoke_function_over_columns("map_from_arrays", col1, col2)


@overload
def array(*cols: "ColumnOrName") -> Column:
    ...


@overload
def array(__cols: Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]) -> Column:
    ...


@try_remote_functions
def array(
    *cols: Union["ColumnOrName", Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]]
) -> Column:
    """Creates a new array column.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s that have
        the same data type.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of array type.

    Examples
    --------
    >>> df = spark.createDataFrame([("Alice", 2), ("Bob", 5)], ("name", "age"))
    >>> df.select(array('age', 'age').alias("arr")).collect()
    [Row(arr=[2, 2]), Row(arr=[5, 5])]
    >>> df.select(array([df.age, df.age]).alias("arr")).collect()
    [Row(arr=[2, 2]), Row(arr=[5, 5])]
    >>> df.select(array('age', 'age').alias("col")).printSchema()
    root
     |-- col: array (nullable = false)
     |    |-- element: long (containsNull = true)
    """
    if len(cols) == 1 and isinstance(cols[0], (list, set)):
        cols = cols[0]  # type: ignore[assignment]
    return _invoke_function_over_seq_of_columns("array", cols)  # type: ignore[arg-type]


@try_remote_functions
def array_contains(col: "ColumnOrName", value: Any) -> Column:
    """
    Collection function: returns null if the array is null, true if the array contains the
    given value, and false otherwise.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array
    value :
        value or column to check for in array

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of Boolean type.

    Examples
    --------
    >>> df = spark.createDataFrame([(["a", "b", "c"],), ([],)], ['data'])
    >>> df.select(array_contains(df.data, "a")).collect()
    [Row(array_contains(data, a)=True), Row(array_contains(data, a)=False)]
    >>> df.select(array_contains(df.data, lit("a"))).collect()
    [Row(array_contains(data, a)=True), Row(array_contains(data, a)=False)]
    """
    value = value._jc if isinstance(value, Column) else value
    return _invoke_function("array_contains", _to_java_column(col), value)


@try_remote_functions
def arrays_overlap(a1: "ColumnOrName", a2: "ColumnOrName") -> Column:
    """
    Collection function: returns true if the arrays contain any common non-null element; if not,
    returns null if both the arrays are non-empty and any of them contains a null element; returns
    false otherwise.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of Boolean type.

    Examples
    --------
    >>> df = spark.createDataFrame([(["a", "b"], ["b", "c"]), (["a"], ["b", "c"])], ['x', 'y'])
    >>> df.select(arrays_overlap(df.x, df.y).alias("overlap")).collect()
    [Row(overlap=True), Row(overlap=False)]
    """
    return _invoke_function_over_columns("arrays_overlap", a1, a2)


@try_remote_functions
def slice(
    x: "ColumnOrName", start: Union["ColumnOrName", int], length: Union["ColumnOrName", int]
) -> Column:
    """
    Collection function: returns an array containing all the elements in `x` from index `start`
    (array indices start at 1, or from the end if `start` is negative) with the specified `length`.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    x : :class:`~pyspark.sql.Column` or str
        column name or column containing the array to be sliced
    start : :class:`~pyspark.sql.Column` or str or int
        column name, column, or int containing the starting index
    length : :class:`~pyspark.sql.Column` or str or int
        column name, column, or int containing the length of the slice

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of array type. Subset of array.

    Examples
    --------
    >>> df = spark.createDataFrame([([1, 2, 3],), ([4, 5],)], ['x'])
    >>> df.select(slice(df.x, 2, 2).alias("sliced")).collect()
    [Row(sliced=[2, 3]), Row(sliced=[5])]
    """
    start = lit(start) if isinstance(start, int) else start
    length = lit(length) if isinstance(length, int) else length

    return _invoke_function_over_columns("slice", x, start, length)


@try_remote_functions
def array_join(
    col: "ColumnOrName", delimiter: str, null_replacement: Optional[str] = None
) -> Column:
    """
    Concatenates the elements of `column` using the `delimiter`. Null values are replaced with
    `null_replacement` if set, otherwise they are ignored.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    delimiter : str
        delimiter used to concatenate elements
    null_replacement : str, optional
        if set then null values will be replaced by this value

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of string type. Concatenated values.

    Examples
    --------
    >>> df = spark.createDataFrame([(["a", "b", "c"],), (["a", None],)], ['data'])
    >>> df.select(array_join(df.data, ",").alias("joined")).collect()
    [Row(joined='a,b,c'), Row(joined='a')]
    >>> df.select(array_join(df.data, ",", "NULL").alias("joined")).collect()
    [Row(joined='a,b,c'), Row(joined='a,NULL')]
    """
    get_active_spark_context()
    if null_replacement is None:
        return _invoke_function("array_join", _to_java_column(col), delimiter)
    else:
        return _invoke_function("array_join", _to_java_column(col), delimiter, null_replacement)


@try_remote_functions
def concat(*cols: "ColumnOrName") -> Column:
    """
    Concatenates multiple input columns together into a single column.
    The function works with strings, numeric, binary and compatible array columns.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        target column or columns to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        concatenated values. Type of the `Column` depends on input columns' type.

    See Also
    --------
    :meth:`pyspark.sql.functions.array_join` : to concatenate string columns with delimiter

    Examples
    --------
    >>> df = spark.createDataFrame([('abcd','123')], ['s', 'd'])
    >>> df = df.select(concat(df.s, df.d).alias('s'))
    >>> df.collect()
    [Row(s='abcd123')]
    >>> df
    DataFrame[s: string]

    >>> df = spark.createDataFrame([([1, 2], [3, 4], [5]), ([1, 2], None, [3])], ['a', 'b', 'c'])
    >>> df = df.select(concat(df.a, df.b, df.c).alias("arr"))
    >>> df.collect()
    [Row(arr=[1, 2, 3, 4, 5]), Row(arr=None)]
    >>> df
    DataFrame[arr: array<bigint>]
    """
    return _invoke_function_over_seq_of_columns("concat", cols)


@try_remote_functions
def array_position(col: "ColumnOrName", value: Any) -> Column:
    """
    Collection function: Locates the position of the first occurrence of the given value
    in the given array. Returns null if either of the arguments are null.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The position is not zero based, but 1 based index. Returns 0 if the given
    value could not be found in the array.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.
    value : Any
        value to look for.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        position of the value in the given array if found and 0 otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([(["c", "b", "a"],), ([],)], ['data'])
    >>> df.select(array_position(df.data, "a")).collect()
    [Row(array_position(data, a)=3), Row(array_position(data, a)=0)]
    """
    return _invoke_function("array_position", _to_java_column(col), value)


@try_remote_functions
def element_at(col: "ColumnOrName", extraction: Any) -> Column:
    """
    Collection function: Returns element of array at given index in `extraction` if col is array.
    Returns value for the given key in `extraction` if col is map. If position is negative
    then location of the element will start from end, if number is outside the
    array boundaries then None will be returned.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array or map
    extraction :
        index to check for in array or key to check for in map

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value at given position.

    Notes
    -----
    The position is not zero based, but 1 based index.

    See Also
    --------
    :meth:`get`

    Examples
    --------
    >>> df = spark.createDataFrame([(["a", "b", "c"],)], ['data'])
    >>> df.select(element_at(df.data, 1)).collect()
    [Row(element_at(data, 1)='a')]
    >>> df.select(element_at(df.data, -1)).collect()
    [Row(element_at(data, -1)='c')]

    >>> df = spark.createDataFrame([({"a": 1.0, "b": 2.0},)], ['data'])
    >>> df.select(element_at(df.data, lit("a"))).collect()
    [Row(element_at(data, a)=1.0)]
    """
    return _invoke_function_over_columns("element_at", col, lit(extraction))


@try_remote_functions
def try_element_at(col: "ColumnOrName", extraction: "ColumnOrName") -> Column:
    """
    (array, index) - Returns element of array at given (1-based) index. If Index is 0, Spark will
    throw an error. If index < 0, accesses elements from the last to the first. The function
    always returns NULL if the index exceeds the length of the array.

    (map, key) - Returns value for given key. The function always returns NULL if the key is not
    contained in the map.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array or map
    extraction :
        index to check for in array or key to check for in map

    Examples
    --------
    >>> df = spark.createDataFrame([(["a", "b", "c"],)], ['data'])
    >>> df.select(try_element_at(df.data, lit(1)).alias('r')).collect()
    [Row(r='a')]
    >>> df.select(try_element_at(df.data, lit(-1)).alias('r')).collect()
    [Row(r='c')]

    >>> df = spark.createDataFrame([({"a": 1.0, "b": 2.0},)], ['data'])
    >>> df.select(try_element_at(df.data, lit("a")).alias('r')).collect()
    [Row(r=1.0)]
    """
    return _invoke_function_over_columns("try_element_at", col, extraction)


@try_remote_functions
def get(col: "ColumnOrName", index: Union["ColumnOrName", int]) -> Column:
    """
    Collection function: Returns element of array at given (0-based) index.
    If the index points outside of the array boundaries, then this function
    returns NULL.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array
    index : :class:`~pyspark.sql.Column` or str or int
        index to check for in array

    Returns
    -------
    :class:`~pyspark.sql.Column`
        value at given position.

    Notes
    -----
    The position is not 1 based, but 0 based index.
    Supports Spark Connect.

    See Also
    --------
    :meth:`element_at`

    Examples
    --------
    >>> df = spark.createDataFrame([(["a", "b", "c"], 1)], ['data', 'index'])
    >>> df.select(get(df.data, 1)).show()
    +------------+
    |get(data, 1)|
    +------------+
    |           b|
    +------------+

    >>> df.select(get(df.data, -1)).show()
    +-------------+
    |get(data, -1)|
    +-------------+
    |         NULL|
    +-------------+

    >>> df.select(get(df.data, 3)).show()
    +------------+
    |get(data, 3)|
    +------------+
    |        NULL|
    +------------+

    >>> df.select(get(df.data, "index")).show()
    +----------------+
    |get(data, index)|
    +----------------+
    |               b|
    +----------------+

    >>> df.select(get(df.data, col("index") - 1)).show()
    +----------------------+
    |get(data, (index - 1))|
    +----------------------+
    |                     a|
    +----------------------+
    """
    index = lit(index) if isinstance(index, int) else index

    return _invoke_function_over_columns("get", col, index)


@try_remote_functions
def array_prepend(col: "ColumnOrName", value: Any) -> Column:
    """
    Collection function: Returns an array containing element as
    well as all elements from array. The new element is positioned
    at the beginning of the array.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array
    value :
        a literal value, or a :class:`~pyspark.sql.Column` expression.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array excluding given value.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 3, 4],), ([],)], ['data'])
    >>> df.select(array_prepend(df.data, 1)).collect()
    [Row(array_prepend(data, 1)=[1, 2, 3, 4]), Row(array_prepend(data, 1)=[1])]
    """
    return _invoke_function_over_columns("array_prepend", col, lit(value))


@try_remote_functions
def array_remove(col: "ColumnOrName", element: Any) -> Column:
    """
    Collection function: Remove all elements that equal to element from the given array.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array
    element :
        element to be removed from the array

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array excluding given value.

    Examples
    --------
    >>> df = spark.createDataFrame([([1, 2, 3, 1, 1],), ([],)], ['data'])
    >>> df.select(array_remove(df.data, 1)).collect()
    [Row(array_remove(data, 1)=[2, 3]), Row(array_remove(data, 1)=[])]
    """
    return _invoke_function("array_remove", _to_java_column(col), element)


@try_remote_functions
def array_distinct(col: "ColumnOrName") -> Column:
    """
    Collection function: removes duplicate values from the array.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of unique values.

    Examples
    --------
    >>> df = spark.createDataFrame([([1, 2, 3, 2],), ([4, 5, 5, 4],)], ['data'])
    >>> df.select(array_distinct(df.data)).collect()
    [Row(array_distinct(data)=[1, 2, 3]), Row(array_distinct(data)=[4, 5])]
    """
    return _invoke_function_over_columns("array_distinct", col)


@try_remote_functions
def array_insert(arr: "ColumnOrName", pos: Union["ColumnOrName", int], value: Any) -> Column:
    """
    Collection function: adds an item into a given array at a specified array index.
    Array indices start at 1, or start from the end if index is negative.
    Index above array size appends the array, or prepends the array if index is negative,
    with 'null' elements.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    arr : :class:`~pyspark.sql.Column` or str
        name of column containing an array
    pos : :class:`~pyspark.sql.Column` or str or int
        name of Numeric type column indicating position of insertion
        (starting at index 1, negative position is a start from the back of the array)
    value :
        a literal value, or a :class:`~pyspark.sql.Column` expression.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of values, including the new specified value

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [(['a', 'b', 'c'], 2, 'd'), (['c', 'b', 'a'], -2, 'd')],
    ...     ['data', 'pos', 'val']
    ... )
    >>> df.select(array_insert(df.data, df.pos.cast('integer'), df.val).alias('data')).collect()
    [Row(data=['a', 'd', 'b', 'c']), Row(data=['c', 'b', 'd', 'a'])]
    >>> df.select(array_insert(df.data, 5, 'hello').alias('data')).collect()
    [Row(data=['a', 'b', 'c', None, 'hello']), Row(data=['c', 'b', 'a', None, 'hello'])]
    """
    pos = lit(pos) if isinstance(pos, int) else pos

    return _invoke_function_over_columns("array_insert", arr, pos, lit(value))


@try_remote_functions
def array_intersect(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Collection function: returns an array of the elements in the intersection of col1 and col2,
    without duplicates.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        name of column containing array
    col2 : :class:`~pyspark.sql.Column` or str
        name of column containing array

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of values in the intersection of two arrays.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(c1=["b", "a", "c"], c2=["c", "d", "a", "f"])])
    >>> df.select(array_intersect(df.c1, df.c2)).collect()
    [Row(array_intersect(c1, c2)=['a', 'c'])]
    """
    return _invoke_function_over_columns("array_intersect", col1, col2)


@try_remote_functions
def array_union(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Collection function: returns an array of the elements in the union of col1 and col2,
    without duplicates.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        name of column containing array
    col2 : :class:`~pyspark.sql.Column` or str
        name of column containing array

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of values in union of two arrays.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(c1=["b", "a", "c"], c2=["c", "d", "a", "f"])])
    >>> df.select(array_union(df.c1, df.c2)).collect()
    [Row(array_union(c1, c2)=['b', 'a', 'c', 'd', 'f'])]
    """
    return _invoke_function_over_columns("array_union", col1, col2)


@try_remote_functions
def array_except(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Collection function: returns an array of the elements in col1 but not in col2,
    without duplicates.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        name of column containing array
    col2 : :class:`~pyspark.sql.Column` or str
        name of column containing array

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of values from first array that are not in the second.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(c1=["b", "a", "c"], c2=["c", "d", "a", "f"])])
    >>> df.select(array_except(df.c1, df.c2)).collect()
    [Row(array_except(c1, c2)=['b'])]
    """
    return _invoke_function_over_columns("array_except", col1, col2)


@try_remote_functions
def array_compact(col: "ColumnOrName") -> Column:
    """
    Collection function: removes null values from the array.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array by excluding the null values.

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> df = spark.createDataFrame([([1, None, 2, 3],), ([4, 5, None, 4],)], ['data'])
    >>> df.select(array_compact(df.data)).collect()
    [Row(array_compact(data)=[1, 2, 3]), Row(array_compact(data)=[4, 5, 4])]
    """
    return _invoke_function_over_columns("array_compact", col)


@try_remote_functions
def array_append(col: "ColumnOrName", value: Any) -> Column:
    """
    Collection function: returns an array of the elements in col1 along
    with the added element in col2 at the last of the array.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing array
    value :
        a literal value, or a :class:`~pyspark.sql.Column` expression.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of values from first array along with the element.

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(c1=["b", "a", "c"], c2="c")])
    >>> df.select(array_append(df.c1, df.c2)).collect()
    [Row(array_append(c1, c2)=['b', 'a', 'c', 'c'])]
    >>> df.select(array_append(df.c1, 'x')).collect()
    [Row(array_append(c1, x)=['b', 'a', 'c', 'x'])]
    """
    return _invoke_function_over_columns("array_append", col, lit(value))


@try_remote_functions
def explode(col: "ColumnOrName") -> Column:
    """
    Returns a new row for each element in the given array or map.
    Uses the default column name `col` for elements in the array and
    `key` and `value` for elements in the map unless specified otherwise.

    .. versionadded:: 1.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        one row per array item or map key value.

    See Also
    --------
    :meth:`pyspark.functions.posexplode`
    :meth:`pyspark.functions.explode_outer`
    :meth:`pyspark.functions.posexplode_outer`

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(a=1, intlist=[1,2,3], mapfield={"a": "b"})])
    >>> df.select(explode(df.intlist).alias("anInt")).collect()
    [Row(anInt=1), Row(anInt=2), Row(anInt=3)]

    >>> df.select(explode(df.mapfield).alias("key", "value")).show()
    +---+-----+
    |key|value|
    +---+-----+
    |  a|    b|
    +---+-----+
    """
    return _invoke_function_over_columns("explode", col)


@try_remote_functions
def posexplode(col: "ColumnOrName") -> Column:
    """
    Returns a new row for each element with position in the given array or map.
    Uses the default column name `pos` for position, and `col` for elements in the
    array and `key` and `value` for elements in the map unless specified otherwise.

    .. versionadded:: 2.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        one row per array item or map key value including positions as a separate column.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(a=1, intlist=[1,2,3], mapfield={"a": "b"})])
    >>> df.select(posexplode(df.intlist)).collect()
    [Row(pos=0, col=1), Row(pos=1, col=2), Row(pos=2, col=3)]

    >>> df.select(posexplode(df.mapfield)).show()
    +---+---+-----+
    |pos|key|value|
    +---+---+-----+
    |  0|  a|    b|
    +---+---+-----+
    """
    return _invoke_function_over_columns("posexplode", col)


@try_remote_functions
def inline(col: "ColumnOrName") -> Column:
    """
    Explodes an array of structs into a table.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column of values to explode.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        generator expression with the inline exploded result.

    See Also
    --------
    :meth:`explode`

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([Row(structlist=[Row(a=1, b=2), Row(a=3, b=4)])])
    >>> df.select(inline(df.structlist)).show()
    +---+---+
    |  a|  b|
    +---+---+
    |  1|  2|
    |  3|  4|
    +---+---+
    """
    return _invoke_function_over_columns("inline", col)


@try_remote_functions
def explode_outer(col: "ColumnOrName") -> Column:
    """
    Returns a new row for each element in the given array or map.
    Unlike explode, if the array/map is null or empty then null is produced.
    Uses the default column name `col` for elements in the array and
    `key` and `value` for elements in the map unless specified otherwise.

    .. versionadded:: 2.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        one row per array item or map key value.

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [(1, ["foo", "bar"], {"x": 1.0}), (2, [], {}), (3, None, None)],
    ...     ("id", "an_array", "a_map")
    ... )
    >>> df.select("id", "an_array", explode_outer("a_map")).show()
    +---+----------+----+-----+
    | id|  an_array| key|value|
    +---+----------+----+-----+
    |  1|[foo, bar]|   x|  1.0|
    |  2|        []|NULL| NULL|
    |  3|      NULL|NULL| NULL|
    +---+----------+----+-----+

    >>> df.select("id", "a_map", explode_outer("an_array")).show()
    +---+----------+----+
    | id|     a_map| col|
    +---+----------+----+
    |  1|{x -> 1.0}| foo|
    |  1|{x -> 1.0}| bar|
    |  2|        {}|NULL|
    |  3|      NULL|NULL|
    +---+----------+----+
    """
    return _invoke_function_over_columns("explode_outer", col)


@try_remote_functions
def posexplode_outer(col: "ColumnOrName") -> Column:
    """
    Returns a new row for each element with position in the given array or map.
    Unlike posexplode, if the array/map is null or empty then the row (null, null) is produced.
    Uses the default column name `pos` for position, and `col` for elements in the
    array and `key` and `value` for elements in the map unless specified otherwise.

    .. versionadded:: 2.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        one row per array item or map key value including positions as a separate column.

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [(1, ["foo", "bar"], {"x": 1.0}), (2, [], {}), (3, None, None)],
    ...     ("id", "an_array", "a_map")
    ... )
    >>> df.select("id", "an_array", posexplode_outer("a_map")).show()
    +---+----------+----+----+-----+
    | id|  an_array| pos| key|value|
    +---+----------+----+----+-----+
    |  1|[foo, bar]|   0|   x|  1.0|
    |  2|        []|NULL|NULL| NULL|
    |  3|      NULL|NULL|NULL| NULL|
    +---+----------+----+----+-----+
    >>> df.select("id", "a_map", posexplode_outer("an_array")).show()
    +---+----------+----+----+
    | id|     a_map| pos| col|
    +---+----------+----+----+
    |  1|{x -> 1.0}|   0| foo|
    |  1|{x -> 1.0}|   1| bar|
    |  2|        {}|NULL|NULL|
    |  3|      NULL|NULL|NULL|
    +---+----------+----+----+
    """
    return _invoke_function_over_columns("posexplode_outer", col)


@try_remote_functions
def inline_outer(col: "ColumnOrName") -> Column:
    """
    Explodes an array of structs into a table.
    Unlike inline, if the array is null or empty then null is produced for each nested column.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        input column of values to explode.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        generator expression with the inline exploded result.

    See Also
    --------
    :meth:`explode_outer`
    :meth:`inline`

    Notes
    -----
    Supports Spark Connect.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> df = spark.createDataFrame([
    ...     Row(id=1, structlist=[Row(a=1, b=2), Row(a=3, b=4)]),
    ...     Row(id=2, structlist=[])
    ... ])
    >>> df.select('id', inline_outer(df.structlist)).show()
    +---+----+----+
    | id|   a|   b|
    +---+----+----+
    |  1|   1|   2|
    |  1|   3|   4|
    |  2|NULL|NULL|
    +---+----+----+
    """
    return _invoke_function_over_columns("inline_outer", col)


@try_remote_functions
def get_json_object(col: "ColumnOrName", path: str) -> Column:
    """
    Extracts json object from a json string based on json `path` specified, and returns json string
    of the extracted json object. It will return null if the input json string is invalid.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        string column in json format
    path : str
        path to the json object to extract

    Returns
    -------
    :class:`~pyspark.sql.Column`
        string representation of given JSON object value.

    Examples
    --------
    >>> data = [("1", '''{"f1": "value1", "f2": "value2"}'''), ("2", '''{"f1": "value12"}''')]
    >>> df = spark.createDataFrame(data, ("key", "jstring"))
    >>> df.select(df.key, get_json_object(df.jstring, '$.f1').alias("c0"), \\
    ...                   get_json_object(df.jstring, '$.f2').alias("c1") ).collect()
    [Row(key='1', c0='value1', c1='value2'), Row(key='2', c0='value12', c1=None)]
    """
    return _invoke_function("get_json_object", _to_java_column(col), path)


@try_remote_functions
def json_tuple(col: "ColumnOrName", *fields: str) -> Column:
    """Creates a new row for a json column according to the given field names.

    .. versionadded:: 1.6.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        string column in json format
    fields : str
        a field or fields to extract

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a new row for each given field value from json object

    Examples
    --------
    >>> data = [("1", '''{"f1": "value1", "f2": "value2"}'''), ("2", '''{"f1": "value12"}''')]
    >>> df = spark.createDataFrame(data, ("key", "jstring"))
    >>> df.select(df.key, json_tuple(df.jstring, 'f1', 'f2')).collect()
    [Row(key='1', c0='value1', c1='value2'), Row(key='2', c0='value12', c1=None)]
    """
    sc = get_active_spark_context()
    return _invoke_function("json_tuple", _to_java_column(col), _to_seq(sc, fields))


@try_remote_functions
def from_json(
    col: "ColumnOrName",
    schema: Union[ArrayType, StructType, Column, str],
    options: Optional[Dict[str, str]] = None,
) -> Column:
    """
    Parses a column containing a JSON string into a :class:`MapType` with :class:`StringType`
    as keys type, :class:`StructType` or :class:`ArrayType` with
    the specified schema. Returns `null`, in the case of an unparseable string.

    .. versionadded:: 2.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        a column or column name in JSON format
    schema : :class:`DataType` or str
        a StructType, ArrayType of StructType or Python string literal with a DDL-formatted string
        to use when parsing the json column
    options : dict, optional
        options to control parsing. accepts the same options as the json datasource.
        See `Data Source Option <https://spark.apache.org/docs/latest/sql-data-sources-json.html#data-source-option>`_
        for the version you use.

        .. # noqa

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a new column of complex type from given JSON object.

    Examples
    --------
    >>> from pyspark.sql.types import *
    >>> data = [(1, '''{"a": 1}''')]
    >>> schema = StructType([StructField("a", IntegerType())])
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(from_json(df.value, schema).alias("json")).collect()
    [Row(json=Row(a=1))]
    >>> df.select(from_json(df.value, "a INT").alias("json")).collect()
    [Row(json=Row(a=1))]
    >>> df.select(from_json(df.value, "MAP<STRING,INT>").alias("json")).collect()
    [Row(json={'a': 1})]
    >>> data = [(1, '''[{"a": 1}]''')]
    >>> schema = ArrayType(StructType([StructField("a", IntegerType())]))
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(from_json(df.value, schema).alias("json")).collect()
    [Row(json=[Row(a=1)])]
    >>> schema = schema_of_json(lit('''{"a": 0}'''))
    >>> df.select(from_json(df.value, schema).alias("json")).collect()
    [Row(json=Row(a=None))]
    >>> data = [(1, '''[1, 2, 3]''')]
    >>> schema = ArrayType(IntegerType())
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(from_json(df.value, schema).alias("json")).collect()
    [Row(json=[1, 2, 3])]
    """

    if isinstance(schema, DataType):
        schema = schema.json()
    elif isinstance(schema, Column):
        schema = _to_java_column(schema)
    return _invoke_function("from_json", _to_java_column(col), schema, _options_to_str(options))


@try_remote_functions
def to_json(col: "ColumnOrName", options: Optional[Dict[str, str]] = None) -> Column:
    """
    Converts a column containing a :class:`StructType`, :class:`ArrayType` or a :class:`MapType`
    into a JSON string. Throws an exception, in the case of an unsupported type.

    .. versionadded:: 2.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing a struct, an array or a map.
    options : dict, optional
        options to control converting. accepts the same options as the JSON datasource.
        See `Data Source Option <https://spark.apache.org/docs/latest/sql-data-sources-json.html#data-source-option>`_
        for the version you use.
        Additionally the function supports the `pretty` option which enables
        pretty JSON generation.

        .. # noqa

    Returns
    -------
    :class:`~pyspark.sql.Column`
        JSON object as string column.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> from pyspark.sql.types import *
    >>> data = [(1, Row(age=2, name='Alice'))]
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(to_json(df.value).alias("json")).collect()
    [Row(json='{"age":2,"name":"Alice"}')]
    >>> data = [(1, [Row(age=2, name='Alice'), Row(age=3, name='Bob')])]
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(to_json(df.value).alias("json")).collect()
    [Row(json='[{"age":2,"name":"Alice"},{"age":3,"name":"Bob"}]')]
    >>> data = [(1, {"name": "Alice"})]
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(to_json(df.value).alias("json")).collect()
    [Row(json='{"name":"Alice"}')]
    >>> data = [(1, [{"name": "Alice"}, {"name": "Bob"}])]
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(to_json(df.value).alias("json")).collect()
    [Row(json='[{"name":"Alice"},{"name":"Bob"}]')]
    >>> data = [(1, ["Alice", "Bob"])]
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(to_json(df.value).alias("json")).collect()
    [Row(json='["Alice","Bob"]')]
    """

    return _invoke_function("to_json", _to_java_column(col), _options_to_str(options))


@try_remote_functions
def schema_of_json(json: "ColumnOrName", options: Optional[Dict[str, str]] = None) -> Column:
    """
    Parses a JSON string and infers its schema in DDL format.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    json : :class:`~pyspark.sql.Column` or str
        a JSON string or a foldable string column containing a JSON string.
    options : dict, optional
        options to control parsing. accepts the same options as the JSON datasource.
        See `Data Source Option <https://spark.apache.org/docs/latest/sql-data-sources-json.html#data-source-option>`_
        for the version you use.

        .. # noqa

        .. versionchanged:: 3.0.0
           It accepts `options` parameter to control schema inferring.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a string representation of a :class:`StructType` parsed from given JSON.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(schema_of_json(lit('{"a": 0}')).alias("json")).collect()
    [Row(json='STRUCT<a: BIGINT>')]
    >>> schema = schema_of_json('{a: 1}', {'allowUnquotedFieldNames':'true'})
    >>> df.select(schema.alias("json")).collect()
    [Row(json='STRUCT<a: BIGINT>')]
    """
    if isinstance(json, str):
        col = _create_column_from_literal(json)
    elif isinstance(json, Column):
        col = _to_java_column(json)
    else:
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_STR",
            message_parameters={"arg_name": "json", "arg_type": type(json).__name__},
        )

    return _invoke_function("schema_of_json", col, _options_to_str(options))


@try_remote_functions
def json_array_length(col: "ColumnOrName") -> Column:
    """
    Returns the number of elements in the outermost JSON array. `NULL` is returned in case of
    any other valid JSON string, `NULL` or an invalid JSON.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col: :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        length of json array.

    Examples
    --------
    >>> df = spark.createDataFrame([(None,), ('[1, 2, 3]',), ('[]',)], ['data'])
    >>> df.select(json_array_length(df.data).alias('r')).collect()
    [Row(r=None), Row(r=3), Row(r=0)]
    """
    return _invoke_function_over_columns("json_array_length", col)


@try_remote_functions
def json_object_keys(col: "ColumnOrName") -> Column:
    """
    Returns all the keys of the outermost JSON object as an array. If a valid JSON object is
    given, all the keys of the outermost object will be returned as an array. If it is any
    other valid JSON string, an invalid JSON string or an empty string, the function returns null.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col: :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        all the keys of the outermost JSON object.

    Examples
    --------
    >>> df = spark.createDataFrame([(None,), ('{}',), ('{"key1":1, "key2":2}',)], ['data'])
    >>> df.select(json_object_keys(df.data).alias('r')).collect()
    [Row(r=None), Row(r=[]), Row(r=['key1', 'key2'])]
    """
    return _invoke_function_over_columns("json_object_keys", col)


@try_remote_functions
def schema_of_csv(csv: "ColumnOrName", options: Optional[Dict[str, str]] = None) -> Column:
    """
    Parses a CSV string and infers its schema in DDL format.

    .. versionadded:: 3.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    csv : :class:`~pyspark.sql.Column` or str
        a CSV string or a foldable string column containing a CSV string.
    options : dict, optional
        options to control parsing. accepts the same options as the CSV datasource.
        See `Data Source Option <https://spark.apache.org/docs/latest/sql-data-sources-csv.html#data-source-option>`_
        for the version you use.

        .. # noqa

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a string representation of a :class:`StructType` parsed from given CSV.

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(schema_of_csv(lit('1|a'), {'sep':'|'}).alias("csv")).collect()
    [Row(csv='STRUCT<_c0: INT, _c1: STRING>')]
    >>> df.select(schema_of_csv('1|a', {'sep':'|'}).alias("csv")).collect()
    [Row(csv='STRUCT<_c0: INT, _c1: STRING>')]
    """
    if isinstance(csv, str):
        col = _create_column_from_literal(csv)
    elif isinstance(csv, Column):
        col = _to_java_column(csv)
    else:
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_STR",
            message_parameters={"arg_name": "csv", "arg_type": type(csv).__name__},
        )

    return _invoke_function("schema_of_csv", col, _options_to_str(options))


@try_remote_functions
def to_csv(col: "ColumnOrName", options: Optional[Dict[str, str]] = None) -> Column:
    """
    Converts a column containing a :class:`StructType` into a CSV string.
    Throws an exception, in the case of an unsupported type.

    .. versionadded:: 3.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column containing a struct.
    options: dict, optional
        options to control converting. accepts the same options as the CSV datasource.
        See `Data Source Option <https://spark.apache.org/docs/latest/sql-data-sources-csv.html#data-source-option>`_
        for the version you use.

        .. # noqa

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a CSV string converted from given :class:`StructType`.

    Examples
    --------
    >>> from pyspark.sql import Row
    >>> data = [(1, Row(age=2, name='Alice'))]
    >>> df = spark.createDataFrame(data, ("key", "value"))
    >>> df.select(to_csv(df.value).alias("csv")).collect()
    [Row(csv='2,Alice')]
    """

    return _invoke_function("to_csv", _to_java_column(col), _options_to_str(options))


@try_remote_functions
def size(col: "ColumnOrName") -> Column:
    """
    Collection function: returns the length of the array or map stored in the column.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        length of the array/map.

    Examples
    --------
    >>> df = spark.createDataFrame([([1, 2, 3],),([1],),([],)], ['data'])
    >>> df.select(size(df.data)).collect()
    [Row(size(data)=3), Row(size(data)=1), Row(size(data)=0)]
    """
    return _invoke_function_over_columns("size", col)


@try_remote_functions
def array_min(col: "ColumnOrName") -> Column:
    """
    Collection function: returns the minimum value of the array.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        minimum value of array.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 1, 3],), ([None, 10, -1],)], ['data'])
    >>> df.select(array_min(df.data).alias('min')).collect()
    [Row(min=1), Row(min=-1)]
    """
    return _invoke_function_over_columns("array_min", col)


@try_remote_functions
def array_max(col: "ColumnOrName") -> Column:
    """
    Collection function: returns the maximum value of the array.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        maximum value of an array.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 1, 3],), ([None, 10, -1],)], ['data'])
    >>> df.select(array_max(df.data).alias('max')).collect()
    [Row(max=3), Row(max=10)]
    """
    return _invoke_function_over_columns("array_max", col)


@try_remote_functions
def array_size(col: "ColumnOrName") -> Column:
    """
    Returns the total number of elements in the array. The function returns null for null input.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        total number of elements in the array.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 1, 3],), (None,)], ['data'])
    >>> df.select(array_size(df.data).alias('r')).collect()
    [Row(r=3), Row(r=None)]
    """
    return _invoke_function_over_columns("array_size", col)


@try_remote_functions
def cardinality(col: "ColumnOrName") -> Column:
    """
    Collection function: returns the length of the array or map stored in the column.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target column to compute on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        length of the array/map.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.createDataFrame(
    ...     [([1, 2, 3],),([1],),([],)], ['data']
    ... ).select(sf.cardinality("data")).show()
    +-----------------+
    |cardinality(data)|
    +-----------------+
    |                3|
    |                1|
    |                0|
    +-----------------+
    """
    return _invoke_function_over_columns("cardinality", col)


@try_remote_functions
def sort_array(col: "ColumnOrName", asc: bool = True) -> Column:
    """
    Collection function: sorts the input array in ascending or descending order according
    to the natural ordering of the array elements. Null elements will be placed at the beginning
    of the returned array in ascending order or at the end of the returned array in descending
    order.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    asc : bool, optional
        whether to sort in ascending or descending order. If `asc` is True (default)
        then ascending and if False then descending.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        sorted array.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 1, None, 3],),([1],),([],)], ['data'])
    >>> df.select(sort_array(df.data).alias('r')).collect()
    [Row(r=[None, 1, 2, 3]), Row(r=[1]), Row(r=[])]
    >>> df.select(sort_array(df.data, asc=False).alias('r')).collect()
    [Row(r=[3, 2, 1, None]), Row(r=[1]), Row(r=[])]
    """
    return _invoke_function("sort_array", _to_java_column(col), asc)


@try_remote_functions
def array_sort(
    col: "ColumnOrName", comparator: Optional[Callable[[Column, Column], Column]] = None
) -> Column:
    """
    Collection function: sorts the input array in ascending order. The elements of the input array
    must be orderable. Null elements will be placed at the end of the returned array.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Can take a `comparator` function.

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    comparator : callable, optional
        A binary ``(Column, Column) -> Column: ...``.
        The comparator will take two
        arguments representing two elements of the array. It returns a negative integer, 0, or a
        positive integer as the first element is less than, equal to, or greater than the second
        element. If the comparator function returns null, the function will fail and raise an error.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        sorted array.

    Examples
    --------
    >>> df = spark.createDataFrame([([2, 1, None, 3],),([1],),([],)], ['data'])
    >>> df.select(array_sort(df.data).alias('r')).collect()
    [Row(r=[1, 2, 3, None]), Row(r=[1]), Row(r=[])]
    >>> df = spark.createDataFrame([(["foo", "foobar", None, "bar"],),(["foo"],),([],)], ['data'])
    >>> df.select(array_sort(
    ...     "data",
    ...     lambda x, y: when(x.isNull() | y.isNull(), lit(0)).otherwise(length(y) - length(x))
    ... ).alias("r")).collect()
    [Row(r=['foobar', 'foo', None, 'bar']), Row(r=['foo']), Row(r=[])]
    """
    if comparator is None:
        return _invoke_function_over_columns("array_sort", col)
    else:
        return _invoke_higher_order_function("ArraySort", [col], [comparator])


@try_remote_functions
def shuffle(col: "ColumnOrName") -> Column:
    """
    Collection function: Generates a random permutation of the given array.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Notes
    -----
    The function is non-deterministic.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of elements in random order.

    Examples
    --------
    >>> df = spark.createDataFrame([([1, 20, 3, 5],), ([1, 20, None, 3],)], ['data'])
    >>> df.select(shuffle(df.data).alias('s')).collect()  # doctest: +SKIP
    [Row(s=[3, 1, 5, 20]), Row(s=[20, None, 3, 1])]
    """
    return _invoke_function_over_columns("shuffle", col)


@try_remote_functions
def reverse(col: "ColumnOrName") -> Column:
    """
    Collection function: returns a reversed string or an array with reverse order of elements.

    .. versionadded:: 1.5.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        array of elements in reverse order.

    Examples
    --------
    >>> df = spark.createDataFrame([('Spark SQL',)], ['data'])
    >>> df.select(reverse(df.data).alias('s')).collect()
    [Row(s='LQS krapS')]
    >>> df = spark.createDataFrame([([2, 1, 3],) ,([1],) ,([],)], ['data'])
    >>> df.select(reverse(df.data).alias('r')).collect()
    [Row(r=[3, 1, 2]), Row(r=[1]), Row(r=[])]
    """
    return _invoke_function_over_columns("reverse", col)


@try_remote_functions
def flatten(col: "ColumnOrName") -> Column:
    """
    Collection function: creates a single array from an array of arrays.
    If a structure of nested arrays is deeper than two levels,
    only one level of nesting is removed.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        flattened array.

    Examples
    --------
    >>> df = spark.createDataFrame([([[1, 2, 3], [4, 5], [6]],), ([None, [4, 5]],)], ['data'])
    >>> df.show(truncate=False)
    +------------------------+
    |data                    |
    +------------------------+
    |[[1, 2, 3], [4, 5], [6]]|
    |[NULL, [4, 5]]          |
    +------------------------+
    >>> df.select(flatten(df.data).alias('r')).show()
    +------------------+
    |                 r|
    +------------------+
    |[1, 2, 3, 4, 5, 6]|
    |              NULL|
    +------------------+
    """
    return _invoke_function_over_columns("flatten", col)


@try_remote_functions
def map_contains_key(col: "ColumnOrName", value: Any) -> Column:
    """
    Returns true if the map contains the key.

    .. versionadded:: 3.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    value :
        a literal value

    Returns
    -------
    :class:`~pyspark.sql.Column`
        True if key is in the map and False otherwise.

    Examples
    --------
    >>> from pyspark.sql.functions import map_contains_key
    >>> df = spark.sql("SELECT map(1, 'a', 2, 'b') as data")
    >>> df.select(map_contains_key("data", 1)).show()
    +---------------------------------+
    |array_contains(map_keys(data), 1)|
    +---------------------------------+
    |                             true|
    +---------------------------------+
    >>> df.select(map_contains_key("data", -1)).show()
    +----------------------------------+
    |array_contains(map_keys(data), -1)|
    +----------------------------------+
    |                             false|
    +----------------------------------+
    """
    return _invoke_function("map_contains_key", _to_java_column(col), value)


@try_remote_functions
def map_keys(col: "ColumnOrName") -> Column:
    """
    Collection function: Returns an unordered array containing the keys of the map.

    .. versionadded:: 2.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        keys of the map as an array.

    Examples
    --------
    >>> from pyspark.sql.functions import map_keys
    >>> df = spark.sql("SELECT map(1, 'a', 2, 'b') as data")
    >>> df.select(map_keys("data").alias("keys")).show()
    +------+
    |  keys|
    +------+
    |[1, 2]|
    +------+
    """
    return _invoke_function_over_columns("map_keys", col)


@try_remote_functions
def map_values(col: "ColumnOrName") -> Column:
    """
    Collection function: Returns an unordered array containing the values of the map.

    .. versionadded:: 2.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        values of the map as an array.

    Examples
    --------
    >>> from pyspark.sql.functions import map_values
    >>> df = spark.sql("SELECT map(1, 'a', 2, 'b') as data")
    >>> df.select(map_values("data").alias("values")).show()
    +------+
    |values|
    +------+
    |[a, b]|
    +------+
    """
    return _invoke_function_over_columns("map_values", col)


@try_remote_functions
def map_entries(col: "ColumnOrName") -> Column:
    """
    Collection function: Returns an unordered array of all entries in the given map.

    .. versionadded:: 3.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of key value pairs as a struct type

    Examples
    --------
    >>> from pyspark.sql.functions import map_entries
    >>> df = spark.sql("SELECT map(1, 'a', 2, 'b') as data")
    >>> df = df.select(map_entries("data").alias("entries"))
    >>> df.show()
    +----------------+
    |         entries|
    +----------------+
    |[{1, a}, {2, b}]|
    +----------------+
    >>> df.printSchema()
    root
     |-- entries: array (nullable = false)
     |    |-- element: struct (containsNull = false)
     |    |    |-- key: integer (nullable = false)
     |    |    |-- value: string (nullable = false)
    """
    return _invoke_function_over_columns("map_entries", col)


@try_remote_functions
def map_from_entries(col: "ColumnOrName") -> Column:
    """
    Collection function: Converts an array of entries (key value struct types) to a map
    of values.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a map created from the given array of entries.

    Examples
    --------
    >>> from pyspark.sql.functions import map_from_entries
    >>> df = spark.sql("SELECT array(struct(1, 'a'), struct(2, 'b')) as data")
    >>> df.select(map_from_entries("data").alias("map")).show()
    +----------------+
    |             map|
    +----------------+
    |{1 -> a, 2 -> b}|
    +----------------+
    """
    return _invoke_function_over_columns("map_from_entries", col)


@try_remote_functions
def array_repeat(col: "ColumnOrName", count: Union["ColumnOrName", int]) -> Column:
    """
    Collection function: creates an array containing a column repeated count times.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        column name or column that contains the element to be repeated
    count : :class:`~pyspark.sql.Column` or str or int
        column name, column, or int containing the number of times to repeat the first argument

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of repeated elements.

    Examples
    --------
    >>> df = spark.createDataFrame([('ab',)], ['data'])
    >>> df.select(array_repeat(df.data, 3).alias('r')).collect()
    [Row(r=['ab', 'ab', 'ab'])]
    """
    count = lit(count) if isinstance(count, int) else count

    return _invoke_function_over_columns("array_repeat", col, count)


@try_remote_functions
def arrays_zip(*cols: "ColumnOrName") -> Column:
    """
    Collection function: Returns a merged array of structs in which the N-th struct contains all
    N-th values of input arrays. If one of the arrays is shorter than others then
    resulting struct type value will be a `null` for missing elements.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        columns of arrays to be merged.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        merged array of entries.

    Examples
    --------
    >>> from pyspark.sql.functions import arrays_zip
    >>> df = spark.createDataFrame([([1, 2, 3], [2, 4, 6], [3, 6])], ['vals1', 'vals2', 'vals3'])
    >>> df = df.select(arrays_zip(df.vals1, df.vals2, df.vals3).alias('zipped'))
    >>> df.show(truncate=False)
    +------------------------------------+
    |zipped                              |
    +------------------------------------+
    |[{1, 2, 3}, {2, 4, 6}, {3, 6, NULL}]|
    +------------------------------------+
    >>> df.printSchema()
    root
     |-- zipped: array (nullable = true)
     |    |-- element: struct (containsNull = false)
     |    |    |-- vals1: long (nullable = true)
     |    |    |-- vals2: long (nullable = true)
     |    |    |-- vals3: long (nullable = true)
    """
    return _invoke_function_over_seq_of_columns("arrays_zip", cols)


@overload
def map_concat(*cols: "ColumnOrName") -> Column:
    ...


@overload
def map_concat(__cols: Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]) -> Column:
    ...


@try_remote_functions
def map_concat(
    *cols: Union["ColumnOrName", Union[List["ColumnOrName_"], Tuple["ColumnOrName_", ...]]]
) -> Column:
    """Returns the union of all the given maps.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a map of merged entries from other maps.

    Examples
    --------
    >>> from pyspark.sql.functions import map_concat
    >>> df = spark.sql("SELECT map(1, 'a', 2, 'b') as map1, map(3, 'c') as map2")
    >>> df.select(map_concat("map1", "map2").alias("map3")).show(truncate=False)
    +------------------------+
    |map3                    |
    +------------------------+
    |{1 -> a, 2 -> b, 3 -> c}|
    +------------------------+
    """
    if len(cols) == 1 and isinstance(cols[0], (list, set)):
        cols = cols[0]  # type: ignore[assignment]
    return _invoke_function_over_seq_of_columns("map_concat", cols)  # type: ignore[arg-type]


@try_remote_functions
def sequence(
    start: "ColumnOrName", stop: "ColumnOrName", step: Optional["ColumnOrName"] = None
) -> Column:
    """
    Generate a sequence of integers from `start` to `stop`, incrementing by `step`.
    If `step` is not set, incrementing by 1 if `start` is less than or equal to `stop`,
    otherwise -1.

    .. versionadded:: 2.4.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    start : :class:`~pyspark.sql.Column` or str
        starting value (inclusive)
    stop : :class:`~pyspark.sql.Column` or str
        last values (inclusive)
    step : :class:`~pyspark.sql.Column` or str, optional
        value to add to current to get next element (default is 1)

    Returns
    -------
    :class:`~pyspark.sql.Column`
        an array of sequence values

    Examples
    --------
    >>> df1 = spark.createDataFrame([(-2, 2)], ('C1', 'C2'))
    >>> df1.select(sequence('C1', 'C2').alias('r')).collect()
    [Row(r=[-2, -1, 0, 1, 2])]
    >>> df2 = spark.createDataFrame([(4, -4, -2)], ('C1', 'C2', 'C3'))
    >>> df2.select(sequence('C1', 'C2', 'C3').alias('r')).collect()
    [Row(r=[4, 2, 0, -2, -4])]
    """
    if step is None:
        return _invoke_function_over_columns("sequence", start, stop)
    else:
        return _invoke_function_over_columns("sequence", start, stop, step)


@try_remote_functions
def from_csv(
    col: "ColumnOrName",
    schema: Union[Column, str],
    options: Optional[Dict[str, str]] = None,
) -> Column:
    """
    Parses a column containing a CSV string to a row with the specified schema.
    Returns `null`, in the case of an unparseable string.

    .. versionadded:: 3.0.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        a column or column name in CSV format
    schema :class:`~pyspark.sql.Column` or str
        a column, or Python string literal with schema in DDL format, to use when parsing the CSV column.
    options : dict, optional
        options to control parsing. accepts the same options as the CSV datasource.
        See `Data Source Option <https://spark.apache.org/docs/latest/sql-data-sources-csv.html#data-source-option>`_
        for the version you use.

        .. # noqa

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a column of parsed CSV values

    Examples
    --------
    >>> data = [("1,2,3",)]
    >>> df = spark.createDataFrame(data, ("value",))
    >>> df.select(from_csv(df.value, "a INT, b INT, c INT").alias("csv")).collect()
    [Row(csv=Row(a=1, b=2, c=3))]
    >>> value = data[0][0]
    >>> df.select(from_csv(df.value, schema_of_csv(value)).alias("csv")).collect()
    [Row(csv=Row(_c0=1, _c1=2, _c2=3))]
    >>> data = [("   abc",)]
    >>> df = spark.createDataFrame(data, ("value",))
    >>> options = {'ignoreLeadingWhiteSpace': True}
    >>> df.select(from_csv(df.value, "s string", options).alias("csv")).collect()
    [Row(csv=Row(s='abc'))]
    """

    get_active_spark_context()
    if isinstance(schema, str):
        schema = _create_column_from_literal(schema)
    elif isinstance(schema, Column):
        schema = _to_java_column(schema)
    else:
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_STR",
            message_parameters={"arg_name": "schema", "arg_type": type(schema).__name__},
        )

    return _invoke_function("from_csv", _to_java_column(col), schema, _options_to_str(options))


def _unresolved_named_lambda_variable(*name_parts: Any) -> Column:
    """
    Create `o.a.s.sql.expressions.UnresolvedNamedLambdaVariable`,
    convert it to o.s.sql.Column and wrap in Python `Column`

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    name_parts : str
    """
    sc = get_active_spark_context()
    name_parts_seq = _to_seq(sc, name_parts)
    expressions = cast(JVMView, sc._jvm).org.apache.spark.sql.catalyst.expressions
    return Column(
        cast(JVMView, sc._jvm).Column(expressions.UnresolvedNamedLambdaVariable(name_parts_seq))
    )


def _get_lambda_parameters(f: Callable) -> ValuesView[inspect.Parameter]:
    signature = inspect.signature(f)
    parameters = signature.parameters.values()

    # We should exclude functions that use
    # variable args and keyword argnames
    # as well as keyword only args
    supported_parameter_types = {
        inspect.Parameter.POSITIONAL_OR_KEYWORD,
        inspect.Parameter.POSITIONAL_ONLY,
    }

    # Validate that
    # function arity is between 1 and 3
    if not (1 <= len(parameters) <= 3):
        raise PySparkValueError(
            error_class="WRONG_NUM_ARGS_FOR_HIGHER_ORDER_FUNCTION",
            message_parameters={"func_name": f.__name__, "num_args": str(len(parameters))},
        )

    # and all arguments can be used as positional
    if not all(p.kind in supported_parameter_types for p in parameters):
        raise PySparkValueError(
            error_class="UNSUPPORTED_PARAM_TYPE_FOR_HIGHER_ORDER_FUNCTION",
            message_parameters={"func_name": f.__name__},
        )

    return parameters


def _create_lambda(f: Callable) -> Callable:
    """
    Create `o.a.s.sql.expressions.LambdaFunction` corresponding
    to transformation described by f

    :param f: A Python of one of the following forms:
            - (Column) -> Column: ...
            - (Column, Column) -> Column: ...
            - (Column, Column, Column) -> Column: ...
    """
    parameters = _get_lambda_parameters(f)

    sc = get_active_spark_context()
    expressions = cast(JVMView, sc._jvm).org.apache.spark.sql.catalyst.expressions

    argnames = ["x", "y", "z"]
    args = [
        _unresolved_named_lambda_variable(
            expressions.UnresolvedNamedLambdaVariable.freshVarName(arg)
        )
        for arg in argnames[: len(parameters)]
    ]

    result = f(*args)

    if not isinstance(result, Column):
        raise PySparkValueError(
            error_class="HIGHER_ORDER_FUNCTION_SHOULD_RETURN_COLUMN",
            message_parameters={"func_name": f.__name__, "return_type": type(result).__name__},
        )

    jexpr = result._jc.expr()
    jargs = _to_seq(sc, [arg._jc.expr() for arg in args])

    return expressions.LambdaFunction(jexpr, jargs, False)


def _invoke_higher_order_function(
    name: str,
    cols: List["ColumnOrName"],
    funs: List[Callable],
) -> Column:
    """
    Invokes expression identified by name,
    (relative to ```org.apache.spark.sql.catalyst.expressions``)
    and wraps the result with Column (first Scala one, then Python).

    :param name: Name of the expression
    :param cols: a list of columns
    :param funs: a list of (*Column) -> Column functions.

    :return: a Column
    """
    sc = get_active_spark_context()
    expressions = cast(JVMView, sc._jvm).org.apache.spark.sql.catalyst.expressions
    expr = getattr(expressions, name)

    jcols = [_to_java_column(col).expr() for col in cols]
    jfuns = [_create_lambda(f) for f in funs]

    return Column(cast(JVMView, sc._jvm).Column(expr(*jcols + jfuns)))


@overload
def transform(col: "ColumnOrName", f: Callable[[Column], Column]) -> Column:
    ...


@overload
def transform(col: "ColumnOrName", f: Callable[[Column, Column], Column]) -> Column:
    ...


@try_remote_functions
def transform(
    col: "ColumnOrName",
    f: Union[Callable[[Column], Column], Callable[[Column, Column], Column]],
) -> Column:
    """
    Returns an array of elements after applying a transformation to each element in the input array.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        a function that is applied to each element of the input array.
        Can take one of the following forms:

        - Unary ``(x: Column) -> Column: ...``
        - Binary ``(x: Column, i: Column) -> Column...``, where the second argument is
            a 0-based index of the element.

        and can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a new array of transformed elements.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, [1, 2, 3, 4])], ("key", "values"))
    >>> df.select(transform("values", lambda x: x * 2).alias("doubled")).show()
    +------------+
    |     doubled|
    +------------+
    |[2, 4, 6, 8]|
    +------------+

    >>> def alternate(x, i):
    ...     return when(i % 2 == 0, x).otherwise(-x)
    ...
    >>> df.select(transform("values", alternate).alias("alternated")).show()
    +--------------+
    |    alternated|
    +--------------+
    |[1, -2, 3, -4]|
    +--------------+
    """
    return _invoke_higher_order_function("ArrayTransform", [col], [f])


@try_remote_functions
def exists(col: "ColumnOrName", f: Callable[[Column], Column]) -> Column:
    """
    Returns whether a predicate holds for one or more elements in the array.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        ``(x: Column) -> Column: ...``  returning the Boolean expression.
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        True if "any" element of an array evaluates to True when passed as an argument to
        given function and False otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, [1, 2, 3, 4]), (2, [3, -1, 0])],("key", "values"))
    >>> df.select(exists("values", lambda x: x < 0).alias("any_negative")).show()
    +------------+
    |any_negative|
    +------------+
    |       false|
    |        true|
    +------------+
    """
    return _invoke_higher_order_function("ArrayExists", [col], [f])


@try_remote_functions
def forall(col: "ColumnOrName", f: Callable[[Column], Column]) -> Column:
    """
    Returns whether a predicate holds for every element in the array.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        ``(x: Column) -> Column: ...``  returning the Boolean expression.
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        True if "all" elements of an array evaluates to True when passed as an argument to
        given function and False otherwise.

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [(1, ["bar"]), (2, ["foo", "bar"]), (3, ["foobar", "foo"])],
    ...     ("key", "values")
    ... )
    >>> df.select(forall("values", lambda x: x.rlike("foo")).alias("all_foo")).show()
    +-------+
    |all_foo|
    +-------+
    |  false|
    |  false|
    |   true|
    +-------+
    """
    return _invoke_higher_order_function("ArrayForAll", [col], [f])


@overload
def filter(col: "ColumnOrName", f: Callable[[Column], Column]) -> Column:
    ...


@overload
def filter(col: "ColumnOrName", f: Callable[[Column, Column], Column]) -> Column:
    ...


@try_remote_functions
def filter(
    col: "ColumnOrName",
    f: Union[Callable[[Column], Column], Callable[[Column, Column], Column]],
) -> Column:
    """
    Returns an array of elements for which a predicate holds in a given array.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        A function that returns the Boolean expression.
        Can take one of the following forms:

        - Unary ``(x: Column) -> Column: ...``
        - Binary ``(x: Column, i: Column) -> Column...``, where the second argument is
            a 0-based index of the element.

        and can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        filtered array of elements where given function evaluated to True
        when passed as an argument.

    Examples
    --------
    >>> df = spark.createDataFrame(
    ...     [(1, ["2018-09-20",  "2019-02-03", "2019-07-01", "2020-06-01"])],
    ...     ("key", "values")
    ... )
    >>> def after_second_quarter(x):
    ...     return month(to_date(x)) > 6
    ...
    >>> df.select(
    ...     filter("values", after_second_quarter).alias("after_second_quarter")
    ... ).show(truncate=False)
    +------------------------+
    |after_second_quarter    |
    +------------------------+
    |[2018-09-20, 2019-07-01]|
    +------------------------+
    """
    return _invoke_higher_order_function("ArrayFilter", [col], [f])


@try_remote_functions
def aggregate(
    col: "ColumnOrName",
    initialValue: "ColumnOrName",
    merge: Callable[[Column, Column], Column],
    finish: Optional[Callable[[Column], Column]] = None,
) -> Column:
    """
    Applies a binary operator to an initial state and all elements in the array,
    and reduces this to a single state. The final state is converted into the final result
    by applying a finish function.

    Both functions can use methods of :class:`~pyspark.sql.Column`, functions defined in
    :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
    Python ``UserDefinedFunctions`` are not supported
    (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    initialValue : :class:`~pyspark.sql.Column` or str
        initial value. Name of column or expression
    merge : function
        a binary function ``(acc: Column, x: Column) -> Column...`` returning expression
        of the same type as ``zero``
    finish : function
        an optional unary function ``(x: Column) -> Column: ...``
        used to convert accumulated value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        final value after aggregate function is applied.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, [20.0, 4.0, 2.0, 6.0, 10.0])], ("id", "values"))
    >>> df.select(aggregate("values", lit(0.0), lambda acc, x: acc + x).alias("sum")).show()
    +----+
    | sum|
    +----+
    |42.0|
    +----+

    >>> def merge(acc, x):
    ...     count = acc.count + 1
    ...     sum = acc.sum + x
    ...     return struct(count.alias("count"), sum.alias("sum"))
    ...
    >>> df.select(
    ...     aggregate(
    ...         "values",
    ...         struct(lit(0).alias("count"), lit(0.0).alias("sum")),
    ...         merge,
    ...         lambda acc: acc.sum / acc.count,
    ...     ).alias("mean")
    ... ).show()
    +----+
    |mean|
    +----+
    | 8.4|
    +----+
    """
    if finish is not None:
        return _invoke_higher_order_function("ArrayAggregate", [col, initialValue], [merge, finish])

    else:
        return _invoke_higher_order_function("ArrayAggregate", [col, initialValue], [merge])


@try_remote_functions
def reduce(
    col: "ColumnOrName",
    initialValue: "ColumnOrName",
    merge: Callable[[Column, Column], Column],
    finish: Optional[Callable[[Column], Column]] = None,
) -> Column:
    """
    Applies a binary operator to an initial state and all elements in the array,
    and reduces this to a single state. The final state is converted into the final result
    by applying a finish function.

    Both functions can use methods of :class:`~pyspark.sql.Column`, functions defined in
    :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
    Python ``UserDefinedFunctions`` are not supported
    (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    initialValue : :class:`~pyspark.sql.Column` or str
        initial value. Name of column or expression
    merge : function
        a binary function ``(acc: Column, x: Column) -> Column...`` returning expression
        of the same type as ``zero``
    finish : function
        an optional unary function ``(x: Column) -> Column: ...``
        used to convert accumulated value.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        final value after aggregate function is applied.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, [20.0, 4.0, 2.0, 6.0, 10.0])], ("id", "values"))
    >>> df.select(reduce("values", lit(0.0), lambda acc, x: acc + x).alias("sum")).show()
    +----+
    | sum|
    +----+
    |42.0|
    +----+

    >>> def merge(acc, x):
    ...     count = acc.count + 1
    ...     sum = acc.sum + x
    ...     return struct(count.alias("count"), sum.alias("sum"))
    ...
    >>> df.select(
    ...     reduce(
    ...         "values",
    ...         struct(lit(0).alias("count"), lit(0.0).alias("sum")),
    ...         merge,
    ...         lambda acc: acc.sum / acc.count,
    ...     ).alias("mean")
    ... ).show()
    +----+
    |mean|
    +----+
    | 8.4|
    +----+
    """
    if finish is not None:
        return _invoke_higher_order_function("ArrayAggregate", [col, initialValue], [merge, finish])

    else:
        return _invoke_higher_order_function("ArrayAggregate", [col, initialValue], [merge])


@try_remote_functions
def zip_with(
    left: "ColumnOrName",
    right: "ColumnOrName",
    f: Callable[[Column, Column], Column],
) -> Column:
    """
    Merge two given arrays, element-wise, into a single array using a function.
    If one array is shorter, nulls are appended at the end to match the length of the longer
    array, before applying the function.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    left : :class:`~pyspark.sql.Column` or str
        name of the first column or expression
    right : :class:`~pyspark.sql.Column` or str
        name of the second column or expression
    f : function
        a binary function ``(x1: Column, x2: Column) -> Column...``
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        array of calculated values derived by applying given function to each pair of arguments.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, [1, 3, 5, 8], [0, 2, 4, 6])], ("id", "xs", "ys"))
    >>> df.select(zip_with("xs", "ys", lambda x, y: x ** y).alias("powers")).show(truncate=False)
    +---------------------------+
    |powers                     |
    +---------------------------+
    |[1.0, 9.0, 625.0, 262144.0]|
    +---------------------------+

    >>> df = spark.createDataFrame([(1, ["foo", "bar"], [1, 2, 3])], ("id", "xs", "ys"))
    >>> df.select(zip_with("xs", "ys", lambda x, y: concat_ws("_", x, y)).alias("xs_ys")).show()
    +-----------------+
    |            xs_ys|
    +-----------------+
    |[foo_1, bar_2, 3]|
    +-----------------+
    """
    return _invoke_higher_order_function("ZipWith", [left, right], [f])


@try_remote_functions
def transform_keys(col: "ColumnOrName", f: Callable[[Column, Column], Column]) -> Column:
    """
    Applies a function to every key-value pair in a map and returns
    a map with the results of those applications as the new keys for the pairs.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        a binary function ``(k: Column, v: Column) -> Column...``
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a new map of enties where new keys were calculated by applying given function to
        each key value argument.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, {"foo": -2.0, "bar": 2.0})], ("id", "data"))
    >>> row = df.select(transform_keys(
    ...     "data", lambda k, _: upper(k)).alias("data_upper")
    ... ).head()
    >>> sorted(row["data_upper"].items())
    [('BAR', 2.0), ('FOO', -2.0)]
    """
    return _invoke_higher_order_function("TransformKeys", [col], [f])


@try_remote_functions
def transform_values(col: "ColumnOrName", f: Callable[[Column, Column], Column]) -> Column:
    """
    Applies a function to every key-value pair in a map and returns
    a map with the results of those applications as the new values for the pairs.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        a binary function ``(k: Column, v: Column) -> Column...``
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        a new map of enties where new values were calculated by applying given function to
        each key value argument.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, {"IT": 10.0, "SALES": 2.0, "OPS": 24.0})], ("id", "data"))
    >>> row = df.select(transform_values(
    ...     "data", lambda k, v: when(k.isin("IT", "OPS"), v + 10.0).otherwise(v)
    ... ).alias("new_data")).head()
    >>> sorted(row["new_data"].items())
    [('IT', 20.0), ('OPS', 34.0), ('SALES', 2.0)]
    """
    return _invoke_higher_order_function("TransformValues", [col], [f])


@try_remote_functions
def map_filter(col: "ColumnOrName", f: Callable[[Column, Column], Column]) -> Column:
    """
    Returns a map whose key-value pairs satisfy a predicate.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        name of column or expression
    f : function
        a binary function ``(k: Column, v: Column) -> Column...``
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        filtered map.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, {"foo": 42.0, "bar": 1.0, "baz": 32.0})], ("id", "data"))
    >>> row = df.select(map_filter(
    ...     "data", lambda _, v: v > 30.0).alias("data_filtered")
    ... ).head()
    >>> sorted(row["data_filtered"].items())
    [('baz', 32.0), ('foo', 42.0)]
    """
    return _invoke_higher_order_function("MapFilter", [col], [f])


@try_remote_functions
def map_zip_with(
    col1: "ColumnOrName",
    col2: "ColumnOrName",
    f: Callable[[Column, Column, Column], Column],
) -> Column:
    """
    Merge two given maps, key-wise into a single map using a function.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
        name of the first column or expression
    col2 : :class:`~pyspark.sql.Column` or str
        name of the second column or expression
    f : function
        a ternary function ``(k: Column, v1: Column, v2: Column) -> Column...``
        Can use methods of :class:`~pyspark.sql.Column`, functions defined in
        :py:mod:`pyspark.sql.functions` and Scala ``UserDefinedFunctions``.
        Python ``UserDefinedFunctions`` are not supported
        (`SPARK-27052 <https://issues.apache.org/jira/browse/SPARK-27052>`__).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        zipped map where entries are calculated by applying given function to each
        pair of arguments.

    Examples
    --------
    >>> df = spark.createDataFrame([
    ...     (1, {"IT": 24.0, "SALES": 12.00}, {"IT": 2.0, "SALES": 1.4})],
    ...     ("id", "base", "ratio")
    ... )
    >>> row = df.select(map_zip_with(
    ...     "base", "ratio", lambda k, v1, v2: round(v1 * v2, 2)).alias("updated_data")
    ... ).head()
    >>> sorted(row["updated_data"].items())
    [('IT', 48.0), ('SALES', 16.8)]
    """
    return _invoke_higher_order_function("MapZipWith", [col1, col2], [f])


@try_remote_functions
def str_to_map(
    text: "ColumnOrName",
    pairDelim: Optional["ColumnOrName"] = None,
    keyValueDelim: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Creates a map after splitting the text into key/value pairs using delimiters.
    Both `pairDelim` and `keyValueDelim` are treated as regular expressions.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    text : :class:`~pyspark.sql.Column` or str
        Input column or strings.
    pairDelim : :class:`~pyspark.sql.Column` or str, optional
        delimiter to use to split pair.
    keyValueDelim : :class:`~pyspark.sql.Column` or str, optional
        delimiter to use to split key/value.

    Examples
    --------
    >>> df = spark.createDataFrame([("a:1,b:2,c:3",)], ["e"])
    >>> df.select(str_to_map(df.e, lit(","), lit(":")).alias('r')).collect()
    [Row(r={'a': '1', 'b': '2', 'c': '3'})]

    >>> df = spark.createDataFrame([("a:1,b:2,c:3",)], ["e"])
    >>> df.select(str_to_map(df.e, lit(",")).alias('r')).collect()
    [Row(r={'a': '1', 'b': '2', 'c': '3'})]

    >>> df = spark.createDataFrame([("a:1,b:2,c:3",)], ["e"])
    >>> df.select(str_to_map(df.e).alias('r')).collect()
    [Row(r={'a': '1', 'b': '2', 'c': '3'})]
    """
    if pairDelim is None:
        pairDelim = lit(",")
    if keyValueDelim is None:
        keyValueDelim = lit(":")
    return _invoke_function_over_columns("str_to_map", text, pairDelim, keyValueDelim)


# ---------------------- Partition transform functions --------------------------------


@try_remote_functions
def years(col: "ColumnOrName") -> Column:
    """
    Partition transform function: A transform for timestamps and dates
    to partition data into years.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date or timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        data partitioned by years.

    Examples
    --------
    >>> df.writeTo("catalog.db.table").partitionedBy(  # doctest: +SKIP
    ...     years("ts")
    ... ).createOrReplace()

    Notes
    -----
    This function can be used only in combination with
    :py:meth:`~pyspark.sql.readwriter.DataFrameWriterV2.partitionedBy`
    method of the `DataFrameWriterV2`.

    """
    return _invoke_function_over_columns("years", col)


@try_remote_functions
def months(col: "ColumnOrName") -> Column:
    """
    Partition transform function: A transform for timestamps and dates
    to partition data into months.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date or timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        data partitioned by months.

    Examples
    --------
    >>> df.writeTo("catalog.db.table").partitionedBy(
    ...     months("ts")
    ... ).createOrReplace()  # doctest: +SKIP

    Notes
    -----
    This function can be used only in combination with
    :py:meth:`~pyspark.sql.readwriter.DataFrameWriterV2.partitionedBy`
    method of the `DataFrameWriterV2`.

    """
    return _invoke_function_over_columns("months", col)


@try_remote_functions
def days(col: "ColumnOrName") -> Column:
    """
    Partition transform function: A transform for timestamps and dates
    to partition data into days.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date or timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        data partitioned by days.

    Examples
    --------
    >>> df.writeTo("catalog.db.table").partitionedBy(  # doctest: +SKIP
    ...     days("ts")
    ... ).createOrReplace()

    Notes
    -----
    This function can be used only in combination with
    :py:meth:`~pyspark.sql.readwriter.DataFrameWriterV2.partitionedBy`
    method of the `DataFrameWriterV2`.

    """
    return _invoke_function_over_columns("days", col)


@try_remote_functions
def hours(col: "ColumnOrName") -> Column:
    """
    Partition transform function: A transform for timestamps
    to partition data into hours.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date or timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        data partitioned by hours.

    Examples
    --------
    >>> df.writeTo("catalog.db.table").partitionedBy(   # doctest: +SKIP
    ...     hours("ts")
    ... ).createOrReplace()

    Notes
    -----
    This function can be used only in combination with
    :py:meth:`~pyspark.sql.readwriter.DataFrameWriterV2.partitionedBy`
    method of the `DataFrameWriterV2`.

    """
    return _invoke_function_over_columns("hours", col)


@try_remote_functions
def convert_timezone(
    sourceTz: Optional[Column], targetTz: Column, sourceTs: "ColumnOrName"
) -> Column:
    """
    Converts the timestamp without time zone `sourceTs`
    from the `sourceTz` time zone to `targetTz`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    sourceTz : :class:`~pyspark.sql.Column`
        the time zone for the input timestamp. If it is missed,
        the current session time zone is used as the source time zone.
    targetTz : :class:`~pyspark.sql.Column`
        the time zone to which the input timestamp should be converted.
    sourceTs : :class:`~pyspark.sql.Column`
        a timestamp without time zone.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        timestamp for converted time zone.

    Examples
    --------
    >>> df = spark.createDataFrame([('2015-04-08',)], ['dt'])
    >>> df.select(convert_timezone(   # doctest: +SKIP
    ...     None, lit('Asia/Hong_Kong'), 'dt').alias('ts')
    ... ).show()
    +-------------------+
    |                 ts|
    +-------------------+
    |2015-04-08 00:00:00|
    +-------------------+
    >>> df.select(convert_timezone(
    ...     lit('America/Los_Angeles'), lit('Asia/Hong_Kong'), 'dt').alias('ts')
    ... ).show()
    +-------------------+
    |                 ts|
    +-------------------+
    |2015-04-08 15:00:00|
    +-------------------+
    """
    if sourceTz is None:
        return _invoke_function_over_columns("convert_timezone", targetTz, sourceTs)
    else:
        return _invoke_function_over_columns("convert_timezone", sourceTz, targetTz, sourceTs)


@try_remote_functions
def make_dt_interval(
    days: Optional["ColumnOrName"] = None,
    hours: Optional["ColumnOrName"] = None,
    mins: Optional["ColumnOrName"] = None,
    secs: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Make DayTimeIntervalType duration from days, hours, mins and secs.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    days : :class:`~pyspark.sql.Column` or str
        the number of days, positive or negative
    hours : :class:`~pyspark.sql.Column` or str
        the number of hours, positive or negative
    mins : :class:`~pyspark.sql.Column` or str
        the number of minutes, positive or negative
    secs : :class:`~pyspark.sql.Column` or str
        the number of seconds with the fractional part in microsecond precision.

    Examples
    --------
    >>> df = spark.createDataFrame([[1, 12, 30, 01.001001]],
    ...     ["day", "hour", "min", "sec"])
    >>> df.select(make_dt_interval(
    ...     df.day, df.hour, df.min, df.sec).alias('r')
    ... ).show(truncate=False)
    +------------------------------------------+
    |r                                         |
    +------------------------------------------+
    |INTERVAL '1 12:30:01.001001' DAY TO SECOND|
    +------------------------------------------+

    >>> df.select(make_dt_interval(
    ...     df.day, df.hour, df.min).alias('r')
    ... ).show(truncate=False)
    +-----------------------------------+
    |r                                  |
    +-----------------------------------+
    |INTERVAL '1 12:30:00' DAY TO SECOND|
    +-----------------------------------+

    >>> df.select(make_dt_interval(
    ...     df.day, df.hour).alias('r')
    ... ).show(truncate=False)
    +-----------------------------------+
    |r                                  |
    +-----------------------------------+
    |INTERVAL '1 12:00:00' DAY TO SECOND|
    +-----------------------------------+

    >>> df.select(make_dt_interval(df.day).alias('r')).show(truncate=False)
    +-----------------------------------+
    |r                                  |
    +-----------------------------------+
    |INTERVAL '1 00:00:00' DAY TO SECOND|
    +-----------------------------------+

    >>> df.select(make_dt_interval().alias('r')).show(truncate=False)
    +-----------------------------------+
    |r                                  |
    +-----------------------------------+
    |INTERVAL '0 00:00:00' DAY TO SECOND|
    +-----------------------------------+
    """
    _days = lit(0) if days is None else days
    _hours = lit(0) if hours is None else hours
    _mins = lit(0) if mins is None else mins
    _secs = lit(decimal.Decimal(0)) if secs is None else secs
    return _invoke_function_over_columns("make_dt_interval", _days, _hours, _mins, _secs)


@try_remote_functions
def make_interval(
    years: Optional["ColumnOrName"] = None,
    months: Optional["ColumnOrName"] = None,
    weeks: Optional["ColumnOrName"] = None,
    days: Optional["ColumnOrName"] = None,
    hours: Optional["ColumnOrName"] = None,
    mins: Optional["ColumnOrName"] = None,
    secs: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Make interval from years, months, weeks, days, hours, mins and secs.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    years : :class:`~pyspark.sql.Column` or str
        the number of years, positive or negative
    months : :class:`~pyspark.sql.Column` or str
        the number of months, positive or negative
    weeks : :class:`~pyspark.sql.Column` or str
        the number of weeks, positive or negative
    days : :class:`~pyspark.sql.Column` or str
        the number of days, positive or negative
    hours : :class:`~pyspark.sql.Column` or str
        the number of hours, positive or negative
    mins : :class:`~pyspark.sql.Column` or str
        the number of minutes, positive or negative
    secs : :class:`~pyspark.sql.Column` or str
        the number of seconds with the fractional part in microsecond precision.

    Examples
    --------
    >>> df = spark.createDataFrame([[100, 11, 1, 1, 12, 30, 01.001001]],
    ...     ["year", "month", "week", "day", "hour", "min", "sec"])
    >>> df.select(make_interval(
    ...     df.year, df.month, df.week, df.day, df.hour, df.min, df.sec).alias('r')
    ... ).show(truncate=False)
    +---------------------------------------------------------------+
    |r                                                              |
    +---------------------------------------------------------------+
    |100 years 11 months 8 days 12 hours 30 minutes 1.001001 seconds|
    +---------------------------------------------------------------+

    >>> df.select(make_interval(
    ...     df.year, df.month, df.week, df.day, df.hour, df.min).alias('r')
    ... ).show(truncate=False)
    +----------------------------------------------+
    |r                                             |
    +----------------------------------------------+
    |100 years 11 months 8 days 12 hours 30 minutes|
    +----------------------------------------------+

    >>> df.select(make_interval(
    ...     df.year, df.month, df.week, df.day, df.hour).alias('r')
    ... ).show(truncate=False)
    +-----------------------------------+
    |r                                  |
    +-----------------------------------+
    |100 years 11 months 8 days 12 hours|
    +-----------------------------------+

    >>> df.select(make_interval(
    ...     df.year, df.month, df.week, df.day).alias('r')
    ... ).show(truncate=False)
    +--------------------------+
    |r                         |
    +--------------------------+
    |100 years 11 months 8 days|
    +--------------------------+

    >>> df.select(make_interval(
    ...     df.year, df.month, df.week).alias('r')
    ... ).show(truncate=False)
    +--------------------------+
    |r                         |
    +--------------------------+
    |100 years 11 months 7 days|
    +--------------------------+

    >>> df.select(make_interval(df.year, df.month).alias('r')).show(truncate=False)
    +-------------------+
    |r                  |
    +-------------------+
    |100 years 11 months|
    +-------------------+

    >>> df.select(make_interval(df.year).alias('r')).show(truncate=False)
    +---------+
    |r        |
    +---------+
    |100 years|
    +---------+
    """
    _years = lit(0) if years is None else years
    _months = lit(0) if months is None else months
    _weeks = lit(0) if weeks is None else weeks
    _days = lit(0) if days is None else days
    _hours = lit(0) if hours is None else hours
    _mins = lit(0) if mins is None else mins
    _secs = lit(decimal.Decimal(0)) if secs is None else secs
    return _invoke_function_over_columns(
        "make_interval", _years, _months, _weeks, _days, _hours, _mins, _secs
    )


@try_remote_functions
def make_timestamp(
    years: "ColumnOrName",
    months: "ColumnOrName",
    days: "ColumnOrName",
    hours: "ColumnOrName",
    mins: "ColumnOrName",
    secs: "ColumnOrName",
    timezone: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Create timestamp from years, months, days, hours, mins, secs and timezone fields.
    The result data type is consistent with the value of configuration `spark.sql.timestampType`.
    If the configuration `spark.sql.ansi.enabled` is false, the function returns NULL
    on invalid inputs. Otherwise, it will throw an error instead.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    years : :class:`~pyspark.sql.Column` or str
        the year to represent, from 1 to 9999
    months : :class:`~pyspark.sql.Column` or str
        the month-of-year to represent, from 1 (January) to 12 (December)
    days : :class:`~pyspark.sql.Column` or str
        the day-of-month to represent, from 1 to 31
    hours : :class:`~pyspark.sql.Column` or str
        the hour-of-day to represent, from 0 to 23
    mins : :class:`~pyspark.sql.Column` or str
        the minute-of-hour to represent, from 0 to 59
    secs : :class:`~pyspark.sql.Column` or str
        the second-of-minute and its micro-fraction to represent, from 0 to 60.
        The value can be either an integer like 13 , or a fraction like 13.123.
        If the sec argument equals to 60, the seconds field is set
        to 0 and 1 minute is added to the final timestamp.
    timezone : :class:`~pyspark.sql.Column` or str
        the time zone identifier. For example, CET, UTC and etc.

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([[2014, 12, 28, 6, 30, 45.887, 'CET']],
    ...     ["year", "month", "day", "hour", "min", "sec", "timezone"])
    >>> df.select(make_timestamp(
    ...     df.year, df.month, df.day, df.hour, df.min, df.sec, df.timezone).alias('r')
    ... ).show(truncate=False)
    +-----------------------+
    |r                      |
    +-----------------------+
    |2014-12-27 21:30:45.887|
    +-----------------------+

    >>> df.select(make_timestamp(
    ...     df.year, df.month, df.day, df.hour, df.min, df.sec).alias('r')
    ... ).show(truncate=False)
    +-----------------------+
    |r                      |
    +-----------------------+
    |2014-12-28 06:30:45.887|
    +-----------------------+
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    if timezone is not None:
        return _invoke_function_over_columns(
            "make_timestamp", years, months, days, hours, mins, secs, timezone
        )
    else:
        return _invoke_function_over_columns(
            "make_timestamp", years, months, days, hours, mins, secs
        )


@try_remote_functions
def make_timestamp_ltz(
    years: "ColumnOrName",
    months: "ColumnOrName",
    days: "ColumnOrName",
    hours: "ColumnOrName",
    mins: "ColumnOrName",
    secs: "ColumnOrName",
    timezone: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Create the current timestamp with local time zone from years, months, days, hours, mins,
    secs and timezone fields. If the configuration `spark.sql.ansi.enabled` is false,
    the function returns NULL on invalid inputs. Otherwise, it will throw an error instead.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    years : :class:`~pyspark.sql.Column` or str
        the year to represent, from 1 to 9999
    months : :class:`~pyspark.sql.Column` or str
        the month-of-year to represent, from 1 (January) to 12 (December)
    days : :class:`~pyspark.sql.Column` or str
        the day-of-month to represent, from 1 to 31
    hours : :class:`~pyspark.sql.Column` or str
        the hour-of-day to represent, from 0 to 23
    mins : :class:`~pyspark.sql.Column` or str
        the minute-of-hour to represent, from 0 to 59
    secs : :class:`~pyspark.sql.Column` or str
        the second-of-minute and its micro-fraction to represent, from 0 to 60.
        The value can be either an integer like 13 , or a fraction like 13.123.
        If the sec argument equals to 60, the seconds field is set
        to 0 and 1 minute is added to the final timestamp.
    timezone : :class:`~pyspark.sql.Column` or str
        the time zone identifier. For example, CET, UTC and etc.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([[2014, 12, 28, 6, 30, 45.887, 'CET']],
    ...     ["year", "month", "day", "hour", "min", "sec", "timezone"])
    >>> df.select(sf.make_timestamp_ltz(
    ...     df.year, df.month, df.day, df.hour, df.min, df.sec, df.timezone)
    ... ).show(truncate=False)
    +--------------------------------------------------------------+
    |make_timestamp_ltz(year, month, day, hour, min, sec, timezone)|
    +--------------------------------------------------------------+
    |2014-12-27 21:30:45.887                                       |
    +--------------------------------------------------------------+

    >>> df.select(sf.make_timestamp_ltz(
    ...     df.year, df.month, df.day, df.hour, df.min, df.sec)
    ... ).show(truncate=False)
    +----------------------------------------------------+
    |make_timestamp_ltz(year, month, day, hour, min, sec)|
    +----------------------------------------------------+
    |2014-12-28 06:30:45.887                             |
    +----------------------------------------------------+
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    if timezone is not None:
        return _invoke_function_over_columns(
            "make_timestamp_ltz", years, months, days, hours, mins, secs, timezone
        )
    else:
        return _invoke_function_over_columns(
            "make_timestamp_ltz", years, months, days, hours, mins, secs
        )


@try_remote_functions
def make_timestamp_ntz(
    years: "ColumnOrName",
    months: "ColumnOrName",
    days: "ColumnOrName",
    hours: "ColumnOrName",
    mins: "ColumnOrName",
    secs: "ColumnOrName",
) -> Column:
    """
    Create local date-time from years, months, days, hours, mins, secs fields.
    If the configuration `spark.sql.ansi.enabled` is false, the function returns NULL
    on invalid inputs. Otherwise, it will throw an error instead.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    years : :class:`~pyspark.sql.Column` or str
        the year to represent, from 1 to 9999
    months : :class:`~pyspark.sql.Column` or str
        the month-of-year to represent, from 1 (January) to 12 (December)
    days : :class:`~pyspark.sql.Column` or str
        the day-of-month to represent, from 1 to 31
    hours : :class:`~pyspark.sql.Column` or str
        the hour-of-day to represent, from 0 to 23
    mins : :class:`~pyspark.sql.Column` or str
        the minute-of-hour to represent, from 0 to 59
    secs : :class:`~pyspark.sql.Column` or str
        the second-of-minute and its micro-fraction to represent, from 0 to 60.
        The value can be either an integer like 13 , or a fraction like 13.123.
        If the sec argument equals to 60, the seconds field is set
        to 0 and 1 minute is added to the final timestamp.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([[2014, 12, 28, 6, 30, 45.887]],
    ...     ["year", "month", "day", "hour", "min", "sec"])
    >>> df.select(sf.make_timestamp_ntz(
    ...     df.year, df.month, df.day, df.hour, df.min, df.sec)
    ... ).show(truncate=False)
    +----------------------------------------------------+
    |make_timestamp_ntz(year, month, day, hour, min, sec)|
    +----------------------------------------------------+
    |2014-12-28 06:30:45.887                             |
    +----------------------------------------------------+
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    return _invoke_function_over_columns(
        "make_timestamp_ntz", years, months, days, hours, mins, secs
    )


@try_remote_functions
def make_ym_interval(
    years: Optional["ColumnOrName"] = None,
    months: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Make year-month interval from years, months.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    years : :class:`~pyspark.sql.Column` or str
        the number of years, positive or negative
    months : :class:`~pyspark.sql.Column` or str
        the number of months, positive or negative

    Examples
    --------
    >>> spark.conf.set("spark.sql.session.timeZone", "America/Los_Angeles")
    >>> df = spark.createDataFrame([[2014, 12]], ["year", "month"])
    >>> df.select(make_ym_interval(df.year, df.month).alias('r')).show(truncate=False)
    +-------------------------------+
    |r                              |
    +-------------------------------+
    |INTERVAL '2015-0' YEAR TO MONTH|
    +-------------------------------+
    >>> spark.conf.unset("spark.sql.session.timeZone")
    """
    _years = lit(0) if years is None else years
    _months = lit(0) if months is None else months
    return _invoke_function_over_columns("make_ym_interval", _years, _months)


@try_remote_functions
def bucket(numBuckets: Union[Column, int], col: "ColumnOrName") -> Column:
    """
    Partition transform function: A transform for any type that partitions
    by a hash of the input column.

    .. versionadded:: 3.1.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Examples
    --------
    >>> df.writeTo("catalog.db.table").partitionedBy(  # doctest: +SKIP
    ...     bucket(42, "ts")
    ... ).createOrReplace()

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        target date or timestamp column to work on.

    Returns
    -------
    :class:`~pyspark.sql.Column`
        data partitioned by given columns.

    Notes
    -----
    This function can be used only in combination with
    :py:meth:`~pyspark.sql.readwriter.DataFrameWriterV2.partitionedBy`
    method of the `DataFrameWriterV2`.

    """
    if not isinstance(numBuckets, (int, Column)):
        raise PySparkTypeError(
            error_class="NOT_COLUMN_OR_INT",
            message_parameters={"arg_name": "numBuckets", "arg_type": type(numBuckets).__name__},
        )

    get_active_spark_context()
    numBuckets = (
        _create_column_from_literal(numBuckets)
        if isinstance(numBuckets, int)
        else _to_java_column(numBuckets)
    )
    return _invoke_function("bucket", numBuckets, _to_java_column(col))


@try_remote_functions
def call_udf(udfName: str, *cols: "ColumnOrName") -> Column:
    """
    Call an user-defined function.

    .. versionadded:: 3.4.0

    Parameters
    ----------
    udfName : str
        name of the user defined function (UDF)
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s to be used in the UDF

    Returns
    -------
    :class:`~pyspark.sql.Column`
        result of executed udf.

    Examples
    --------
    >>> from pyspark.sql.functions import call_udf, col
    >>> from pyspark.sql.types import IntegerType, StringType
    >>> df = spark.createDataFrame([(1, "a"),(2, "b"), (3, "c")],["id", "name"])
    >>> _ = spark.udf.register("intX2", lambda i: i * 2, IntegerType())
    >>> df.select(call_udf("intX2", "id")).show()
    +---------+
    |intX2(id)|
    +---------+
    |        2|
    |        4|
    |        6|
    +---------+
    >>> _ = spark.udf.register("strX2", lambda s: s * 2, StringType())
    >>> df.select(call_udf("strX2", col("name"))).show()
    +-----------+
    |strX2(name)|
    +-----------+
    |         aa|
    |         bb|
    |         cc|
    +-----------+
    """
    sc = get_active_spark_context()
    return _invoke_function("call_udf", udfName, _to_seq(sc, cols, _to_java_column))


@try_remote_functions
def call_function(funcName: str, *cols: "ColumnOrName") -> Column:
    """
    Call a SQL function.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    funcName : str
        function name that follows the SQL identifier syntax (can be quoted, can be qualified)
    cols : :class:`~pyspark.sql.Column` or str
        column names or :class:`~pyspark.sql.Column`\\s to be used in the function

    Returns
    -------
    :class:`~pyspark.sql.Column`
        result of executed function.

    Examples
    --------
    >>> from pyspark.sql.functions import call_udf, col
    >>> from pyspark.sql.types import IntegerType, StringType
    >>> df = spark.createDataFrame([(1, "a"),(2, "b"), (3, "c")],["id", "name"])
    >>> _ = spark.udf.register("intX2", lambda i: i * 2, IntegerType())
    >>> df.select(call_function("intX2", "id")).show()
    +---------+
    |intX2(id)|
    +---------+
    |        2|
    |        4|
    |        6|
    +---------+
    >>> _ = spark.udf.register("strX2", lambda s: s * 2, StringType())
    >>> df.select(call_function("strX2", col("name"))).show()
    +-----------+
    |strX2(name)|
    +-----------+
    |         aa|
    |         bb|
    |         cc|
    +-----------+
    >>> df.select(call_function("avg", col("id"))).show()
    +-------+
    |avg(id)|
    +-------+
    |    2.0|
    +-------+
    >>> _ = spark.sql("CREATE FUNCTION custom_avg AS 'test.org.apache.spark.sql.MyDoubleAvg'")
    ... # doctest: +SKIP
    >>> df.select(call_function("custom_avg", col("id"))).show()
    ... # doctest: +SKIP
    +------------------------------------+
    |spark_catalog.default.custom_avg(id)|
    +------------------------------------+
    |                               102.0|
    +------------------------------------+
    >>> df.select(call_function("spark_catalog.default.custom_avg", col("id"))).show()
    ... # doctest: +SKIP
    +------------------------------------+
    |spark_catalog.default.custom_avg(id)|
    +------------------------------------+
    |                               102.0|
    +------------------------------------+
    """
    sc = get_active_spark_context()
    return _invoke_function("call_function", funcName, _to_seq(sc, cols, _to_java_column))


@try_remote_functions
def unwrap_udt(col: "ColumnOrName") -> Column:
    """
    Unwrap UDT data type column into its underlying type.

    .. versionadded:: 3.4.0

    Notes
    -----
    Supports Spark Connect.
    """
    return _invoke_function("unwrap_udt", _to_java_column(col))


@try_remote_functions
def hll_sketch_agg(col: "ColumnOrName", lgConfigK: Optional[Union[int, Column]] = None) -> Column:
    """
    Aggregate function: returns the updatable binary representation of the Datasketches
    HllSketch configured with lgConfigK arg.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str or int
    lgConfigK : int, optional
        The log-base-2 of K, where K is the number of buckets or slots for the HllSketch

    Returns
    -------
    :class:`~pyspark.sql.Column`
        The binary representation of the HllSketch.

    Examples
    --------
    >>> df = spark.createDataFrame([1,2,2,3], "INT")
    >>> df1 = df.agg(hll_sketch_estimate(hll_sketch_agg("value")).alias("distinct_cnt"))
    >>> df1.show()
    +------------+
    |distinct_cnt|
    +------------+
    |           3|
    +------------+
    >>> df2 = df.agg(hll_sketch_estimate(
    ...     hll_sketch_agg("value", lit(12))
    ... ).alias("distinct_cnt"))
    >>> df2.show()
    +------------+
    |distinct_cnt|
    +------------+
    |           3|
    +------------+
    >>> df3 = df.agg(hll_sketch_estimate(
    ...     hll_sketch_agg(col("value"), lit(12))).alias("distinct_cnt"))
    >>> df3.show()
    +------------+
    |distinct_cnt|
    +------------+
    |           3|
    +------------+
    """
    if lgConfigK is None:
        return _invoke_function_over_columns("hll_sketch_agg", col)
    else:
        _lgConfigK = lit(lgConfigK) if isinstance(lgConfigK, int) else lgConfigK
        return _invoke_function_over_columns("hll_sketch_agg", col, _lgConfigK)


@try_remote_functions
def hll_union_agg(
    col: "ColumnOrName", allowDifferentLgConfigK: Optional[Union[bool, Column]] = None
) -> Column:
    """
    Aggregate function: returns the updatable binary representation of the Datasketches
    HllSketch, generated by merging previously created Datasketches HllSketch instances
    via a Datasketches Union instance. Throws an exception if sketches have different
    lgConfigK values and allowDifferentLgConfigK is unset or set to false.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str or bool
    allowDifferentLgConfigK : bool, optional
        Allow sketches with different lgConfigK values to be merged (defaults to false).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        The binary representation of the merged HllSketch.

    Examples
    --------
    >>> df1 = spark.createDataFrame([1,2,2,3], "INT")
    >>> df1 = df1.agg(hll_sketch_agg("value").alias("sketch"))
    >>> df2 = spark.createDataFrame([4,5,5,6], "INT")
    >>> df2 = df2.agg(hll_sketch_agg("value").alias("sketch"))
    >>> df3 = df1.union(df2).agg(hll_sketch_estimate(
    ...     hll_union_agg("sketch")
    ... ).alias("distinct_cnt"))
    >>> df3.drop("sketch").show()
    +------------+
    |distinct_cnt|
    +------------+
    |           6|
    +------------+
    >>> df4 = df1.union(df2).agg(hll_sketch_estimate(
    ...     hll_union_agg("sketch", lit(False))
    ... ).alias("distinct_cnt"))
    >>> df4.drop("sketch").show()
    +------------+
    |distinct_cnt|
    +------------+
    |           6|
    +------------+
    >>> df5 = df1.union(df2).agg(hll_sketch_estimate(
    ...     hll_union_agg(col("sketch"), lit(False))
    ... ).alias("distinct_cnt"))
    >>> df5.drop("sketch").show()
    +------------+
    |distinct_cnt|
    +------------+
    |           6|
    +------------+
    """
    if allowDifferentLgConfigK is None:
        return _invoke_function_over_columns("hll_union_agg", col)
    else:
        _allowDifferentLgConfigK = (
            lit(allowDifferentLgConfigK)
            if isinstance(allowDifferentLgConfigK, bool)
            else allowDifferentLgConfigK
        )
        return _invoke_function_over_columns("hll_union_agg", col, _allowDifferentLgConfigK)


@try_remote_functions
def hll_sketch_estimate(col: "ColumnOrName") -> Column:
    """
    Returns the estimated number of unique values given the binary representation
    of a Datasketches HllSketch.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str

    Returns
    -------
    :class:`~pyspark.sql.Column`
        The estimated number of unique values for the HllSketch.

    Examples
    --------
    >>> df = spark.createDataFrame([1,2,2,3], "INT")
    >>> df = df.agg(hll_sketch_estimate(hll_sketch_agg("value")).alias("distinct_cnt"))
    >>> df.show()
    +------------+
    |distinct_cnt|
    +------------+
    |           3|
    +------------+
    """
    return _invoke_function("hll_sketch_estimate", _to_java_column(col))


@try_remote_functions
def hll_union(
    col1: "ColumnOrName", col2: "ColumnOrName", allowDifferentLgConfigK: Optional[bool] = None
) -> Column:
    """
    Merges two binary representations of Datasketches HllSketch objects, using a
    Datasketches Union object.  Throws an exception if sketches have different
    lgConfigK values and allowDifferentLgConfigK is unset or set to false.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
    col2 : :class:`~pyspark.sql.Column` or str
    allowDifferentLgConfigK : bool, optional
        Allow sketches with different lgConfigK values to be merged (defaults to false).

    Returns
    -------
    :class:`~pyspark.sql.Column`
        The binary representation of the merged HllSketch.

    Examples
    --------
    >>> df = spark.createDataFrame([(1,4),(2,5),(2,5),(3,6)], "struct<v1:int,v2:int>")
    >>> df = df.agg(hll_sketch_agg("v1").alias("sketch1"), hll_sketch_agg("v2").alias("sketch2"))
    >>> df = df.withColumn("distinct_cnt", hll_sketch_estimate(hll_union("sketch1", "sketch2")))
    >>> df.drop("sketch1", "sketch2").show()
    +------------+
    |distinct_cnt|
    +------------+
    |           6|
    +------------+
    """
    if allowDifferentLgConfigK is not None:
        return _invoke_function(
            "hll_union", _to_java_column(col1), _to_java_column(col2), allowDifferentLgConfigK
        )
    else:
        return _invoke_function("hll_union", _to_java_column(col1), _to_java_column(col2))


# ---------------------- Predicates functions ------------------------------


@try_remote_functions
def ifnull(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Returns `col2` if `col1` is null, or `col1` otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
    col2 : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> df = spark.createDataFrame([(None,), (1,)], ["e"])
    >>> df.select(sf.ifnull(df.e, sf.lit(8))).show()
    +------------+
    |ifnull(e, 8)|
    +------------+
    |           8|
    |           1|
    +------------+
    """
    return _invoke_function_over_columns("ifnull", col1, col2)


@try_remote_functions
def isnotnull(col: "ColumnOrName") -> Column:
    """
    Returns true if `col` is not null, or false otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(None,), (1,)], ["e"])
    >>> df.select(isnotnull(df.e).alias('r')).collect()
    [Row(r=False), Row(r=True)]
    """
    return _invoke_function_over_columns("isnotnull", col)


@try_remote_functions
def equal_null(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Returns same result as the EQUAL(=) operator for non-null operands,
    but returns true if both are null, false if one of the them is null.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
    col2 : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(None, None,), (1, 9,)], ["a", "b"])
    >>> df.select(equal_null(df.a, df.b).alias('r')).collect()
    [Row(r=True), Row(r=False)]
    """
    return _invoke_function_over_columns("equal_null", col1, col2)


@try_remote_functions
def nullif(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Returns null if `col1` equals to `col2`, or `col1` otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
    col2 : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(None, None,), (1, 9,)], ["a", "b"])
    >>> df.select(nullif(df.a, df.b).alias('r')).collect()
    [Row(r=None), Row(r=1)]
    """
    return _invoke_function_over_columns("nullif", col1, col2)


@try_remote_functions
def nvl(col1: "ColumnOrName", col2: "ColumnOrName") -> Column:
    """
    Returns `col2` if `col1` is null, or `col1` otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
    col2 : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(None, 8,), (1, 9,)], ["a", "b"])
    >>> df.select(nvl(df.a, df.b).alias('r')).collect()
    [Row(r=8), Row(r=1)]
    """
    return _invoke_function_over_columns("nvl", col1, col2)


@try_remote_functions
def nvl2(col1: "ColumnOrName", col2: "ColumnOrName", col3: "ColumnOrName") -> Column:
    """
    Returns `col2` if `col1` is not null, or `col3` otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col1 : :class:`~pyspark.sql.Column` or str
    col2 : :class:`~pyspark.sql.Column` or str
    col3 : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(None, 8, 6,), (1, 9, 9,)], ["a", "b", "c"])
    >>> df.select(nvl2(df.a, df.b, df.c).alias('r')).collect()
    [Row(r=6), Row(r=9)]
    """
    return _invoke_function_over_columns("nvl2", col1, col2, col3)


@try_remote_functions
def aes_encrypt(
    input: "ColumnOrName",
    key: "ColumnOrName",
    mode: Optional["ColumnOrName"] = None,
    padding: Optional["ColumnOrName"] = None,
    iv: Optional["ColumnOrName"] = None,
    aad: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Returns an encrypted value of `input` using AES in given `mode` with the specified `padding`.
    Key lengths of 16, 24 and 32 bits are supported. Supported combinations of (`mode`,
    `padding`) are ('ECB', 'PKCS'), ('GCM', 'NONE') and ('CBC', 'PKCS'). Optional initialization
    vectors (IVs) are only supported for CBC and GCM modes. These must be 16 bytes for CBC and 12
    bytes for GCM. If not provided, a random vector will be generated and prepended to the
    output. Optional additional authenticated data (AAD) is only supported for GCM. If provided
    for encryption, the identical AAD value must be provided for decryption. The default mode is
    GCM.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    input : :class:`~pyspark.sql.Column` or str
        The binary value to encrypt.
    key : :class:`~pyspark.sql.Column` or str
        The passphrase to use to encrypt the data.
    mode : :class:`~pyspark.sql.Column` or str, optional
        Specifies which block cipher mode should be used to encrypt messages. Valid modes: ECB,
        GCM, CBC.
    padding : :class:`~pyspark.sql.Column` or str, optional
        Specifies how to pad messages whose length is not a multiple of the block size. Valid
        values: PKCS, NONE, DEFAULT. The DEFAULT padding means PKCS for ECB, NONE for GCM and PKCS
        for CBC.
    iv : :class:`~pyspark.sql.Column` or str, optional
        Optional initialization vector. Only supported for CBC and GCM modes. Valid values: None or
        "". 16-byte array for CBC mode. 12-byte array for GCM mode.
    aad : :class:`~pyspark.sql.Column` or str, optional
        Optional additional authenticated data. Only supported for GCM mode. This can be any
        free-form input and must be provided for both encryption and decryption.

    Examples
    --------
    >>> df = spark.createDataFrame([(
    ...     "Spark", "abcdefghijklmnop12345678ABCDEFGH", "GCM", "DEFAULT",
    ...     "000000000000000000000000", "This is an AAD mixed into the input",)],
    ...     ["input", "key", "mode", "padding", "iv", "aad"]
    ... )
    >>> df.select(base64(aes_encrypt(
    ...     df.input, df.key, df.mode, df.padding, to_binary(df.iv, lit("hex")), df.aad)
    ... ).alias('r')).collect()
    [Row(r='AAAAAAAAAAAAAAAAQiYi+sTLm7KD9UcZ2nlRdYDe/PX4')]

    >>> df.select(base64(aes_encrypt(
    ...     df.input, df.key, df.mode, df.padding, to_binary(df.iv, lit("hex")))
    ... ).alias('r')).collect()
    [Row(r='AAAAAAAAAAAAAAAAQiYi+sRNYDAOTjdSEcYBFsAWPL1f')]

    >>> df = spark.createDataFrame([(
    ...     "Spark SQL", "1234567890abcdef", "ECB", "PKCS",)],
    ...     ["input", "key", "mode", "padding"]
    ... )
    >>> df.select(aes_decrypt(aes_encrypt(df.input, df.key, df.mode, df.padding),
    ...     df.key, df.mode, df.padding).alias('r')
    ... ).collect()
    [Row(r=bytearray(b'Spark SQL'))]

    >>> df = spark.createDataFrame([(
    ...     "Spark SQL", "0000111122223333", "ECB",)],
    ...     ["input", "key", "mode"]
    ... )
    >>> df.select(aes_decrypt(aes_encrypt(df.input, df.key, df.mode),
    ...     df.key, df.mode).alias('r')
    ... ).collect()
    [Row(r=bytearray(b'Spark SQL'))]

    >>> df = spark.createDataFrame([(
    ...     "Spark SQL", "abcdefghijklmnop",)],
    ...     ["input", "key"]
    ... )
    >>> df.select(aes_decrypt(
    ...     unbase64(base64(aes_encrypt(df.input, df.key))), df.key
    ... ).cast("STRING").alias('r')).collect()
    [Row(r='Spark SQL')]
    """
    _mode = lit("GCM") if mode is None else mode
    _padding = lit("DEFAULT") if padding is None else padding
    _iv = lit("") if iv is None else iv
    _aad = lit("") if aad is None else aad
    return _invoke_function_over_columns("aes_encrypt", input, key, _mode, _padding, _iv, _aad)


@try_remote_functions
def aes_decrypt(
    input: "ColumnOrName",
    key: "ColumnOrName",
    mode: Optional["ColumnOrName"] = None,
    padding: Optional["ColumnOrName"] = None,
    aad: Optional["ColumnOrName"] = None,
) -> Column:
    """
    Returns a decrypted value of `input` using AES in `mode` with `padding`. Key lengths of 16,
    24 and 32 bits are supported. Supported combinations of (`mode`, `padding`) are ('ECB',
    'PKCS'), ('GCM', 'NONE') and ('CBC', 'PKCS'). Optional additional authenticated data (AAD) is
    only supported for GCM. If provided for encryption, the identical AAD value must be provided
    for decryption. The default mode is GCM.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    input : :class:`~pyspark.sql.Column` or str
        The binary value to decrypt.
    key : :class:`~pyspark.sql.Column` or str
        The passphrase to use to decrypt the data.
    mode : :class:`~pyspark.sql.Column` or str, optional
        Specifies which block cipher mode should be used to decrypt messages. Valid modes: ECB,
        GCM, CBC.
    padding : :class:`~pyspark.sql.Column` or str, optional
        Specifies how to pad messages whose length is not a multiple of the block size. Valid
        values: PKCS, NONE, DEFAULT. The DEFAULT padding means PKCS for ECB, NONE for GCM and PKCS
        for CBC.
    aad : :class:`~pyspark.sql.Column` or str, optional
        Optional additional authenticated data. Only supported for GCM mode. This can be any
        free-form input and must be provided for both encryption and decryption.

    Examples
    --------
    >>> df = spark.createDataFrame([(
    ...     "AAAAAAAAAAAAAAAAQiYi+sTLm7KD9UcZ2nlRdYDe/PX4",
    ...     "abcdefghijklmnop12345678ABCDEFGH", "GCM", "DEFAULT",
    ...     "This is an AAD mixed into the input",)],
    ...     ["input", "key", "mode", "padding", "aad"]
    ... )
    >>> df.select(aes_decrypt(
    ...     unbase64(df.input), df.key, df.mode, df.padding, df.aad).alias('r')
    ... ).collect()
    [Row(r=bytearray(b'Spark'))]

    >>> df = spark.createDataFrame([(
    ...     "AAAAAAAAAAAAAAAAAAAAAPSd4mWyMZ5mhvjiAPQJnfg=",
    ...     "abcdefghijklmnop12345678ABCDEFGH", "CBC", "DEFAULT",)],
    ...     ["input", "key", "mode", "padding"]
    ... )
    >>> df.select(aes_decrypt(
    ...     unbase64(df.input), df.key, df.mode, df.padding).alias('r')
    ... ).collect()
    [Row(r=bytearray(b'Spark'))]

    >>> df.select(aes_decrypt(unbase64(df.input), df.key, df.mode).alias('r')).collect()
    [Row(r=bytearray(b'Spark'))]

    >>> df = spark.createDataFrame([(
    ...     "83F16B2AA704794132802D248E6BFD4E380078182D1544813898AC97E709B28A94",
    ...     "0000111122223333",)],
    ...     ["input", "key"]
    ... )
    >>> df.select(aes_decrypt(unhex(df.input), df.key).alias('r')).collect()
    [Row(r=bytearray(b'Spark'))]
    """
    _mode = lit("GCM") if mode is None else mode
    _padding = lit("DEFAULT") if padding is None else padding
    _aad = lit("") if aad is None else aad
    return _invoke_function_over_columns("aes_decrypt", input, key, _mode, _padding, _aad)


@try_remote_functions
def try_aes_decrypt(
    input: "ColumnOrName",
    key: "ColumnOrName",
    mode: Optional["ColumnOrName"] = None,
    padding: Optional["ColumnOrName"] = None,
    aad: Optional["ColumnOrName"] = None,
) -> Column:
    """
    This is a special version of `aes_decrypt` that performs the same operation,
    but returns a NULL value instead of raising an error if the decryption cannot be performed.
    Returns a decrypted value of `input` using AES in `mode` with `padding`. Key lengths of 16,
    24 and 32 bits are supported. Supported combinations of (`mode`, `padding`) are ('ECB',
    'PKCS'), ('GCM', 'NONE') and ('CBC', 'PKCS'). Optional additional authenticated data (AAD) is
    only supported for GCM. If provided for encryption, the identical AAD value must be provided
    for decryption. The default mode is GCM.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    input : :class:`~pyspark.sql.Column` or str
        The binary value to decrypt.
    key : :class:`~pyspark.sql.Column` or str
        The passphrase to use to decrypt the data.
    mode : :class:`~pyspark.sql.Column` or str, optional
        Specifies which block cipher mode should be used to decrypt messages. Valid modes: ECB,
        GCM, CBC.
    padding : :class:`~pyspark.sql.Column` or str, optional
        Specifies how to pad messages whose length is not a multiple of the block size. Valid
        values: PKCS, NONE, DEFAULT. The DEFAULT padding means PKCS for ECB, NONE for GCM and PKCS
        for CBC.
    aad : :class:`~pyspark.sql.Column` or str, optional
        Optional additional authenticated data. Only supported for GCM mode. This can be any
        free-form input and must be provided for both encryption and decryption.

    Examples
    --------
    >>> df = spark.createDataFrame([(
    ...     "AAAAAAAAAAAAAAAAQiYi+sTLm7KD9UcZ2nlRdYDe/PX4",
    ...     "abcdefghijklmnop12345678ABCDEFGH", "GCM", "DEFAULT",
    ...     "This is an AAD mixed into the input",)],
    ...     ["input", "key", "mode", "padding", "aad"]
    ... )
    >>> df.select(try_aes_decrypt(
    ...     unbase64(df.input), df.key, df.mode, df.padding, df.aad).alias('r')
    ... ).collect()
    [Row(r=bytearray(b'Spark'))]

    >>> df = spark.createDataFrame([(
    ...     "AAAAAAAAAAAAAAAAAAAAAPSd4mWyMZ5mhvjiAPQJnfg=",
    ...     "abcdefghijklmnop12345678ABCDEFGH", "CBC", "DEFAULT",)],
    ...     ["input", "key", "mode", "padding"]
    ... )
    >>> df.select(try_aes_decrypt(
    ...     unbase64(df.input), df.key, df.mode, df.padding).alias('r')
    ... ).collect()
    [Row(r=bytearray(b'Spark'))]

    >>> df.select(try_aes_decrypt(unbase64(df.input), df.key, df.mode).alias('r')).collect()
    [Row(r=bytearray(b'Spark'))]

    >>> df = spark.createDataFrame([(
    ...     "83F16B2AA704794132802D248E6BFD4E380078182D1544813898AC97E709B28A94",
    ...     "0000111122223333",)],
    ...     ["input", "key"]
    ... )
    >>> df.select(try_aes_decrypt(unhex(df.input), df.key).alias('r')).collect()
    [Row(r=bytearray(b'Spark'))]
    """
    _mode = lit("GCM") if mode is None else mode
    _padding = lit("DEFAULT") if padding is None else padding
    _aad = lit("") if aad is None else aad
    return _invoke_function_over_columns("try_aes_decrypt", input, key, _mode, _padding, _aad)


@try_remote_functions
def sha(col: "ColumnOrName") -> Column:
    """
    Returns a sha1 hash value as a hex string of the `col`.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(sf.sha(sf.lit("Spark"))).show()
    +--------------------+
    |          sha(Spark)|
    +--------------------+
    |85f5955f4b27a9a4c...|
    +--------------------+
    """
    return _invoke_function_over_columns("sha", col)


@try_remote_functions
def input_file_block_length() -> Column:
    """
    Returns the length of the block being read, or -1 if not available.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.read.text("python/test_support/sql/ages_newlines.csv", lineSep=",")
    >>> df.select(input_file_block_length().alias('r')).first()
    Row(r=87)
    """
    return _invoke_function_over_columns("input_file_block_length")


@try_remote_functions
def input_file_block_start() -> Column:
    """
    Returns the start offset of the block being read, or -1 if not available.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.read.text("python/test_support/sql/ages_newlines.csv", lineSep=",")
    >>> df.select(input_file_block_start().alias('r')).first()
    Row(r=0)
    """
    return _invoke_function_over_columns("input_file_block_start")


@try_remote_functions
def reflect(*cols: "ColumnOrName") -> Column:
    """
    Calls a method with reflection.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        the first element should be a literal string for the class name,
        and the second element should be a literal string for the method name,
        and the remaining are input arguments to the Java method.

    Examples
    --------
    >>> df = spark.createDataFrame([("a5cf6c42-0c85-418f-af6c-3e4e5b1328f2",)], ["a"])
    >>> df.select(
    ...     reflect(lit("java.util.UUID"), lit("fromString"), df.a).alias('r')
    ... ).collect()
    [Row(r='a5cf6c42-0c85-418f-af6c-3e4e5b1328f2')]
    """
    return _invoke_function_over_seq_of_columns("reflect", cols)


@try_remote_functions
def java_method(*cols: "ColumnOrName") -> Column:
    """
    Calls a method with reflection.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        the first element should be a literal string for the class name,
        and the second element should be a literal string for the method name,
        and the remaining are input arguments to the Java method.

    Examples
    --------
    >>> import pyspark.sql.functions as sf
    >>> spark.range(1).select(
    ...     sf.java_method(
    ...         sf.lit("java.util.UUID"),
    ...         sf.lit("fromString"),
    ...         sf.lit("a5cf6c42-0c85-418f-af6c-3e4e5b1328f2")
    ...     )
    ... ).show(truncate=False)
    +-----------------------------------------------------------------------------+
    |java_method(java.util.UUID, fromString, a5cf6c42-0c85-418f-af6c-3e4e5b1328f2)|
    +-----------------------------------------------------------------------------+
    |a5cf6c42-0c85-418f-af6c-3e4e5b1328f2                                         |
    +-----------------------------------------------------------------------------+
    """
    return _invoke_function_over_seq_of_columns("java_method", cols)


@try_remote_functions
def version() -> Column:
    """
    Returns the Spark version. The string contains 2 fields, the first being a release version
    and the second being a git revision.

    .. versionadded:: 3.5.0

    Examples
    --------
    >>> df = spark.range(1)
    >>> df.select(version()).show(truncate=False) # doctest: +SKIP
    +----------------------------------------------+
    |version()                                     |
    +----------------------------------------------+
    |3.5.0 cafbea5b13623276517a9d716f75745eff91f616|
    +----------------------------------------------+
    """
    return _invoke_function_over_columns("version")


@try_remote_functions
def typeof(col: "ColumnOrName") -> Column:
    """
    Return DDL-formatted type string for the data type of the input.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str

    Examples
    --------
    >>> df = spark.createDataFrame([(1,)], ["a"])
    >>> df.select(typeof(df.a).alias('r')).collect()
    [Row(r='bigint')]
    """
    return _invoke_function_over_columns("typeof", col)


@try_remote_functions
def stack(*cols: "ColumnOrName") -> Column:
    """
    Separates `col1`, ..., `colk` into `n` rows. Uses column names col0, col1, etc. by default
    unless specified otherwise.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    cols : :class:`~pyspark.sql.Column` or str
        the first element should be a literal int for the number of rows to be separated,
        and the remaining are input elements to be separated.

    Examples
    --------
    >>> df = spark.createDataFrame([(1, 2, 3)], ["a", "b", "c"])
    >>> df.select(stack(lit(2), df.a, df.b, df.c)).show(truncate=False)
    +----+----+
    |col0|col1|
    +----+----+
    |1   |2   |
    |3   |NULL|
    +----+----+
    """
    return _invoke_function_over_seq_of_columns("stack", cols)


@try_remote_functions
def bitmap_bit_position(col: "ColumnOrName") -> Column:
    """
    Returns the bit position for the given input column.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        The input column.

    Examples
    --------
    >>> df = spark.createDataFrame([(123,)], ["a"])
    >>> df.select(bitmap_bit_position(df.a).alias("r")).collect()
    [Row(r=122)]
    """
    return _invoke_function_over_columns("bitmap_bit_position", col)


@try_remote_functions
def bitmap_bucket_number(col: "ColumnOrName") -> Column:
    """
    Returns the bucket number for the given input column.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        The input column.

    Examples
    --------
    >>> df = spark.createDataFrame([(123,)], ["a"])
    >>> df.select(bitmap_bucket_number(df.a).alias("r")).collect()
    [Row(r=1)]
    """
    return _invoke_function_over_columns("bitmap_bucket_number", col)


@try_remote_functions
def bitmap_construct_agg(col: "ColumnOrName") -> Column:
    """
    Returns a bitmap with the positions of the bits set from all the values from the input column.
    The input column will most likely be bitmap_bit_position().

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        The input column will most likely be bitmap_bit_position().

    Examples
    --------
    >>> df = spark.createDataFrame([(1,),(2,),(3,)], ["a"])
    >>> df.select(substring(hex(
    ...     bitmap_construct_agg(bitmap_bit_position(df.a))
    ... ), 0, 6).alias("r")).collect()
    [Row(r='070000')]
    """
    return _invoke_function_over_columns("bitmap_construct_agg", col)


@try_remote_functions
def bitmap_count(col: "ColumnOrName") -> Column:
    """
    Returns the number of set bits in the input bitmap.

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        The input bitmap.

    Examples
    --------
    >>> df = spark.createDataFrame([("FFFF",)], ["a"])
    >>> df.select(bitmap_count(to_binary(df.a, lit("hex"))).alias('r')).collect()
    [Row(r=16)]
    """
    return _invoke_function_over_columns("bitmap_count", col)


@try_remote_functions
def bitmap_or_agg(col: "ColumnOrName") -> Column:
    """
    Returns a bitmap that is the bitwise OR of all of the bitmaps from the input column.
    The input column should be bitmaps created from bitmap_construct_agg().

    .. versionadded:: 3.5.0

    Parameters
    ----------
    col : :class:`~pyspark.sql.Column` or str
        The input column should be bitmaps created from bitmap_construct_agg().

    Examples
    --------
    >>> df = spark.createDataFrame([("10",),("20",),("40",)], ["a"])
    >>> df.select(substring(hex(
    ...     bitmap_or_agg(to_binary(df.a, lit("hex")))
    ... ), 0, 6).alias("r")).collect()
    [Row(r='700000')]
    """
    return _invoke_function_over_columns("bitmap_or_agg", col)


# ---------------------------- User Defined Function ----------------------------------


@overload
def udf(
    f: Callable[..., Any],
    returnType: "DataTypeOrString" = StringType(),
    *,
    useArrow: Optional[bool] = None,
) -> "UserDefinedFunctionLike":
    ...


@overload
def udf(
    f: Optional["DataTypeOrString"] = None,
    *,
    useArrow: Optional[bool] = None,
) -> Callable[[Callable[..., Any]], "UserDefinedFunctionLike"]:
    ...


@overload
def udf(
    *,
    returnType: "DataTypeOrString" = StringType(),
    useArrow: Optional[bool] = None,
) -> Callable[[Callable[..., Any]], "UserDefinedFunctionLike"]:
    ...


@try_remote_functions
def udf(
    f: Optional[Union[Callable[..., Any], "DataTypeOrString"]] = None,
    returnType: "DataTypeOrString" = StringType(),
    *,
    useArrow: Optional[bool] = None,
) -> Union["UserDefinedFunctionLike", Callable[[Callable[..., Any]], "UserDefinedFunctionLike"]]:
    """Creates a user defined function (UDF).

    .. versionadded:: 1.3.0

    .. versionchanged:: 3.4.0
        Supports Spark Connect.

    Parameters
    ----------
    f : function
        python function if used as a standalone function
    returnType : :class:`pyspark.sql.types.DataType` or str
        the return type of the user-defined function. The value can be either a
        :class:`pyspark.sql.types.DataType` object or a DDL-formatted type string.
    useArrow : bool or None
        whether to use Arrow to optimize the (de)serialization. When it is None, the
        Spark config "spark.sql.execution.pythonUDF.arrow.enabled" takes effect.

    Examples
    --------
    >>> from pyspark.sql.types import IntegerType
    >>> slen = udf(lambda s: len(s), IntegerType())
    >>> @udf
    ... def to_upper(s):
    ...     if s is not None:
    ...         return s.upper()
    ...
    >>> @udf(returnType=IntegerType())
    ... def add_one(x):
    ...     if x is not None:
    ...         return x + 1
    ...
    >>> df = spark.createDataFrame([(1, "John Doe", 21)], ("id", "name", "age"))
    >>> df.select(slen("name").alias("slen(name)"), to_upper("name"), add_one("age")).show()
    +----------+--------------+------------+
    |slen(name)|to_upper(name)|add_one(age)|
    +----------+--------------+------------+
    |         8|      JOHN DOE|          22|
    +----------+--------------+------------+

    Notes
    -----
    The user-defined functions are considered deterministic by default. Due to
    optimization, duplicate invocations may be eliminated or the function may even be invoked
    more times than it is present in the query. If your function is not deterministic, call
    `asNondeterministic` on the user defined function. E.g.:

    >>> from pyspark.sql.types import IntegerType
    >>> import random
    >>> random_udf = udf(lambda: int(random.random() * 100), IntegerType()).asNondeterministic()

    The user-defined functions do not support conditional expressions or short circuiting
    in boolean expressions and it ends up with being executed all internally. If the functions
    can fail on special rows, the workaround is to incorporate the condition into the functions.

    The user-defined functions do not take keyword arguments on the calling side.
    """

    # The following table shows most of Python data and SQL type conversions in normal UDFs that
    # are not yet visible to the user. Some of behaviors are buggy and might be changed in the near
    # future. The table might have to be eventually documented externally.
    # Please see SPARK-28131's PR to see the codes in order to generate the table below.
    #
    # +-----------------------------+--------------+----------+------+---------------+--------------------+-----------------------------+----------+----------------------+---------+--------------------+----------------------------+------------+--------------+------------------+----------------------+  # noqa
    # |SQL Type \ Python Value(Type)|None(NoneType)|True(bool)|1(int)|         a(str)|    1970-01-01(date)|1970-01-01 00:00:00(datetime)|1.0(float)|array('i', [1])(array)|[1](list)|         (1,)(tuple)|bytearray(b'ABC')(bytearray)|  1(Decimal)|{'a': 1}(dict)|Row(kwargs=1)(Row)|Row(namedtuple=1)(Row)|  # noqa
    # +-----------------------------+--------------+----------+------+---------------+--------------------+-----------------------------+----------+----------------------+---------+--------------------+----------------------------+------------+--------------+------------------+----------------------+  # noqa
    # |                      boolean|          None|      True|  None|           None|                None|                         None|      None|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                      tinyint|          None|      None|     1|           None|                None|                         None|      None|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                     smallint|          None|      None|     1|           None|                None|                         None|      None|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                          int|          None|      None|     1|           None|                None|                         None|      None|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                       bigint|          None|      None|     1|           None|                None|                         None|      None|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                       string|          None|    'true'|   '1'|            'a'|'java.util.Gregor...|         'java.util.Gregor...|     '1.0'|         '[I@66cbb73a'|    '[1]'|'[Ljava.lang.Obje...|               '[B@5a51eb1a'|         '1'|       '{a=1}'|                 X|                     X|  # noqa
    # |                         date|          None|         X|     X|              X|datetime.date(197...|         datetime.date(197...|         X|                     X|        X|                   X|                           X|           X|             X|                 X|                     X|  # noqa
    # |                    timestamp|          None|         X|     X|              X|                   X|         datetime.datetime...|         X|                     X|        X|                   X|                           X|           X|             X|                 X|                     X|  # noqa
    # |                        float|          None|      None|  None|           None|                None|                         None|       1.0|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                       double|          None|      None|  None|           None|                None|                         None|       1.0|                  None|     None|                None|                        None|        None|          None|                 X|                     X|  # noqa
    # |                   array<int>|          None|      None|  None|           None|                None|                         None|      None|                   [1]|      [1]|                 [1]|                [65, 66, 67]|        None|          None|                 X|                     X|  # noqa
    # |                       binary|          None|      None|  None|bytearray(b'a')|                None|                         None|      None|                  None|     None|                None|           bytearray(b'ABC')|        None|          None|                 X|                     X|  # noqa
    # |                decimal(10,0)|          None|      None|  None|           None|                None|                         None|      None|                  None|     None|                None|                        None|Decimal('1')|          None|                 X|                     X|  # noqa
    # |              map<string,int>|          None|      None|  None|           None|                None|                         None|      None|                  None|     None|                None|                        None|        None|      {'a': 1}|                 X|                     X|  # noqa
    # |               struct<_1:int>|          None|         X|     X|              X|                   X|                            X|         X|                     X|Row(_1=1)|           Row(_1=1)|                           X|           X|  Row(_1=None)|         Row(_1=1)|             Row(_1=1)|  # noqa
    # +-----------------------------+--------------+----------+------+---------------+--------------------+-----------------------------+----------+----------------------+---------+--------------------+----------------------------+------------+--------------+------------------+----------------------+  # noqa
    #
    # Note: DDL formatted string is used for 'SQL Type' for simplicity. This string can be
    #       used in `returnType`.
    # Note: The values inside of the table are generated by `repr`.
    # Note: 'X' means it throws an exception during the conversion.

    # decorator @udf, @udf(), @udf(dataType())
    if f is None or isinstance(f, (str, DataType)):
        # If DataType has been passed as a positional argument
        # for decorator use it as a returnType
        return_type = f or returnType
        return functools.partial(
            _create_py_udf,
            returnType=return_type,
            useArrow=useArrow,
        )
    else:
        return _create_py_udf(f=f, returnType=returnType, useArrow=useArrow)


@try_remote_functions
def udtf(
    cls: Optional[Type] = None,
    *,
    returnType: Union[StructType, str],
    useArrow: Optional[bool] = None,
) -> Union["UserDefinedTableFunction", Callable[[Type], "UserDefinedTableFunction"]]:
    """Creates a user defined table function (UDTF).

    .. versionadded:: 3.5.0

    Parameters
    ----------
    cls : class
        the Python user-defined table function handler class.
    returnType : :class:`pyspark.sql.types.StructType` or str
        the return type of the user-defined table function. The value can be either a
        :class:`pyspark.sql.types.StructType` object or a DDL-formatted struct type string.
    useArrow : bool or None, optional
        whether to use Arrow to optimize the (de)serializations. When it's set to None, the
        Spark config "spark.sql.execution.pythonUDTF.arrow.enabled" is used.

    Examples
    --------
    Implement the UDTF class and create a UDTF:

    >>> class TestUDTF:
    ...     def eval(self, *args: Any):
    ...         yield "hello", "world"
    ...
    >>> from pyspark.sql.functions import udtf
    >>> test_udtf = udtf(TestUDTF, returnType="c1: string, c2: string")
    >>> test_udtf().show()
    +-----+-----+
    |   c1|   c2|
    +-----+-----+
    |hello|world|
    +-----+-----+

    UDTF can also be created using the decorator syntax:

    >>> @udtf(returnType="c1: int, c2: int")
    ... class PlusOne:
    ...     def eval(self, x: int):
    ...         yield x, x + 1
    ...
    >>> from pyspark.sql.functions import lit
    >>> PlusOne(lit(1)).show()
    +---+---+
    | c1| c2|
    +---+---+
    |  1|  2|
    +---+---+

    Arrow optimization can be explicitly enabled when creating UDTFs:

    >>> @udtf(returnType="c1: int, c2: int", useArrow=True)
    ... class ArrowPlusOne:
    ...     def eval(self, x: int):
    ...         yield x, x + 1
    ...
    >>> ArrowPlusOne(lit(1)).show()
    +---+---+
    | c1| c2|
    +---+---+
    |  1|  2|
    +---+---+

    Notes
    -----
    User-defined table functions (UDTFs) are considered non-deterministic by default.
    Use `asDeterministic()` to mark a function as deterministic. E.g.:

    >>> class PlusOne:
    ...     def eval(self, a: int):
    ...         yield a + 1,
    >>> plus_one = udtf(PlusOne, returnType="r: int").asDeterministic()

    Use "yield" to produce one row for the UDTF result relation as many times
    as needed. In the context of a lateral join, each such result row will be
    associated with the most recent input row consumed from the "eval" method.

    User-defined table functions are considered opaque to the optimizer by default.
    As a result, operations like filters from WHERE clauses or limits from
    LIMIT/OFFSET clauses that appear after the UDTF call will execute on the
    UDTF's result relation. By the same token, any relations forwarded as input
    to UDTFs will plan as full table scans in the absence of any explicit such
    filtering or other logic explicitly written in a table subquery surrounding the
    provided input relation.

    User-defined table functions do not accept keyword arguments on the calling side.
    """
    if cls is None:
        return functools.partial(_create_py_udtf, returnType=returnType, useArrow=useArrow)
    else:
        return _create_py_udtf(cls=cls, returnType=returnType, useArrow=useArrow)


def _test() -> None:
    import doctest
    from pyspark.sql import SparkSession
    import pyspark.sql.functions

    globs = pyspark.sql.functions.__dict__.copy()
    spark = SparkSession.builder.master("local[4]").appName("sql.functions tests").getOrCreate()
    sc = spark.sparkContext
    globs["sc"] = sc
    globs["spark"] = spark
    (failure_count, test_count) = doctest.testmod(
        pyspark.sql.functions,
        globs=globs,
        optionflags=doctest.ELLIPSIS | doctest.NORMALIZE_WHITESPACE,
    )
    spark.stop()
    if failure_count:
        sys.exit(-1)


if __name__ == "__main__":
    _test()
