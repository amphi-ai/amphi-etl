import { convertIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class TypeConverter extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFcascaderDataTypePandas: "string",
		tsCFColumnsToConvert:[],
		tsCFselectErrorManagement: "warn_coerce",
        tsCFbooleanKeepInitial : false,
        inputPrefixForNewColumns : "",
        inputSuffixForNewColumns : "",
        tsCFbooleanConvertToDtype : false,	
		tsCFselectDtypeBackend: "pyarrow"
		};
    const form = {
      idPrefix: "component__form",
      fields: [
		{
          type: "columns",
          label: "Columns to convert",
          id: "tsCFColumnsToConvert",
          placeholder: "Column name"
        },
		//specific to pandas, would require some change with polars and duckdb
        {
          type: "cascader",
          label: "Data Type to convert to",
          id: "tsCFcascaderDataTypePandas",
          placeholder: "Select ...",
          onlyLastValue: true,
          options: [
            {
              value: "numeric",
              label: "Numeric",
              children: [
                {
                  value: "int",
                  label: "Integer",
                  children: [
                    { value: "int64", label: "int64: Standard integer type." },
                    { value: "int32", label: "int32: For optimized memory usage." },
                    { value: "int16", label: "int16: For more optimized memory usage." },
                    { value: "int8", label: "int8: For more optimized memory usage." },
                    { value: "uint64", label: "uint64: Unsigned integer (can only hold non-negative values)" },
                    { value: "uint32", label: "uint32: For more optimized memory usage." },
                    { value: "uint16", label: "uint16: For more optimized memory usage." },
                    { value: "uint8", label: "uint8: For more optimized memory usage." },
                    { value: "Int64", label: "Int64: Pandas standard integer type." },
                    { value: "Int32", label: "Int32: Pandas For optimized memory usage." },
                    { value: "Int16", label: "Int16: Pandas For more optimized memory usage." },
                    { value: "Int8", label: "Int8: Pandas For more optimized memory usage." },
                    { value: "UInt64", label: "UInt64: Pandas Unsigned integer (can only hold non-negative values)" },
                    { value: "UInt32", label: "UInt32: Pandas For more optimized memory usage." },
                    { value: "UInt16", label: "UInt16: Pandas For more optimized memory usage." },
                    { value: "UInt8", label: "UInt8: Pandas For more optimized memory usage." },
                    { value: "int64[pyarrow]", label: "int64[pyarrow]: Pyarrow Standard integer type." },
                    { value: "int32[pyarrow]", label: "int32[pyarrow]: Pyarrow For optimized memory usage." },
                    { value: "int16[pyarrow]", label: "int16[pyarrow]: Pyarrow For more optimized memory usage." },
                    { value: "int8[pyarrow]", label: "int8[pyarrow]: Pyarrow For more optimized memory usage." },
                    { value: "uint64[pyarrow]", label: "uint64[pyarrow]: Pyarrow Unsigned integer (can only hold non-negative values)" },
                    { value: "uint32[pyarrow]", label: "uint32[pyarrow]: Pyarrow For more optimized memory usage." },
                    { value: "uint16[pyarrow]", label: "uint16[pyarrow]: Pyarrow For more optimized memory usage." },
                    { value: "uint8[pyarrow]", label: "uint8[pyarrow]: Pyarrow For more optimized memory usage." },
                  ]
                },
                {
                  value: "float",
                  label: "Float",
                  children: [
                    { value: "float64", label: "float64: Standard floating-point type." },
                    { value: "float32", label: "float32: For optimized memory usage." },
                    { value: "float16", label: "float16: For optimized memory usage." },
                    { value: "Float64", label: "Float64: Pandas Standard floating-point type." },
                    { value: "Float32", label: "Float32: Pandas For optimized memory usage." },
                    //{ value: "Float16", label: "Float16: Pandas For optimized memory usage." }
                    { value: "float[pyarrow]", label: "float[pyarrow]: Pyarrow float" },
                    { value: "double[pyarrow]", label: "double[pyarrow]: Pyarrow double" }										
                  ]
                }
              ]
            },
            {
              value: "text",
              label: "Text",
              children: [
                { value: "str", label: "str : For string data." },
                { value: "string", label: "Pandas string: For string data. (recommended)" },
                { value: "object", label: "object: For generic objects (strings, timestamps, mixed types)." },
                { value: "category", label: "category: For categorical variables." },
                { value: "string[pyarrow]", label: "Pyarrow string: For string data." },
              ]
            },
            {
              value: "datetime",
              label: "Date & Time",
              children: [
                { value: "date", label: "date: For date values." },
                //{ value: "Date", label: "Date: Pandas For date values." },
                { value: "datetime64[ns]", label: "datetime64[ns]: For datetime values." },
                { value: "datetime64[ms]", label: "datetime64[ms]: For datetime values in milliseconds." },
                { value: "datetime64[s]", label: "datetime64[s]: For datetime values in seconds." },
                { value: "datetime32[ns]", label: "datetime32[ns]: For compact datetime storage in nanoseconds." },
                { value: "datetime32[ms]", label: "datetime32[ms]: For compact datetime storage in milliseconds." },
                { value: "pa.timestamp[ns]", label: "pa.timestamp[ns]: Pyarrow timestamp (nanosecond)." },
                { value: "pa.timestamp[us]", label: "pa.timestamp[us]: Pyarrow timestamp (microsecond)." },
                { value: "pa.timestamp[ms]", label: "pa.timestamp[ms]: Pyarrow timestamp (millisecond)." },
                { value: "pa.timestamp[s]", label: "pa.timestamp[s]: Pyarrow timestamp (second)." },
                { value: "timedelta[ns]", label: "timedelta[ns]: For differences between two datetimes." }				
              ]
            },
            {
              value: "boolean",
              label: "Boolean",
              children: [
                { value: "bool", label: "bool: For boolean values (True or False)." },
                { value: "boolean", label: "boolean: Pandas For boolean values (True or False)." },
                { value: "bool[pyarrow]", label: "bool[pyarrow]: Pyarrow For boolean values (True or False)." }
              ]
            }
          ]
        },
        {
          type: "select",
          label: "Error management",
          id: "tsCFselectErrorManagement",
          placeholder: "Select behavior",
          options: [
            { value:  "raise", label: "Raise error and stop"},
            { value: "warn_keep", label: "Warning and keep original values"},
            { value: "warn_coerce", label: "Warning and coerce to NaN / NaT"},
            { value: "keep", label: "Do nothing, keep original values"},
            { value:  "coerce", label: "Silently coerce to NaN / NaT"}
          ],
          advanced: true
        },
	   {
          type: "boolean",
          label: "Keep Initial",
          id: "tsCFbooleanKeepInitial",
          advanced: true
        },
        {
          type: "input",
          label: "Prefix for new columns",
          id: "inputPrefixForNewColumns",
          advanced: true
        },
        {
          type: "input",
          label: "Suffix for new columns",
          id: "inputSuffixForNewColumns",
          advanced: true
        },
	   {
          type: "boolean",
          label: "Convert to Dtype",
          id: "tsCFbooleanConvertToDtype",
          advanced: true
        },
		{
          type: "select",
          label: "Dtype Backend",
          id: "tsCFselectDtypeBackend",
          options: [
            { value:  "pyarrow", label: "Pyarrow"},
            { value: "numpy_nullable", label: "Numpy Nullable"}
          ],
          advanced: true
        }
      ],
    };
    const description = "Use Type Converter to change the data type of one or several columns to the specified type.";

    super("Type Converter", "typeConverter", description, "pandas_df_processor", [], "transforms", convertIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
	//both import datetime and from datetime import datetime are necessary
    const imports = [
	"import pandas as pd",
	"import pyarrow as pa",
	"import datetime",
	"from datetime import datetime",
	"import warnings",
	"from typing import List, Union, Type"
	];
    return imports;
  }
provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsTypeConverterFunction = `
def py_fn_convert_columns_type(
    py_arg_df: pd.DataFrame,
    py_arg_columns: List[str],
    py_arg_target_type: Union[Type, str],
    py_arg_on_fail: str = "warn_keep",
    py_arg_keep_initial: bool = False,
    py_arg_prefix: str = "",
    py_arg_suffix: str = "",
    py_arg_convert_to_dtype: bool = False,
    py_arg_dtype_backend: str = "pyarrow"
) -> pd.DataFrame:
    """
    Convert the type of selected columns in a pandas DataFrame. Future release will have to deal with Polars/DuckDB

    Parameters
    ----------
    py_arg_df : pandas.DataFrame
        Input DataFrame.
    py_arg_columns : list[str]
        List of column names to convert.
    py_arg_target_type : type or str
        Target type to convert to (e.g. int, float, str, "datetime64[ns]").
    py_arg_on_fail : str, optional
        Error handling strategy:
        - "raise": raise error and stop
        - "warn_keep": warning and keep original values
        - "warn_coerce": warning and coerce to NaN / NaT
        - "keep": do nothing, keep original values
        - "coerce": silently coerce to NaN / NaT
    py_arg_keep_initial : bool, optional
        If True, keep the original column and create a new one.
    py_arg_prefix : str, optional
        Prefix for the new column name.
    py_arg_suffix : str, optional
        Suffix for the new column name.
    py_arg_convert_to_dtype : bool, optional
        If True, apply astype(py_arg_target_type) after initial conversion.
    py_arg_dtype_backend : str,optional
        backend for dtype, numpy_nullable or pyarrow
    Returns
    -------
    pandas.DataFrame
        DataFrame with converted columns.
    """
     # --- Arrow timestamp dtypes ---
    pa_type_timestampns = pd.ArrowDtype(pa.timestamp("ns"))
    pa_type_timestampus = pd.ArrowDtype(pa.timestamp("us"))
    pa_type_timestampms = pd.ArrowDtype(pa.timestamp("ms"))
    pa_type_timestamps = pd.ArrowDtype(pa.timestamp("s"))
    
    py_var_df = py_arg_df.copy()
    #misc checks
    py_var_on_fail = py_arg_on_fail.lower()
    py_var_allowed_modes = {
        "raise",
        "warn_keep",
        "warn_coerce",
        "keep",
        "coerce",
    }

    if py_var_on_fail not in py_var_allowed_modes:
        raise ValueError(
            f"py_arg_on_fail must be one of {sorted(py_var_allowed_modes)}"
        )

    #loop for each selected column
    for py_var_col in py_arg_columns:
        if py_var_col not in py_var_df.columns:
            raise KeyError(f"Column '{py_var_col}' not found in DataFrame")
        #dynamic built with prefix and suffix
        py_var_target_col = (
            f"{py_arg_prefix}{py_var_col}{py_arg_suffix}"
            if py_arg_keep_initial
            else py_var_col
        )

        py_var_series = py_var_df[py_var_col]

        try:
            # --- Primary conversion ---
            #numeric
            if py_arg_target_type in [int, float,"int64","int32","int16","int8","uint64","uint32","uint16","uint8","Int64","Int32","Int16","Int8","UInt64","UInt32","UInt16","UInt8","float64","float32","float16","Float64","Float32"] or py_arg_target_type == "numeric":
                py_var_converted = pd.to_numeric(
                    py_var_series,
                    errors="raise",
                ).astype(py_arg_target_type)
            #datetime
            elif py_arg_target_type in ["datetime", "datetime64[ns]","datetime64[s]"]:
                py_var_converted = pd.to_datetime(
                    py_var_series,
                    errors="raise",
                )
            #pyarrow timestamp    
            elif py_arg_target_type in ["pa.timestamp[ns]", "pa.timestamp[us]","pa.timestamp[ms]","pa.timestamp[s]"]:
                py_var_pyarrow_ts_unit = py_arg_target_type.replace("pa.timestamp[", "").replace("]", "")
                print(py_var_pyarrow_ts_unit)
                py_var_converted = pd.to_datetime(
                    py_var_series,
                    errors="raise",
                )
                if py_var_pyarrow_ts_unit == "ns":
                    py_var_converted = py_var_converted.astype(pa_type_timestampns)
                elif py_var_pyarrow_ts_unit == "us":
                    py_var_converted = py_var_converted.astype(pa_type_timestampus)
                elif py_var_pyarrow_ts_unit == "ms":
                    py_var_converted = py_var_converted.astype(pa_type_timestampms)
                elif py_var_pyarrow_ts_unit == "s":
                    py_var_converted = py_var_converted.astype(pa_type_timestamps)
                else:
                    raise ValueError(f"Unsupported timestamp unit: {unit}")

            else:
                py_var_converted = py_var_series.astype(py_arg_target_type)

            # --- Optional dtype enforcement ---
            if py_arg_convert_to_dtype:
                py_var_converted = py_var_converted.convert_dtypes(dtype_backend=py_arg_dtype_backend)

            py_var_df[py_var_target_col] = py_var_converted

        except Exception as py_var_exc:
            if py_var_on_fail == "raise":
                raise

            if py_var_on_fail in {"warn_keep", "warn_coerce"}:
                #warn
                warnings.warn(
                    f"Failed to convert column '{py_var_col}' to "
                    f"{py_arg_target_type}: {py_var_exc}",
                    RuntimeWarning,
                )

            if py_var_on_fail in {"warn_coerce", "coerce"}:
                #coerce
                #datetime
                if py_arg_target_type in ["datetime", "datetime64[ns]","datetime64[s]"]:
                    py_var_df[py_var_target_col] = pd.to_datetime(
                        py_var_series, errors="coerce"
                    )
                #pyarrow timestamp    
                elif py_arg_target_type in ["pa.timestamp[ns]", "pa.timestamp[us]","pa.timestamp[ms]","pa.timestamp[s]"]:
                    py_var_pyarrow_ts_unit = py_arg_target_type.replace("pa.timestamp[", "").replace("]", "")
                    print(py_var_pyarrow_ts_unit)
                    py_var_converted = pd.to_datetime(
                        py_var_series,
                        errors="coerce",
                    )
                    if py_var_pyarrow_ts_unit == "ns":
                        py_var_converted = py_var_converted.astype(pa_type_timestampns)
                    elif py_var_pyarrow_ts_unit == "us":
                        py_var_converted = py_var_converted.astype(pa_type_timestampus)
                    elif py_var_pyarrow_ts_unit == "ms":
                        py_var_converted = py_var_converted.astype(pa_type_timestampms)
                    elif py_var_pyarrow_ts_unit == "s":
                        py_var_converted = py_var_converted.astype(pa_type_timestamps)                
                else:
                    #de facto numeric types
                    py_var_df[py_var_target_col] = pd.to_numeric(
                        py_var_series, errors="coerce"
                    ).astype(py_arg_target_type)

            if py_var_on_fail in {"warn_keep", "keep"}:
                #do nothing
                if py_arg_keep_initial:
                    py_var_df[py_var_target_col] = py_var_series
    
            # --- Optional dtype enforcement ---
            if py_arg_convert_to_dtype:
                py_var_df[py_var_target_col] = py_var_df[py_var_target_col].convert_dtypes(dtype_backend=py_arg_dtype_backend)
    return py_var_df
	    `;
    return [tsTypeConverterFunction];
  }
  
  public generateComponentCode({ config, inputName, outputName }): string {
   const tsConstDataTypePandasStep1 = config.tsCFcascaderDataTypePandas[config.tsCFcascaderDataTypePandas.length - 1];
   let tsConstDataTypePandas = 'None';
    if (tsConstDataTypePandasStep1 && tsConstDataTypePandasStep1.trim() !== '' 
	) {
      tsConstDataTypePandas = '"' + tsConstDataTypePandasStep1+ '"';
    }
   let tsConstErrorManagement = 'None';
    if (config.tsCFselectErrorManagement && config.tsCFselectErrorManagement.trim() !== '' 
	) {
      tsConstErrorManagement = '"' + config.tsCFselectErrorManagement+ '"';
    }
   let tsConstPrefixForNewColumns = 'None';
    if (config.inputPrefixForNewColumns && config.inputPrefixForNewColumns.trim() !== '' 
	) {
      tsConstPrefixForNewColumns = '"' + config.inputPrefixForNewColumns+ '"';
    }	
   let tsConstSuffixForNewColumns = 'None';
    if (config.inputSuffixForNewColumns && config.inputSuffixForNewColumns.trim() !== '' 
	) {
      tsConstSuffixForNewColumns = '"' + config.inputSuffixForNewColumns+ '"';
    }
   let tsConstDtypeBackend = 'None';
    if (config.tsCFselectDtypeBackend && config.tsCFselectDtypeBackend.trim() !== '' 
	) {
      tsConstDtypeBackend = '"' + config.tsCFselectDtypeBackend+ '"';
    }
	let tsConstKeepInitial = config.tsCFbooleanKeepInitial ? 'True' : 'False';
	let tsConstConvertToDtype = config.tsCFbooleanConvertToDtype ? 'True' : 'False';
	let tsConstColumnsToConvert = "None";
    if (config.tsCFColumnsToConvert?.length > 0) {
      tsConstColumnsToConvert = `[${config.tsCFColumnsToConvert
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }


    return `
${outputName}=py_fn_convert_columns_type(	
    py_arg_df=${inputName},
    py_arg_columns=${tsConstColumnsToConvert},
    py_arg_target_type=${tsConstDataTypePandas},
    py_arg_on_fail=${tsConstErrorManagement},
    py_arg_keep_initial=${tsConstKeepInitial},
    py_arg_prefix=${tsConstPrefixForNewColumns},
    py_arg_suffix=${tsConstSuffixForNewColumns},
    py_arg_convert_to_dtype=${tsConstConvertToDtype},
    py_arg_dtype_backend=${tsConstDtypeBackend}
    )
`;
  }
}