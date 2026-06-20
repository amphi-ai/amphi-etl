import { jsonToTOONIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class JSONToTOON extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFcolumnsJSONColumnName: [],
      tsCFinputNewTOONColumnName: "toon_column"
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "JSON Column",
          id: "tsCFcolumnsJSONColumnName",
          inputNb: 1,
          advanced: false
        },
        {
          type: "input",
          label: "New TOON Column",
          id: "tsCFinputNewTOONColumnName",
          advanced: true
        },
      ],
    };

    const description = "Transform a JSON Column to TOON";

    super("JSON to TOON", "JSONToTOON", description, "pandas_df_processor", [], "transforms", jsonToTOONIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    //deps.push('toon_format');
    deps.push('python-toon');
    return deps;
  }
  
  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from typing import Optional",
      //"import toon_format", //supposed to be official, does not work
      "import toon" //unofficial but works
    ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const JSONToTOONFunction = `
def py_fn_json_string_to_toon_string(
    py_arg_dataframe: pd.DataFrame,
    py_arg_json_column_name: str,
    py_arg_new_column_name: str
) -> pd.DataFrame:
    """
    Transform a column containing JSON strings into a new column containing
    TOON (Token Oriented Object Notation) strings.
 
    For each row, the JSON string from the source column is parsed into a
    Python object and then re-encoded as a TOON string using the toon_format
    library. The result is stored in a new column added to the dataframe.
 
    Args:
        py_arg_dataframe       (pd.DataFrame) : Input dataframe.
        py_arg_json_column_name (str)         : Name of the column containing JSON strings.
        py_arg_new_column_name  (str)         : Name of the new column to store TOON strings.
 
    Returns:
        pd.DataFrame: A copy of the input dataframe with the new TOON string column appended.
 
    Raises:
        ValueError: If py_arg_json_column_name does not exist in the dataframe.
        ValueError: If a cell value cannot be parsed as valid JSON.
 
    Example:
# output = py_fn_json_string_to_toon_string(
#        ...     py_arg_dataframe=input,
#        ...     py_arg_json_column_name="json_data",
#        ...     py_arg_new_column_name="toon_data"
#        ... )
    """
 
    # --- Guard: check source column exists ---
    if py_arg_json_column_name not in py_arg_dataframe.columns:
        raise ValueError(
            f"Column '{py_arg_json_column_name}' does not exist in the input dataframe. "
            f"Available columns: {list(py_arg_dataframe.columns)}"
        )
 
    # --- Work on a copy to avoid mutating the original dataframe ---
    py_df_result = py_arg_dataframe.copy()
 
    def py_fn_convert_single_value(py_arg_raw_value: object) -> Optional[str]:
        """
        Parse a single JSON string and encode it as a TOON string.
 
        Args:
            py_arg_raw_value: A single cell value, expected to be a JSON string.
 
        Returns:
            A TOON-encoded string, or None if the input is null/NaN.
 
        Raises:
            ValueError: If the value is not a valid JSON string.
        """
        # Handle null / NaN values gracefully
        if pd.isna(py_arg_raw_value):
            return None
 
        # Parse JSON string into a Python object
        try:
            py_var_python_object = json.loads(py_arg_raw_value)
        except (json.JSONDecodeError, TypeError) as py_var_error:
            raise ValueError(
                f"Cannot parse value as JSON: '{py_arg_raw_value}'. "
                f"Details: {py_var_error}"
            )
 
        # Encode the Python object as a TOON string
        py_var_toon_string = toon.encode(py_var_python_object)
 
        return py_var_toon_string
 
    # --- Apply the conversion row by row ---
    py_df_result[py_arg_new_column_name] = py_df_result[py_arg_json_column_name].apply(
        py_fn_convert_single_value
    ).astype("string")
 
    return py_df_result
    `;
    return [JSONToTOONFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {

    let tsConstJSONColumnName = "None";
    if (config.tsCFcolumnsJSONColumnName?.length > 0) {
      tsConstJSONColumnName = `[${config.tsCFcolumnsJSONColumnName
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

    let tsConstNewTOONColumnName = 'None';
    if (config.tsCFinputNewTOONColumnName && config.tsCFinputNewTOONColumnName.trim() !== '' 
	) {
      tsConstNewTOONColumnName = '"' + config.tsCFinputNewTOONColumnName+ '"';
    }	

    return `
${outputName} = py_fn_json_string_to_toon_string(
    py_arg_dataframe=${inputName},
    py_arg_json_column_name=${tsConstJSONColumnName},
    py_arg_new_column_name=${tsConstNewTOONColumnName}
) 
    `;
  }
}
