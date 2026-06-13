import { markdownTTMIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class TableToMarkdown extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFcolumnsGroupColumns: [],
      tsCFcolumnsMarkdownColumns: [],
      tsCFinputTargetMarkdownColumnName : "markdown_table"
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Select Group Columns",
          id: "tsCFcolumnsGroupColumns",
        },
        {
          type: "columns",
          label: "Select Markdown Columns",
          id: "tsCFcolumnsMarkdownColumns",
        },
        {
          type: "input",
          label: "Target Markdown Column Name",
          id: "tsCFinputTargetMarkdownColumnName",
          tooltip: "Target Markdown Column Name",
          advanced: true
        },
      ],
    };

    const description = "Dynamically rename columns based on selected transformations such as case conversion, special character handling, and prefix/suffix modifications.";

    super("Table To Markdown", "TableToMarkdown", description, "pandas_df_processor", [], "transforms", markdownTTMIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('tabulate');
    return deps;
  }
  
  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from typing import List, Optional",
      "import tabulate"
    ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to perform frequency analysis
    const GroupToMarkdownFunction = `
def py_fn_group_to_markdown(
    py_arg_df: pd.DataFrame,
    py_arg_groupby_cols: Optional[List[str]],
    py_arg_markdown_cols: List[str],
    py_arg_markdown_col_name: str = "markdown_table",
    py_arg_round_digits: Optional[int] = None
) -> pd.DataFrame:
    """
    Convert grouped slices of a pandas DataFrame into Markdown tables.

    If grouping columns are provided, returns one row per group with a Markdown
    table (as a string) built from selected columns.

    If no grouping columns are provided, returns a single-row DataFrame with
    one column containing the Markdown representation of the selected columns.

    Parameters
    ----------
    py_arg_df : pd.DataFrame
        Input DataFrame.
    py_arg_groupby_cols : Optional[List[str]]
        Columns used for grouping. If None or empty, no grouping is applied.
    py_arg_markdown_cols : List[str]
        Columns to include in the Markdown table.
    py_arg_markdown_col_name : str, default "markdown_table"
        Name of the output column containing Markdown strings.
    py_arg_round_digits : Optional[int], default None
        Number of digits for rounding numeric values inside the Markdown table.

    Returns
    -------
    pd.DataFrame
        A DataFrame containing grouping columns (if any) and a column with
        Markdown table strings (dtype = string).
    """

    def _py_fn_build_markdown(py_arg_sub_df: pd.DataFrame) -> str:
        """
        Internal helper to convert a DataFrame slice to Markdown.
        """
        py_sub = py_arg_sub_df[py_arg_markdown_cols].copy()

        if py_arg_round_digits is not None:
            py_sub = py_sub.round(py_arg_round_digits)

        return str(py_sub.to_markdown(index=False))

    # Case 1: No grouping
    if not py_arg_groupby_cols:
        py_result = pd.DataFrame({
            py_arg_markdown_col_name: [
                _py_fn_build_markdown(py_arg_df)
            ]
        })
        py_result[py_arg_markdown_col_name] = py_result[py_arg_markdown_col_name].astype("string")
        return py_result

    # Case 2: With grouping
    py_result = (
        py_arg_df.groupby(py_arg_groupby_cols, dropna=False)
        .agg(**{
            py_arg_markdown_col_name: (
                py_arg_markdown_cols[0],
                lambda _: _py_fn_build_markdown(
                    py_arg_df.loc[_.index]
                )
            )
        })
        .reset_index()
    )

    # Enforce string dtype explicitly
    py_result[py_arg_markdown_col_name] = py_result[py_arg_markdown_col_name].astype("string")

    return py_result

    `;
    return [GroupToMarkdownFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {

	let tsConstGroupColumns = "None";
    if (config.tsCFcolumnsGroupColumns?.length > 0) {
      tsConstGroupColumns = `[${config.tsCFcolumnsGroupColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	let tsConstMarkdownColumns = "None";
    if (config.tsCFcolumnsMarkdownColumns?.length > 0) {
      tsConstMarkdownColumns = `[${config.tsCFcolumnsMarkdownColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }	
	
    let tsConstTargetMarkdownColumnName = 'None';
    if (config.tsCFinputTargetMarkdownColumnName && config.tsCFinputTargetMarkdownColumnName.trim() !== '' 
	) {
      tsConstTargetMarkdownColumnName = '"' + config.tsCFinputTargetMarkdownColumnName+ '"';
    }	

    return `
${outputName} = py_fn_group_to_markdown(
    py_arg_df=${inputName},
    py_arg_groupby_cols=${tsConstGroupColumns},
    py_arg_markdown_cols=${tsConstMarkdownColumns},
    py_arg_markdown_col_name=${tsConstTargetMarkdownColumnName}
)


    `;
  }
}
