import { expandIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class CreateJSONfromTable extends BaseCoreComponent {
  constructor() {
    const defaultConfig =
        {
        tsCFcolumnsJSONColumns: [],
        tsCFcolumnsKeyColumns: [],
        tsCFinputOutputJsonColumnName: "json_payload",
        tsCFbooleanReturnObjectWhenPossible: false
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Columns in JSON",
          id: "tsCFcolumnsJSONColumns",
          placeholder: "Select columns",
		  advanced:true
        },
        {
          type: "columns",
          label: "Key Columns",
          id: "tsCFcolumnsKeyColumns",
          placeholder: "Select columns",
		  advanced:true
        },
        {
          type: "input",
          label: "New Column Name",
          id: "tsCFinputOutputJsonColumnName",
          advanced: true
        },
        {
          type: "boolean",
          label: "Return JSON Object if possible",
          id: "tsCFbooleanReturnObjectWhenPossible",
          advanced: true
         },
      ]
    };
    const description = "Create a JSON from table";

    super("Create JSON", "CreateJSONfromTable", description, "pandas_df_processor", [], "transforms.JSON", expandIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
	   "import json",
	   "from typing import List, Optional",
       "import pandas as pd"//,
       //"import polars as pl",
       //"import duckdb"
    ];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsCreateJSONfromTableFunction = `
def py_fn_create_json_from_dataframe(
    py_arg_dataframe: pd.DataFrame,
    py_arg_json_columns: List[str],
    py_arg_key_columns: Optional[List[str]] = None,
    py_arg_output_json_column_name: str = "json_payload",
    py_arg_return_object_when_possible: bool = False
) -> pd.DataFrame:
    """
    Create JSON payload(s) from selected columns of a dataframe.

    - If key columns are provided: group by key columns and return one JSON payload per group.
    - If no key columns are provided: return one row with one JSON payload containing all rows.
    - Output JSON column is cast to pandas string dtype.

    Behavior of py_arg_return_object_when_possible:
    - False: always return JSON arrays (default).
    - True: return a JSON object instead of array when the payload has exactly one record.

    Args:
        py_arg_dataframe (pd.DataFrame):
            Input dataframe.
        py_arg_json_columns (List[str]):
            Columns to include in JSON payload.
        py_arg_key_columns (Optional[List[str]]):
            Columns used for grouping. If None or empty, no grouping is applied.
        py_arg_output_json_column_name (str):
            Name of the output JSON column.
        py_arg_return_object_when_possible (bool):
            If True, convert single-record arrays into JSON object.

    Returns:
        pd.DataFrame:
            Dataframe containing key columns (if any) + JSON payload column as pandas string dtype.
    """
    py_var_key_columns = py_arg_key_columns if py_arg_key_columns else []

    py_var_missing_json_columns = [
        py_var_col for py_var_col in py_arg_json_columns if py_var_col not in py_arg_dataframe.columns
    ]
    if py_var_missing_json_columns:
        raise ValueError(
            f"Columns not found in dataframe for JSON payload: {py_var_missing_json_columns}"
        )

    py_var_missing_key_columns = [
        py_var_col for py_var_col in py_var_key_columns if py_var_col not in py_arg_dataframe.columns
    ]
    if py_var_missing_key_columns:
        raise ValueError(
            f"Key columns not found in dataframe: {py_var_missing_key_columns}"
        )

    def py_fn_serialize_payload(py_arg_records: List[dict]) -> str:
        """
        Serialize records as JSON array or JSON object (if allowed and possible).
        """
        if py_arg_return_object_when_possible and len(py_arg_records) == 1:
            return json.dumps(py_arg_records[0], ensure_ascii=False)
        return json.dumps(py_arg_records, ensure_ascii=False)

    # No group by -> one output row
    if len(py_var_key_columns) == 0:
        py_var_records = py_arg_dataframe[py_arg_json_columns].to_dict(orient="records")
        py_var_json = py_fn_serialize_payload(py_var_records)
        py_df_output = pd.DataFrame({py_arg_output_json_column_name: [py_var_json]})
        py_df_output[py_arg_output_json_column_name] = py_df_output[
            py_arg_output_json_column_name
        ].astype("string")
        return py_df_output

    # Group by -> one output row per group
    py_df_output = (
        py_arg_dataframe
        .groupby(py_var_key_columns, dropna=False)[py_arg_json_columns]
        .apply(
            lambda py_arg_group: py_fn_serialize_payload(
                py_arg_group.to_dict(orient="records")
            )
        )
        .reset_index(name=py_arg_output_json_column_name)
    )

    py_df_output[py_arg_output_json_column_name] = py_df_output[
        py_arg_output_json_column_name
    ].astype("string")

    return py_df_output
	    `;
    return [tsCreateJSONfromTableFunction];
  }
  
  public generateComponentCode({ config, inputName, outputName }): string {

	let tsConstJsonColumns = "None";
    if (config.tsCFcolumnsJSONColumns?.length > 0) {
      tsConstJsonColumns = `[${config.tsCFcolumnsJSONColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	let tsConstKeyColumns = "None";
    if (config.tsCFcolumnsKeyColumns?.length > 0) {
      tsConstKeyColumns = `[${config.tsCFcolumnsKeyColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	let tsConstReturnObjectWhenPossible = config.tsCFbooleanReturnObjectWhenPossible ? 'True' : 'False';

    let tsConstOutputJsonColumnName = 'None';
    if (config.tsCFinputOutputJsonColumnName && config.tsCFinputOutputJsonColumnName.trim() !== '' 
	) {
      tsConstOutputJsonColumnName = '"' + config.tsCFinputOutputJsonColumnName+ '"';
    }


    return `
${outputName}=py_fn_create_json_from_dataframe(
    py_arg_dataframe=${inputName},
    py_arg_json_columns=${tsConstJsonColumns},
    py_arg_key_columns=${tsConstKeyColumns},
    py_arg_output_json_column_name=${tsConstOutputJsonColumnName},
    py_arg_return_object_when_possible=${tsConstReturnObjectWhenPossible}
)
`;
  }
}
