import { transposeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Transpose extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		inputVariableFieldName: "Variable",
		inputValueFieldName: "Value",
		selectTypeVariableField: "type as string",
		selectTypeValueField: "do nothing"
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Information",
          id: "information",
          text: "Transforms transposed columns into rows, replaced by a variable and value columns."
        },
        {
          type: "columns",
          label: "Key Columns",
          id: "columnsKeyTranspose",
          selectAll: true,
          advanced: true
        },
        {
          type: "columns",
          label: "Columns to transpose",
          id: "columnsColumnsToTranspose",
		  tooltip: "if none provided, all columns except the keys columns",
          selectAll: true,
          advanced: true
        }
		,
		{
          type: "input",
          label: "Variable field name",
          id: "inputVariableFieldName",
          tooltip: "Variable field name",
          advanced: true
        },
		{
          type: "input",
          label: "Value field name",
          id: "inputValueFieldName",
          tooltip: "Value field name",
          advanced: true
        },
		{
          type: "select",
          label: "Type of Variable field",
          id: "selectTypeVariableField",
          options: [
            { value: "type as string", label: "Type as string", tooltip: "Type the variable field as string" },
            { value: "do nothing", label: "Do nothing", tooltip: "Do nothing, let default behaviour" },
            { value: "infer type", label: "Infer Type", tooltip: "Try to find best type according values" }
          ],
          advanced: true
        },
		{
          type: "select",
          label: "Type of Value field",
          id: "selectTypeValueField",
          options: [
            { value: "type as string", label: "Type as string", tooltip: "Type the variable field as string" },
            { value: "do nothing", label: "Do nothing", tooltip: "Do nothing, let default behaviour" },
            { value: "infer type", label: "Infer Type", tooltip: "Try to find best type according values" }
          ],
          advanced: true
        },
      ],
    };
    const description = "Use Transpose Dataset to transform the columns into rows of a dataset. It simply repositions the data without aggregation. If you're looking for rearranging and aggregating the data, check out the Pivot Dataset component."

    super("Transpose Dataset", "transpose", description, "pandas_df_processor", [], "transforms", transposeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const TSTransposeFunctionFunction = `
def pyfn_transpose_dataframe(
    df: pd.DataFrame,
    transpose_key_columns: list | None = None,
    transpose_value_columns: list | None = None,
    transpose_variable_name: str = "Variable",
    transpose_value_name: str = "Value",
    transpose_variable_field_type: str = "type as string",  # options: "type as string", "do nothing", "infer type"
    transpose_value_field_type: str = "do nothing"           # options: "type as string", "do nothing", "infer type"
) -> pd.DataFrame:
    """
    Transpose (melt) a pandas DataFrame with flexible options.

    Parameters
    ----------
    df : pd.DataFrame
        Input DataFrame.
    transpose_key_columns : list or None, optional
        Columns to keep as identifiers (like id_vars in pandas.melt).
    transpose_value_columns : list or None, optional
        Columns to transpose (like value_vars in pandas.melt).
    transpose_variable_name : str, default "Variable"
        Name for the variable column in the transposed result.
    transpose_value_name : str, default "Value"
        Name for the value column in the transposed result.
    transpose_variable_field_type : str, default "type as string"
        How to handle the variable column type:
        - "type as string": force all values to str
        - "do nothing": keep as-is
        - "infer type": use pandas to infer dtype automatically
    transpose_value_field_type : str, default "do nothing"
        How to handle the value column type:
        - "type as string": force all values to str
        - "do nothing": keep as-is
        - "infer type": use pandas to infer dtype automatically

    Returns
    -------
    pd.DataFrame
        Transposed DataFrame.
    """
    
    #note that for transpose_key_columns, the behaviour of no columns or all columns provided is not the same
    #on the other hand, for transpose_value_field_type, the result is the same
    #both at None means there is only the variable and value columns in output
    #for both, [] is equivalent to None in python function
	
    # Perform melt (like transposition), pandas standard
    transposed = pd.melt(
        df,
        id_vars=transpose_key_columns,
        value_vars=transpose_value_columns,
        var_name=transpose_variable_name,
        value_name=transpose_value_name
    )

    # Handle variable field type. No need to handle the case "do nothing".
    if transpose_variable_field_type == "type as string":
        transposed[transpose_variable_name] = transposed[transpose_variable_name].astype("string").fillna("None")
    elif variable_field_type == "infer type":
        transposed[transpose_variable_name] = pd.to_numeric(transposed[transpose_variable_name], errors="coerce")

    # Handle value field type No need to handle the case "do nothing".
    if transpose_value_field_type == "type as string":
        transposed[transpose_value_name] = transposed[transpose_value_name].astype("string").fillna("None")
    elif transpose_value_field_type == "infer type":
        transposed[transpose_value_name] = pd.to_numeric(transposed[transpose_value_name], errors="coerce")

    return transposed

    `;
    return [TSTransposeFunctionFunction];
  }
  

  public generateComponentCode({ config, inputName, outputName }): string {
    
	const constTSVariableFieldName=config.inputVariableFieldName;
	const constTSValueFieldName=config.inputValueFieldName;
	const constTSTypeVariableField=config.selectTypeVariableField;
	const constTSTypeValueField=config.selectTypeValueField;
	
	//note that for transpose_key_columns, the behaviour of no columns or all columns provided is not the same
	//on the other hand, for transpose_value_field_type, the result is the same
	//both at None means there is only the variable and value columns in output
	//for both, [] is equivalent to None in python function
	
	let vTSKeyColumns = "None";
    if (config.columnsKeyTranspose?.length > 0) {
      vTSKeyColumns = `[${config.columnsKeyTranspose
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	
    let vTSDataColumns = "None";
    if (config.columnsColumnsToTranspose?.length > 0) {
      vTSDataColumns = `[${config.columnsColumnsToTranspose
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	
    // Construct the Python code using template literals
    const code = `
# Transpose Dataset Component

${outputName} = pyfn_transpose_dataframe(
    df=${inputName},
    transpose_key_columns=${vTSKeyColumns},
    transpose_value_columns=${vTSDataColumns},
    transpose_variable_name='${constTSVariableFieldName}',
    transpose_value_name= '${constTSValueFieldName}',
    transpose_variable_field_type='${constTSTypeVariableField}',
    transpose_value_field_type='${constTSTypeValueField}'
)
`
    return code;
  }

}
