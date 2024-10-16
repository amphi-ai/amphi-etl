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

import json

from typing import Any, Dict, Optional

from pyspark.sql.types import (
    DataType,
    ByteType,
    ShortType,
    IntegerType,
    FloatType,
    DateType,
    TimestampType,
    TimestampNTZType,
    DayTimeIntervalType,
    YearMonthIntervalType,
    MapType,
    StringType,
    CharType,
    VarcharType,
    StructType,
    StructField,
    ArrayType,
    DoubleType,
    LongType,
    DecimalType,
    BinaryType,
    BooleanType,
    NullType,
    UserDefinedType,
)
from pyspark.errors import PySparkAssertionError

import pyspark.sql.connect.proto as pb2


JVM_BYTE_MIN: int = -(1 << 7)
JVM_BYTE_MAX: int = (1 << 7) - 1
JVM_SHORT_MIN: int = -(1 << 15)
JVM_SHORT_MAX: int = (1 << 15) - 1
JVM_INT_MIN: int = -(1 << 31)
JVM_INT_MAX: int = (1 << 31) - 1
JVM_LONG_MIN: int = -(1 << 63)
JVM_LONG_MAX: int = (1 << 63) - 1


class UnparsedDataType(DataType):
    """
    Unparsed data type.

    The data type string will be parsed later.

    Parameters
    ----------
    data_type_string : str
        The data type string format equals :class:`DataType.simpleString`,
        except that the top level struct type can omit the ``struct<>``.
        This also supports a schema in a DDL-formatted string and case-insensitive strings.

    Examples
    --------
    >>> from pyspark.sql.connect.types import UnparsedDataType

    >>> UnparsedDataType("int ")
    UnparsedDataType('int ')
    >>> UnparsedDataType("INT ")
    UnparsedDataType('INT ')
    >>> UnparsedDataType("a: byte, b: decimal(  16 , 8   ) ")
    UnparsedDataType('a: byte, b: decimal(  16 , 8   ) ')
    >>> UnparsedDataType("a DOUBLE, b STRING")
    UnparsedDataType('a DOUBLE, b STRING')
    >>> UnparsedDataType("a DOUBLE, b CHAR( 50 )")
    UnparsedDataType('a DOUBLE, b CHAR( 50 )')
    >>> UnparsedDataType("a DOUBLE, b VARCHAR( 50 )")
    UnparsedDataType('a DOUBLE, b VARCHAR( 50 )')
    >>> UnparsedDataType("a: array< short>")
    UnparsedDataType('a: array< short>')
    >>> UnparsedDataType(" map<string , string > ")
    UnparsedDataType(' map<string , string > ')
    """

    def __init__(self, data_type_string: str):
        self.data_type_string = data_type_string

    def simpleString(self) -> str:
        return "unparsed(%s)" % repr(self.data_type_string)

    def __repr__(self) -> str:
        return "UnparsedDataType(%s)" % repr(self.data_type_string)

    def jsonValue(self) -> Dict[str, Any]:
        raise PySparkAssertionError(
            error_class="INVALID_CALL_ON_UNRESOLVED_OBJECT",
            message_parameters={"func_name": "jsonValue"},
        )

    def needConversion(self) -> bool:
        raise PySparkAssertionError(
            error_class="INVALID_CALL_ON_UNRESOLVED_OBJECT",
            message_parameters={"func_name": "needConversion"},
        )

    def toInternal(self, obj: Any) -> Any:
        raise PySparkAssertionError(
            error_class="INVALID_CALL_ON_UNRESOLVED_OBJECT",
            message_parameters={"func_name": "toInternal"},
        )

    def fromInternal(self, obj: Any) -> Any:
        raise PySparkAssertionError(
            error_class="INVALID_CALL_ON_UNRESOLVED_OBJECT",
            message_parameters={"func_name": "fromInternal"},
        )


def pyspark_types_to_proto_types(data_type: DataType) -> pb2.DataType:
    ret = pb2.DataType()
    if isinstance(data_type, NullType):
        ret.null.CopyFrom(pb2.DataType.NULL())
    elif isinstance(data_type, StringType):
        ret.string.CopyFrom(pb2.DataType.String())
    elif isinstance(data_type, BooleanType):
        ret.boolean.CopyFrom(pb2.DataType.Boolean())
    elif isinstance(data_type, BinaryType):
        ret.binary.CopyFrom(pb2.DataType.Binary())
    elif isinstance(data_type, ByteType):
        ret.byte.CopyFrom(pb2.DataType.Byte())
    elif isinstance(data_type, ShortType):
        ret.short.CopyFrom(pb2.DataType.Short())
    elif isinstance(data_type, IntegerType):
        ret.integer.CopyFrom(pb2.DataType.Integer())
    elif isinstance(data_type, LongType):
        ret.long.CopyFrom(pb2.DataType.Long())
    elif isinstance(data_type, FloatType):
        ret.float.CopyFrom(pb2.DataType.Float())
    elif isinstance(data_type, DoubleType):
        ret.double.CopyFrom(pb2.DataType.Double())
    elif isinstance(data_type, DecimalType):
        ret.decimal.scale = data_type.scale
        ret.decimal.precision = data_type.precision
    elif isinstance(data_type, DateType):
        ret.date.CopyFrom(pb2.DataType.Date())
    elif isinstance(data_type, TimestampType):
        ret.timestamp.CopyFrom(pb2.DataType.Timestamp())
    elif isinstance(data_type, TimestampNTZType):
        ret.timestamp_ntz.CopyFrom(pb2.DataType.TimestampNTZ())
    elif isinstance(data_type, DayTimeIntervalType):
        ret.day_time_interval.start_field = data_type.startField
        ret.day_time_interval.end_field = data_type.endField
    elif isinstance(data_type, YearMonthIntervalType):
        ret.year_month_interval.start_field = data_type.startField
        ret.year_month_interval.end_field = data_type.endField
    elif isinstance(data_type, StructType):
        struct = pb2.DataType.Struct()
        for field in data_type.fields:
            struct_field = pb2.DataType.StructField()
            struct_field.name = field.name
            struct_field.data_type.CopyFrom(pyspark_types_to_proto_types(field.dataType))
            struct_field.nullable = field.nullable
            if field.metadata is not None and len(field.metadata) > 0:
                struct_field.metadata = json.dumps(field.metadata)
            struct.fields.append(struct_field)
        ret.struct.CopyFrom(struct)
    elif isinstance(data_type, MapType):
        ret.map.key_type.CopyFrom(pyspark_types_to_proto_types(data_type.keyType))
        ret.map.value_type.CopyFrom(pyspark_types_to_proto_types(data_type.valueType))
        ret.map.value_contains_null = data_type.valueContainsNull
    elif isinstance(data_type, ArrayType):
        ret.array.element_type.CopyFrom(pyspark_types_to_proto_types(data_type.elementType))
        ret.array.contains_null = data_type.containsNull
    elif isinstance(data_type, UserDefinedType):
        json_value = data_type.jsonValue()
        ret.udt.type = "udt"
        if "class" in json_value:
            # Scala/Java UDT
            ret.udt.jvm_class = json_value["class"]
        else:
            # Python UDT
            ret.udt.serialized_python_class = json_value["serializedClass"]
        ret.udt.python_class = json_value["pyClass"]
        ret.udt.sql_type.CopyFrom(pyspark_types_to_proto_types(data_type.sqlType()))
    elif isinstance(data_type, UnparsedDataType):
        data_type_string = data_type.data_type_string
        ret.unparsed.data_type_string = data_type_string
    else:
        raise Exception(f"Unsupported data type {data_type}")
    return ret


def proto_schema_to_pyspark_data_type(schema: pb2.DataType) -> DataType:
    if schema.HasField("null"):
        return NullType()
    elif schema.HasField("boolean"):
        return BooleanType()
    elif schema.HasField("binary"):
        return BinaryType()
    elif schema.HasField("byte"):
        return ByteType()
    elif schema.HasField("short"):
        return ShortType()
    elif schema.HasField("integer"):
        return IntegerType()
    elif schema.HasField("long"):
        return LongType()
    elif schema.HasField("float"):
        return FloatType()
    elif schema.HasField("double"):
        return DoubleType()
    elif schema.HasField("decimal"):
        p = schema.decimal.precision if schema.decimal.HasField("precision") else 10
        s = schema.decimal.scale if schema.decimal.HasField("scale") else 0
        return DecimalType(precision=p, scale=s)
    elif schema.HasField("string"):
        return StringType()
    elif schema.HasField("char"):
        return CharType(schema.char.length)
    elif schema.HasField("var_char"):
        return VarcharType(schema.var_char.length)
    elif schema.HasField("date"):
        return DateType()
    elif schema.HasField("timestamp"):
        return TimestampType()
    elif schema.HasField("timestamp_ntz"):
        return TimestampNTZType()
    elif schema.HasField("day_time_interval"):
        start: Optional[int] = (
            schema.day_time_interval.start_field
            if schema.day_time_interval.HasField("start_field")
            else None
        )
        end: Optional[int] = (
            schema.day_time_interval.end_field
            if schema.day_time_interval.HasField("end_field")
            else None
        )
        return DayTimeIntervalType(startField=start, endField=end)
    elif schema.HasField("year_month_interval"):
        start: Optional[int] = (  # type: ignore[no-redef]
            schema.year_month_interval.start_field
            if schema.year_month_interval.HasField("start_field")
            else None
        )
        end: Optional[int] = (  # type: ignore[no-redef]
            schema.year_month_interval.end_field
            if schema.year_month_interval.HasField("end_field")
            else None
        )
        return YearMonthIntervalType(startField=start, endField=end)
    elif schema.HasField("array"):
        return ArrayType(
            proto_schema_to_pyspark_data_type(schema.array.element_type),
            schema.array.contains_null,
        )
    elif schema.HasField("struct"):
        fields = []
        for f in schema.struct.fields:
            if f.HasField("metadata"):
                metadata = json.loads(f.metadata)
            else:
                metadata = None
            fields.append(
                StructField(
                    f.name, proto_schema_to_pyspark_data_type(f.data_type), f.nullable, metadata
                )
            )
        return StructType(fields)
    elif schema.HasField("map"):
        return MapType(
            proto_schema_to_pyspark_data_type(schema.map.key_type),
            proto_schema_to_pyspark_data_type(schema.map.value_type),
            schema.map.value_contains_null,
        )
    elif schema.HasField("udt"):
        assert schema.udt.type == "udt"
        json_value = {}
        if schema.udt.HasField("python_class"):
            json_value["pyClass"] = schema.udt.python_class
        if schema.udt.HasField("serialized_python_class"):
            json_value["serializedClass"] = schema.udt.serialized_python_class
        return UserDefinedType.fromJson(json_value)
    else:
        raise Exception(f"Unsupported data type {schema}")
