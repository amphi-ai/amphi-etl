import { splitIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class SplitColumn extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
	splitType: "columns",
	regex: false,
	keepOriginalColumn: false,
	select_convert_result : "none"
	};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Split Type",
          id: "splitType",
          options: [
            { value: "columns", label: "Split to columns" },
            { value: "rows", label: "Split to rows" }
          ],
          advanced: false
        },
        {
          type: "column",
          label: "Column",
          id: "column",
          placeholder: "Type column name",
        },
        {
          type: "selectCustomizable",
          label: "Delimiter",
          id: "delimiter",
          placeholder: "Select or type delimiter",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" },
            { value: "  ", label: "tab" },
            { value: "|", label: "pipe (|)" }
          ],
        },
        {
          type: "boolean",
          label: "Is delimiter a regex?",
          id: "regex",
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Number of columns",
          id: "numberColumns",
          placeholder: "auto",
          min: 1,
          condition: { splitType: "columns" }
        },
        {
          type: "input",
          label: "Name of the new column (mandatory if original column kept)",
          id: "input_name_new_column",
          condition: { splitType: "rows" }
        },
        {
          type: "boolean",
          label: "Keep original column",
          id: "keepOriginalColumn",
          advanced: true
        },
		{
          type: "selectCustomizable",
          label: "Convert result",
          id: "select_convert_result",
          options: [
            { value: "none", label: "none" },
            { value: "string", label: "string" },
            { value: "auto", label: "auto (numeric or string)" }
          ],
          condition: { splitType: "rows" },
          advanced: true
        }
      ],
    }
    const description = "Use Split Column to split the text from one column into multiple columns or multiple rows.";

    super("Split Column", "splitColumn", description, "pandas_df_processor", [], "transforms", splitIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

 public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to compare data
    const Split_Column_To_Row_Function = `
def split_dataframe_to_rows(
    df: pd.DataFrame,
    column_to_split: str,
    new_column_name: str,
    split_delimiter: str,
    keep_original_column: bool = False,
    is_regex: bool = False,
    convert_result: str = "none",  # "none" | "string" | "auto"
) -> pd.DataFrame:
    """
    Splits a string column into multiple rows based on a delimiter (or regex).

    Parameters
    ----------
    df : pd.DataFrame
        Input DataFrame.
    column_to_split : str
        Name of the column to split (can contain spaces or special characters).
    new_column_name : str
        Name for the resulting exploded column.
    split_delimiter : str
        Delimiter or regex used to split the string.
    keep_original_column : bool, default False
        If True, keeps the original column. Otherwise drops it.
    is_regex : bool, default False
        If True, interpret split_delimiter as a regex.
    convert_result : none, string, auto, default none
        - none   → keep the exploded column as-is.
        - string → convert the exploded column to pandas string dtype.
        - auto   → run convert_dtypes() on the entire DataFrame.
    Returns
    -------
    pd.DataFrame
        A new DataFrame with one row per split value.
    """
    if convert_result not in {"none", "string", "auto"}:
        raise ValueError("convert_result must be one of: 'none', 'string', or 'auto'")
        
    # Make a copy to avoid modifying original data
    df = df.copy()

    # Perform the split safely (supports regex and handles missing values)
    split_col = df[column_to_split].astype("string").str.split(split_delimiter, regex=is_regex)

    # Add the split column
    df = df.assign(**{new_column_name: split_col})

    # Explode into multiple rows
    df = df.explode(new_column_name, ignore_index=True)

    # Handle type conversion modes
    if convert_result == "string":
        df[new_column_name] = df[new_column_name].astype("string")
    elif convert_result == "auto":
        # Try best-effort numeric conversion, fallback gracefully
        try:
            df[new_column_name] = pd.to_numeric(df[new_column_name])
        except Exception:
            df[new_column_name] = df[[new_column_name]].convert_dtypes()[new_column_name]
        
    # Drop the original column if requested
    if not keep_original_column and new_column_name != column_to_split:
        df = df.drop(columns=[column_to_split])

    return df
    `;
    return [Split_Column_To_Row_Function];
  }	
  public generateComponentCode({ config, inputName, outputName }): string {
    const prefix = config?.backend?.prefix ?? "pd";
    const columnName = config.column.value; // name of the column
    const columnType = config.column.type; // current type of the column (e.g., 'int', 'string')
    const columnNamed = config.column.named; // boolean, true if column is named, false if index is used
  
    // Ensure unique variable names for intermediate dataframes
    const uniqueSplitVar = `${outputName}_split`;
    const uniqueCombinedVar = `${outputName}_combined`;
  
    // Start generating the code string
    let code = `\n# Create a new DataFrame from the split operation\n`;
  
    // Handling column access based on whether it's named or indexed
    const columnAccess = columnNamed ? `"${columnName}"` : columnName;
  
    // Convert column to string if it's not already
    if (columnType !== "string") {
      code += `${inputName}[${columnAccess}] = ${inputName}[${columnAccess}].astype("string")\n`;
    }
  
    // Determine whether to use regex in the split
    const regexOption = config.regex ? ", regex=True" : "";
  
    // Add the split logic based on splitType
    if (config.splitType === "columns") {
      // Split to columns
      code += `${uniqueSplitVar} = ${inputName}[${columnAccess}].str.split("${config.delimiter}"${regexOption}, expand=True)\n`;
  
      // Rename the new columns to avoid any potential overlap
      code += `${uniqueSplitVar}.columns  = [f"${columnName}_{i}" for i in range(${uniqueSplitVar}.shape[1])]\n`;
  
      // If numberColumns is specified, keep only the desired number of columns
      if (config.numberColumns > 0) {
        code += `${uniqueSplitVar} = ${uniqueSplitVar}.iloc[:, :${config.numberColumns}]\n`;
      }
  
      // Combine the original DataFrame with the new columns
      code += `${outputName} = ${prefix}.concat([${inputName}, ${uniqueSplitVar}], axis=1)\n`;
  
      // Check if the original column should be kept
      if (!config.keepOriginalColumn) {
        code += `\n# Remove the original column used for split\n`;
        code += `${outputName}.drop(columns=[${columnAccess}], inplace=True)\n`;
      }
    }

	else if (config.splitType === "rows") {
      // Split to rows. if we keep original column, we have to rename the new one. Moreover, assign only accept a kwarg like argument (so no quoted, so space..)
      const const_ts_column_to_split = columnNamed ? columnName : columnAccess; // Added to fix https://github.com/amphi-ai/amphi-etl/issues/235
      const const_ts_boolean_keepOriginalColumn= config.keepOriginalColumn ? "True" : "False";
	  //if null, undefined or empty
      const const_ts_new_column_name =
      config.input_name_new_column && config.input_name_new_column.length > 0
        ? config.input_name_new_column
        : const_ts_column_to_split;
	  const const_ts_split_delimiter = config.delimiter;
	  const const_ts_boolean_is_regex= config.regex ? "False" : "True";
	  const const_ts_convert_result=config.select_convert_result;
	  code += `${outputName}=split_dataframe_to_rows(df=${inputName},keep_original_column=${const_ts_boolean_keepOriginalColumn},column_to_split='${const_ts_column_to_split}',new_column_name='${const_ts_new_column_name}',split_delimiter='${const_ts_split_delimiter}',is_regex=${const_ts_boolean_is_regex},convert_result='${const_ts_convert_result}')\n`;
    }
  
    // Return the generated code
    return code;
  }


}