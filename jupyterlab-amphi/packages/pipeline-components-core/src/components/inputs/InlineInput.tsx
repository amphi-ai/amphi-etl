import { editIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class InlineInput extends BaseCoreComponent {
    constructor() {

        const tsConstinlineDataDefault: string = `First Name,Last Name,Age,Size,Disabled,🏅
John,Doe,28,1.72,False,🥇
Jane,Smith,34,1.65,False,🥈
Emily,Jones,45,1.68,False,🥉
Michael,Brown,22,1.77,True,🥉
Sarah,Wilson,30,1.80,False,🥇`;

    const defaultConfig = {
    tsCFcodeTextareaInlineData: tsConstinlineDataDefault,
    tsCFselectInputFormat:"csv",
    //tsCFselectOutputEngine: "pandas",
    tsCFselectCustomizableCsvSeparator:",",
    tsCFselectTypeMode:"infer"
    };
        const form = {
            idPrefix: "component__form",
            fields: [
                {
                    type: "codeTextarea",
                    label: "Inline Data",
                    id: "tsCFcodeTextareaInlineData",
                    placeholder: "Enter your CSV data here",
                    tooltip: "Type your CSV-like data directly. First line is header. For example:\nID,brand,criteria,assesement\n123,abc,Q9,Y\n145,abc,Q9,Y",
                    aiInstructions: "Generate mock CSV-like data for demonstration purposes.\nIMPORTANT: Output only raw CSV text. Limit to 20 rows unless specified otherwise by the user.",
                    aiGeneration: true,
                    aiDataSample: false,
                    aiPromptExamples: [
                        { label: "Fake user data", value: "Generate fake user data with columns: id, name, email, signup_date." },
                        { label: "Product inventory", value: "Create product inventory with columns like product_id, name, quantity, and price." },
                        { label: "Mock order data", value: "Generate mock order data including order_id, user_id, product_id, quantity, and order_date." },
                        { label: "Survey results", value: "Generate fake survey results with respondent_id, question_id, and response." }
                    ],
                    advanced: true
                },
        {
          type: "select",
          label: "Input Format",
          id: "tsCFselectInputFormat",
          options: [
            { value: "csv", label: "CSV", tooltip: "values separated by specified separator" },
            { value: "json", label: "JSON", tooltip: "JavaScript Notation Object" },
            { value: "raw", label: "Raw", tooltip: "Just a Raw string creating one row and one column" }
          ],
          advanced: true
        },
        // {
          // type: "select",
          // label: "Output Engine",
          // id: "tsCFselectOutputEngine",
          // placeholder: "Error: raise an Exception when a bad line is encountered",
          // options: [
            // { value: "pandas", label: "Pandas"},
            // { value: "polars", label: "Polars"},
            // { value: "duckdb", label: "DuckDB"}
          // ],
          // advanced: true
        // },
        {
          type: "selectCustomizable",
          label: "CSV separator",
          id: "tsCFselectCustomizableCsvSeparator",
          placeholder: "default: ,",
          tooltip: "Select or provide a custom delimiter.",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" }
          ],
          condition: { tsCFselectInputFormat: "csv"},
          advanced: true
        },
        {
          type: "select",
          label: "Type Mode",
          id: "tsCFselectTypeMode",
          options: [
            { value: "infer", label: "Infer", tooltip: "Convert automatically based on data" },
            { value: "all_string", label: "All String", tooltip: "Each field is considered as a string" },
            { value: "none", label: "None", tooltip: "Do Nothing" }
          ],
          advanced: true
        },
            ],
        };
        const description = "Use Inline Input to manually enter data you can use in the pipeline using a CSV-like format, or JSON or Raw."
        super("Inline Input", "inlineInput", description, "pandas_df_input", [], "inputs", editIcon, defaultConfig, form);
    }

    private getEffectiveData(config: any): string {
        const rawValue = config.tsCFcodeTextareaInlineData;
        if (!rawValue) return "";

        // If it's already an object
        if (typeof rawValue === 'object') return rawValue.code || "";

        try {
            const parsed = JSON.parse(rawValue);
            // Even if the field ID is 'inlineData', CodeTextarea saves the text in 'code'
            if (parsed && typeof parsed === 'object' && 'code' in parsed) {
                return parsed.code;
            }
        } catch (e) {
            // Backward compatibility: value is just the raw CSV string
            return rawValue;
        }
        return rawValue;
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd",
"from io import StringIO",
"from __future__ import annotations",
"import io",
"import json",
"from typing import Literal, Optional, Any"];
    }
provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsInlineInputFunction = `
def py_fn_string_to_dataframe(
    py_arg_input_string: str,
    py_arg_input_format: Literal["csv", "json", "raw"] = "raw",
    py_arg_engine: Literal["pandas", "polars", "duckdb"] = "pandas",
    py_arg_csv_separator: str = ",",
    py_arg_type_mode: Literal["infer", "all_string", "none"] = "infer"
) -> Any:
    """
    Convert an input string into a dataframe-like object using the selected engine.

    Parameters
    ----------
    py_arg_input_string : str
        Source string to parse.
    py_arg_input_format : Literal["csv", "json", "raw"], default "raw"
        Input interpretation mode.
    py_arg_engine : Literal["pandas", "polars", "duckdb"], default "pandas"
        Execution engine to build the output dataframe.
    py_arg_csv_separator : str, default ","
        CSV separator when input format is "csv".
    py_arg_type_mode : Literal["infer", "all_string", "none"], default "infer"
        Type handling:
        - "infer": infer types if possible
        - "all_string": cast all columns to string/varchar/utf8
        - "none": no extra casting

    Returns
    -------
    Any
        pandas.DataFrame, polars.DataFrame, or duckdb.DuckDBPyRelation
        depending on py_arg_engine.
    """
    if py_arg_engine == "pandas":
        py_df_output = _py_fn_parse_pandas(
            py_arg_input_string=py_arg_input_string,
            py_arg_input_format=py_arg_input_format,
            py_arg_csv_separator=py_arg_csv_separator
        )
        return _py_fn_apply_type_mode_pandas(
            py_df_input=py_df_output,
            py_arg_type_mode=py_arg_type_mode
        )

    if py_arg_engine == "polars":
        py_df_output = _py_fn_parse_polars(
            py_arg_input_string=py_arg_input_string,
            py_arg_input_format=py_arg_input_format,
            py_arg_csv_separator=py_arg_csv_separator
        )
        return _py_fn_apply_type_mode_polars(
            py_df_input=py_df_output,
            py_arg_type_mode=py_arg_type_mode
        )

    if py_arg_engine == "duckdb":
        py_rel_output = _py_fn_parse_duckdb(
            py_arg_input_string=py_arg_input_string,
            py_arg_input_format=py_arg_input_format,
            py_arg_csv_separator=py_arg_csv_separator
        )
        return _py_fn_apply_type_mode_duckdb(
            py_rel_input=py_rel_output,
            py_arg_type_mode=py_arg_type_mode
        )

    raise ValueError("py_arg_engine must be one of: 'pandas', 'polars', 'duckdb'.")


def _py_fn_parse_pandas(
    py_arg_input_string: str,
    py_arg_input_format: Literal["csv", "json", "raw"],
    py_arg_csv_separator: str
) -> pd.DataFrame:
    """Parse input string directly with pandas."""
    if py_arg_input_format == "csv":
        return pd.read_csv(io.StringIO(py_arg_input_string), sep=py_arg_csv_separator)

    if py_arg_input_format == "json":
        py_var_json_obj = json.loads(py_arg_input_string)
        if isinstance(py_var_json_obj, list):
            return pd.DataFrame(py_var_json_obj)
        if isinstance(py_var_json_obj, dict):
            return pd.DataFrame([py_var_json_obj])
        return pd.DataFrame({"value": [py_var_json_obj]})

    if py_arg_input_format == "raw":
        return pd.DataFrame({"value": [py_arg_input_string]})

    raise ValueError("py_arg_input_format must be one of: 'csv', 'json', 'raw'.")


def _py_fn_parse_polars(
    py_arg_input_string: str,
    py_arg_input_format: Literal["csv", "json", "raw"],
    py_arg_csv_separator: str
):
    """Parse input string directly with polars."""
    import polars as pl

    if py_arg_input_format == "csv":
        return pl.read_csv(
            io.StringIO(py_arg_input_string),
            separator=py_arg_csv_separator
        )

    if py_arg_input_format == "json":
        py_var_json_obj = json.loads(py_arg_input_string)
        if isinstance(py_var_json_obj, list):
            return pl.DataFrame(py_var_json_obj)
        if isinstance(py_var_json_obj, dict):
            return pl.DataFrame([py_var_json_obj])
        return pl.DataFrame({"value": [py_var_json_obj]})

    if py_arg_input_format == "raw":
        return pl.DataFrame({"value": [py_arg_input_string]})

    raise ValueError("py_arg_input_format must be one of: 'csv', 'json', 'raw'.")


def _py_fn_parse_duckdb(
    py_arg_input_string: str,
    py_arg_input_format: Literal["csv", "json", "raw"],
    py_arg_csv_separator: str
):
    """Parse input string directly with duckdb and return a relation."""
    import duckdb

    py_var_con = duckdb.connect()

    if py_arg_input_format == "csv":
        py_var_con.execute("CREATE TEMP TABLE py_tmp_input(content VARCHAR)")
        py_var_con.execute("INSERT INTO py_tmp_input VALUES (?)", [py_arg_input_string])
        return py_var_con.sql(
            """
            SELECT *
            FROM read_csv(
                py_tmp_input,
                delim = ?,
                header = true
            )
            """,
            params=[py_arg_csv_separator]
        )

    if py_arg_input_format == "json":
        py_var_json_obj = json.loads(py_arg_input_string)
        py_df_tmp = pd.DataFrame(py_var_json_obj if isinstance(py_var_json_obj, list) else [py_var_json_obj] if isinstance(py_var_json_obj, dict) else [{"value": py_var_json_obj}])
        py_var_con.register("py_tmp_df", py_df_tmp)
        return py_var_con.sql("SELECT * FROM py_tmp_df")

    if py_arg_input_format == "raw":
        return py_var_con.sql("SELECT ? AS value", params=[py_arg_input_string])

    raise ValueError("py_arg_input_format must be one of: 'csv', 'json', 'raw'.")


def _py_fn_apply_type_mode_pandas(
    py_df_input: pd.DataFrame,
    py_arg_type_mode: Literal["infer", "all_string", "none"]
) -> pd.DataFrame:
    """Apply type mode for pandas dataframe."""
    if py_arg_type_mode == "all_string":
        return py_df_input.astype("string")
    if py_arg_type_mode in {"infer"}:
        return py_df_input.convert_dtypes()
    if py_arg_type_mode in {"none"}:
        return py_df_input.convert_dtypes()
    raise ValueError("py_arg_type_mode must be one of: 'infer', 'all_string', 'none'.")


def _py_fn_apply_type_mode_polars(
    py_df_input,
    py_arg_type_mode: Literal["infer", "all_string", "none"]
):
    """Apply type mode for polars dataframe."""
    import polars as pl

    if py_arg_type_mode == "all_string":
        return py_df_input.with_columns(
            [pl.col(py_var_col).cast(pl.Utf8) for py_var_col in py_df_input.columns]
        )
    if py_arg_type_mode in {"infer", "none"}:
        return py_df_input
    raise ValueError("py_arg_type_mode must be one of: 'infer', 'all_string', 'none'.")


def _py_fn_apply_type_mode_duckdb(
    py_rel_input,
    py_arg_type_mode: Literal["infer", "all_string", "none"]
):
    """Apply type mode for duckdb relation."""
    if py_arg_type_mode == "all_string":
        py_df_cols = py_rel_input.limit(0).df()
        py_var_cols = py_df_cols.columns.tolist()
        py_var_select = ", ".join(
            [f'CAST("{py_var_col}" AS VARCHAR) AS "{py_var_col}"' for py_var_col in py_var_cols]
        )
        return py_rel_input.project(py_var_select)

    if py_arg_type_mode in {"infer", "none"}:
        return py_rel_input

    raise ValueError("py_arg_type_mode must be one of: 'infer', 'all_string', 'none'.")
    `;
    return [tsInlineInputFunction];
  }
    public generateComponentCode({ config, outputName }): string {

    let tsConstInputFormat = 'None';
    if (config.tsCFselectInputFormat && config.tsCFselectInputFormat.trim() !== '' 
	) {
      tsConstInputFormat = '"' + config.tsCFselectInputFormat+ '"';
    }
    let tsConstOutputEngine = 'None';
    // if (config.tsCFselectOutputEngine && config.tsCFselectOutputEngine.trim() !== '' 
	// ) {
      // tsConstOutputEngine = '"' + config.tsCFselectOutputEngine+ '"';
    // }
    let tsConstCsvSeparator = 'None';
    if (config.tsCFselectCustomizableCsvSeparator && config.tsCFselectCustomizableCsvSeparator.trim() !== '' 
	) {
      tsConstCsvSeparator = '"' + config.tsCFselectCustomizableCsvSeparator+ '"';
    }
    let tsConstTypeMode = 'None';
    if (config.tsCFselectTypeMode && config.tsCFselectTypeMode.trim() !== '' 
	) {
      tsConstTypeMode = '"' + config.tsCFselectTypeMode+ '"';
    }

        // 1. Extract the actual content from the wrapper
        const effectiveData = this.getEffectiveData(config).trim();

        if (!effectiveData) {
            throw new Error("No inline data provided.");
        }

        // 2. Escape triple quotes in case the user's data contains them
        const escapedData = effectiveData.replace(/"""/g, '\\"""');

        // 3. The code generation put f string if the string contains braces, so we need to double braces for raw and json
        let bracedData = escapedData;
        console.log(tsConstInputFormat);
        if (tsConstInputFormat ==='"raw"' || tsConstInputFormat === '"json"'){
            console.log("double brace for raw and json");
            bracedData = escapedData
            .replace(/(?<!{){(?!{)/g, "{{")
            .replace(/(?<!})}(?!})/g, "}}");
           }

console.log(bracedData);

        // 4. We wrap the raw string in triple quotes and pass it to StringIO
        const code = `
${outputName}_data = """${bracedData}
"""

${outputName} = py_fn_string_to_dataframe(
    py_arg_input_string=${outputName}_data,
    py_arg_input_format=${tsConstInputFormat},
    #py_arg_engine=${tsConstOutputEngine},
    py_arg_csv_separator=${tsConstCsvSeparator},
    py_arg_type_mode=${tsConstTypeMode}
)
`;
        return code;
    }
}