import { expandIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class ValidateJSON extends BaseCoreComponent {
  constructor() {
    const defaultConfig =
        {
        tsCFcolumnsColumnsToValidate:"",
        tsCFselectoutputEngine:"pandas"		 
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          id: "tsCFinfo_json",
          text: "JSON offers nested fields. Array are like a list, Objects should not be mistaken for Python objects, it's a key value type. Also note there is no date type. It's recommanded to use a Convert Type tool after.",
          advanced: true
        },
        {
          type: "columns",
          label: "Columns to validate",
          id: "tsCFcolumnsColumnsToValidate",
          placeholder: "Select columns",
		  advanced:false
        },
		{
          type: "select",
          label: "Output Engine",
          id: "tsCFselectoutputEngine",
		  options: [
            { value: "pandas", label: "Pandas", tooltip: "Mature, easy-to-use, great for small-to-medium datasets." }//,
//            { value: "polars", label: "Polars", tooltip: "Fast, memory-efficient, great for large-scale in-memory analytics." },
//            { value: "duckdb", label: "DuckDB", tooltip: "SQL-based, excellent for large datasets" }
          ],
          advanced: true
        },
      ]
    };
    const description = "Validate JSON data in columns";

    super("Validate JSON", "ValidateJSON", description, "pandas_df_processor", [], "transforms.JSON", expandIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
	   "import json",
	   "from typing import List",
       "import pandas as pd"//,
       //"import polars as pl",
       //"import duckdb"
    ];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsValidateJSONFunction = `
def py_fn_validate_json_columns(
    py_arg_dataframe: pd.DataFrame,
    py_arg_columns_to_validate: List[str],
) -> pd.DataFrame:
    """
    Validate JSON content for multiple columns in a pandas DataFrame.

    For each column provided in py_arg_columns_to_validate,
    a new boolean column is added to the output DataFrame with the format:
    is_column_name_valid_json.

    A value is considered valid JSON if:
    - It is a valid JSON string
    - It can be successfully parsed using json.loads

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input pandas DataFrame.

    py_arg_columns_to_validate : List[str]
        List of column names to validate as JSON.

    Returns
    -------
    pd.DataFrame
        DataFrame with additional boolean validation columns.
    """

    def _py_fn_is_valid_json(py_arg_value: object) -> bool:
        """
        Check whether a value is valid JSON.

        Parameters
        ----------
        py_arg_value : object
            Value to validate.

        Returns
        -------
        bool
            True if the value is valid JSON, otherwise False.
        """

        if pd.isna(py_arg_value):
            return False

        if not isinstance(py_arg_value, str):
            return False

        try:
            json.loads(py_arg_value)
            return True
        except (TypeError, ValueError, json.JSONDecodeError):
            return False

    py_output_dataframe = py_arg_dataframe.copy()

    for py_col in py_arg_columns_to_validate:
        py_validation_column = f"is_{py_col}_valid_json"

        py_output_dataframe[py_validation_column] = (
            py_output_dataframe[py_col]
            .apply(_py_fn_is_valid_json)
        )

    return py_output_dataframe

	    `;
    return [tsValidateJSONFunction];
  }
  
  public generateComponentCode({ config, inputName, outputName }): string {

	let tsConstJSONColumnsToValidate = "None";
    if (config.tsCFcolumnsColumnsToValidate?.length > 0) {
      tsConstJSONColumnsToValidate = `[${config.tsCFcolumnsColumnsToValidate
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }		

    return `
${outputName}=py_fn_validate_json_columns(
    py_arg_dataframe=${inputName},
    py_arg_columns_to_validate=${tsConstJSONColumnsToValidate}
)
`;
  }
}
