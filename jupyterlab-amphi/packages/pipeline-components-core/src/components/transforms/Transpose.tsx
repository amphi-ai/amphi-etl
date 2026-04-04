import { transposeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Transpose extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputVariableFieldName: "Column",
      tsCFinputValueFieldName: "Value",
      tsCFselectTypeVariableField: "type as string",
      tsCFselectTypeValueField: "do nothing",
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Information",
          id: "tsCFinfoInformation",
          text:
            "Transforms transposed columns into rows, replaced by a variable and value columns.",
        },
        {
          type: "columns",
          label: "ID columns (keep as-is)",
          id: "tsCFcolumnsKeyTranspose",
          selectAll: true,
          advanced: true,
          tooltip:
            "Columns that identify each row and should remain unchanged. These columns are repeated for each unpivoted value.",
        },
        {
          type: "columns",
          label: "Columns to unpivot",
          id: "tsCFcolumnsColumnsToTranspose",
          selectAll: true,
          advanced: true,
          tooltip:
            "Columns that will be converted into rows. If empty, all columns except the ID columns are unpivoted.",
        },
        {
          type: "input",
          label: "Output column for original column name",
          id: "tsCFinputVariableFieldName",
          advanced: true,
          tooltip:
            "Name of the output column that stores the source column name (default: Column). Example values: Jan, Revenue, Cost.",
        },
        {
          type: "input",
          label: "Output column for values",
          id: "tsCFinputValueFieldName",
          advanced: true,
          tooltip:
            "Name of the output column that stores the cell values from the unpivoted columns (default: Value).",
        },
        {
          type: "select",
          label: "Type for original column name column",
          id: "tsCFselectTypeVariableField",
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
          id: "tsCFselectTypeValueField",
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
    const tsTransposeFunctionFunction = `
def py_fn_transpose_dataframe(
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
    return [tsTransposeFunctionFunction];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const tsConstVariableFieldName = config.tsCFinputVariableFieldName?.trim() || "Column";
    const tsConstValueFieldName = config.tsCFinputValueFieldName?.trim() || "Value";
    const tsConstTypeVariableField = config.tsCFselectTypeVariableField || "type as string";
    const tsConstTypeValueField = config.tsCFselectTypeValueField || "do nothing";

    // note: None vs [] can differ for id_vars/value_vars; we preserve current behavior
    let tsVarKeyColumns = "None";
    if (config.tsCFcolumnsKeyTranspose?.length > 0) {
      tsVarKeyColumns = `[${config.tsCFcolumnsKeyTranspose
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

    let tsVarDataColumns = "None";
    if (config.tsCFcolumnsColumnsToTranspose?.length > 0) {
      tsVarDataColumns = `[${config.tsCFcolumnsColumnsToTranspose
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

    const code = `
# Unpivot (Columns to Rows) Component

${outputName} = py_fn_transpose_dataframe(
    df=${inputName},
    transpose_key_columns=${tsVarKeyColumns},
    transpose_value_columns=${tsVarDataColumns},
    transpose_variable_name='${tsConstVariableFieldName}',
    transpose_value_name='${tsConstValueFieldName}',
    transpose_variable_field_type='${tsConstTypeVariableField}',
    transpose_value_field_type='${tsConstTypeValueField}'
)
`;
    return code;
  }
}
