import { activityIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class FrequencyAnalysis extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFcolumnsColumnsToAnalyze: []	  
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Columns to analyze",
          id: "tsCFcolumnsColumnsToAnalyze",
          placeholder: "Leave blank to analyze all columns",
        }
      ],
    };

    const description = "Turn selected columns into simple frequency tables. For every unique value you get the count, percent, and cumulative totals. The results are combined into one table.";

    super("Frequency Analysis", "frequencyAnalysis", description, "pandas_df_processor", [], "exploration", activityIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
	"import pandas as pd",
	"from typing import List, Optional"
	]
;
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsFrequencyAnalysisFunction = `
def py_fn_value_frequency(
    py_arg_dataframe: pd.DataFrame,
    py_arg_columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Compute frequency statistics for values in a pandas DataFrame using a
    vectorized single-pass method.

    The function calculates frequency metrics for each value in the specified
    columns of a DataFrame. If no columns are provided, all columns of the
    DataFrame are analyzed.

    Returned statistics include:
        - field_name
        - field_value
        - frequency
        - percent
        - cumulative_frequency
        - cumulative_percent

    This implementation processes all columns simultaneously using a stacked
    representation, which is typically faster for wide DataFrames.

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input pandas DataFrame containing the data to analyze.

    py_arg_columns : Optional[List[str]], default None
        List of column names to analyze. If None, all columns of the
        DataFrame are processed.

    Returns
    -------
    pd.DataFrame
        A DataFrame containing value frequency statistics.
    """

    if py_arg_columns is None:
        py_arg_columns = list(py_arg_dataframe.columns)

    py_df = py_arg_dataframe[py_arg_columns]

    py_stacked = (
        py_df
        .stack(future_stack=True)
        .rename_axis(["row_index", "field_name"])
        .reset_index(name="field_value")
    )

    py_freq = (
        py_stacked
        .groupby(["field_name", "field_value"], dropna=False)
        .size()
        .reset_index(name="frequency")
    )
    py_freq["field_name"]=py_freq["field_name"].astype("string")
    py_freq["frequency"] = py_freq["frequency"].astype("int64")

    py_totals = py_freq.groupby("field_name")["frequency"].transform("sum")

    py_freq["percent"] = py_freq["frequency"] / py_totals * 100.0

    py_freq = py_freq.sort_values(
        ["field_name", "frequency", "field_value"],
        ascending=[True, False, True]
    ).reset_index(drop=True)

    py_freq["cumulative_frequency"] = (
        py_freq
        .groupby("field_name")["frequency"]
        .cumsum()
        .astype("int64")
    )

    py_freq["cumulative_percent"] = (
        py_freq
        .groupby("field_name")["percent"]
        .cumsum()
        .astype("float64")
    )

    py_freq["percent"] = py_freq["percent"].astype("float64")

    return py_freq
    `;
    return [tsFrequencyAnalysisFunction];
  }

  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const prefix = config?.backend?.prefix ?? "pd";
	let tsConstColumnsToAnalyze = "None";
    if (config.tsCFcolumnsColumnsToAnalyze?.length > 0) {
      tsConstColumnsToAnalyze = `[${config.tsCFcolumnsColumnsToAnalyze
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

    return `
${outputName}=py_fn_value_frequency(	
    py_arg_dataframe=${inputName},
    py_arg_columns=${tsConstColumnsToAnalyze}
    )
`;
  }
}
