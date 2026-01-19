import { transposeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Transpose extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      inputVariableFieldName: "Column",
      inputValueFieldName: "Value",
      selectTypeVariableField: "type as string",
      selectTypeValueField: "do nothing",
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Information",
          id: "information",
          text:
            "Transforms transposed columns into rows, replaced by a variable and value columns.",
        },
        {
          type: "columns",
          label: "ID columns (keep as-is)",
          id: "columnsKeyTranspose",
          selectAll: true,
          advanced: true,
          tooltip:
            "Columns that identify each row and should remain unchanged. These columns are repeated for each unpivoted value.",
        },
        {
          type: "columns",
          label: "Columns to unpivot",
          id: "columnsColumnsToTranspose",
          selectAll: true,
          advanced: true,
          tooltip:
            "Columns that will be converted into rows. If empty, all columns except the ID columns are unpivoted.",
        },
        {
          type: "input",
          label: "Output column for original column name",
          id: "inputVariableFieldName",
          advanced: true,
          tooltip:
            "Name of the output column that stores the source column name (default: Column). Example values: Jan, Revenue, Cost.",
        },
        {
          type: "input",
          label: "Output column for values",
          id: "inputValueFieldName",
          advanced: true,
          tooltip:
            "Name of the output column that stores the cell values from the unpivoted columns (default: Value).",
        },
        {
          type: "select",
          label: "Type for original column name column",
          id: "selectTypeVariableField",
          options: [
            {
              value: "type as string",
              label: "String (recommended)",
              tooltip: "Force the original column name output to be a string.",
            },
            {
              value: "do nothing",
              label: "Keep default",
              tooltip: "Keep default behaviour.",
            },
          ],
          advanced: true,
          tooltip:
            "Controls how the output column containing original column names is typed.",
        },
        {
          type: "select",
          label: "Type for values column",
          id: "selectTypeValueField",
          options: [
            {
              value: "do nothing",
              label: "Keep default (recommended)",
              tooltip: "Keep default behaviour.",
            },
            {
              value: "type as string",
              label: "String",
              tooltip: "Force all values to be strings.",
            },
            {
              value: "infer numeric",
              label: "Infer numeric",
              tooltip:
                "Try to convert values to numbers when possible; non-numeric become NaN.",
            },
          ],
          advanced: true,
          tooltip: "Controls how the output values column is typed.",
        },
      ],
    };

    const description =
      "Convert selected columns into rows (unpivot). It creates two output columns: one for the original column name and one for the value. No aggregation is performed. For aggregation, use Pivot Dataset.";

    // Keep internal id "transpose" for backward compatibility, update display name for clarity.
    super(
      "Transpose Dataset",
      "transpose",
      description,
      "pandas_df_processor",
      [],
      "transforms",
      transposeIcon,
      defaultConfig,
      form
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public provideFunctions({ config }): string[] {
    const TSTransposeFunctionFunction = `
def pyfn_transpose_dataframe(
    df: pd.DataFrame,
    transpose_key_columns: list | None = None,
    transpose_value_columns: list | None = None,
    transpose_variable_name: str = "Column",
    transpose_value_name: str = "Value",
    transpose_variable_field_type: str = "type as string",  # options: "type as string", "do nothing"
    transpose_value_field_type: str = "do nothing"          # options: "type as string", "do nothing", "infer numeric" (or legacy: "infer type")
) -> pd.DataFrame:
    """
    Unpivot (melt) a pandas DataFrame with flexible options.

    Parameters
    ----------
    df : pd.DataFrame
        Input DataFrame.
    transpose_key_columns : list or None, optional
        Columns to keep as identifiers (like id_vars in pandas.melt).
    transpose_value_columns : list or None, optional
        Columns to unpivot (like value_vars in pandas.melt).
    transpose_variable_name : str, default "Column"
        Name for the output column that stores the original column name.
    transpose_value_name : str, default "Value"
        Name for the output column that stores the values.
    transpose_variable_field_type : str, default "type as string"
        - "type as string": force all values to str
        - "do nothing": keep as-is
    transpose_value_field_type : str, default "do nothing"
        - "type as string": force all values to str
        - "do nothing": keep as-is
        - "infer numeric" (or legacy "infer type"): convert to numeric where possible

    Returns
    -------
    pd.DataFrame
        Unpivoted DataFrame.
    """

    # Perform melt (unpivot)
    transposed = pd.melt(
        df,
        id_vars=transpose_key_columns,
        value_vars=transpose_value_columns,
        var_name=transpose_variable_name,
        value_name=transpose_value_name
    )

    # Variable column typing
    if transpose_variable_field_type == "type as string":
        transposed[transpose_variable_name] = transposed[transpose_variable_name].astype("string").fillna("None")

    # Value column typing
    if transpose_value_field_type == "type as string":
        transposed[transpose_value_name] = transposed[transpose_value_name].astype("string").fillna("None")
    elif transpose_value_field_type in ("infer numeric", "infer type"):
        transposed[transpose_value_name] = pd.to_numeric(transposed[transpose_value_name], errors="coerce")

    return transposed
    `;
    return [TSTransposeFunctionFunction];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const constTSVariableFieldName = config.inputVariableFieldName?.trim() || "Column";
    const constTSValueFieldName = config.inputValueFieldName?.trim() || "Value";
    const constTSTypeVariableField = config.selectTypeVariableField || "type as string";
    const constTSTypeValueField = config.selectTypeValueField || "do nothing";

    // note: None vs [] can differ for id_vars/value_vars; we preserve current behavior
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

    const code = `
# Unpivot (Columns to Rows) Component

${outputName} = pyfn_transpose_dataframe(
    df=${inputName},
    transpose_key_columns=${vTSKeyColumns},
    transpose_value_columns=${vTSDataColumns},
    transpose_variable_name='${constTSVariableFieldName}',
    transpose_value_name='${constTSValueFieldName}',
    transpose_variable_field_type='${constTSTypeVariableField}',
    transpose_value_field_type='${constTSTypeValueField}'
)
`;
    return code;
  }
}
