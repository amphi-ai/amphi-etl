import { markdownTTMIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class ValidateMarkdown extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFcolumnsColumnstoValidateMD: []
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Select Columns to Validate",
          id: "tsCFcolumnsColumnstoValidateMD",
          advanced: true
        },
      ],
    };

    const description = "Validate a Markdown string";

    super("Validate Markdown", "ValidateMarkdown", description, "pandas_df_processor", [], "transforms", markdownTTMIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('markdown_it_py');
    return deps;
  }
  
  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from typing import List, Optional",
      "from markdown_it import MarkdownIt"
    ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const ValidateMarkdownFunction = `
def py_fn_validate_markdown_columns(
    py_arg_dataframe: pd.DataFrame,
    py_arg_columns_to_validate: list[str]
) -> pd.DataFrame:
    """
    Validate markdown syntax for selected columns in a pandas DataFrame.

    For each column name in py_arg_columns_to_validate, this function adds a
    boolean column named is_<column_name>_valid_markdown indicating whether
    each cell content is valid markdown.

    A value is considered valid markdown when:
    - it is a non-null value,
    - it can be converted to string,
    - and markdown parsing succeeds without raising an exception.

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input dataframe containing columns to validate.
    py_arg_columns_to_validate : list[str]
        List of column names to validate as markdown.

    Returns
    -------
    pd.DataFrame
        A copy of the input dataframe with one boolean validation column per
        validated column.

    Raises
    ------
    ValueError
        If one or more columns in py_arg_columns_to_validate are missing in
        the input dataframe.
    """
    py_var_missing_columns: list[str] = [
        py_var_column
        for py_var_column in py_arg_columns_to_validate
        if py_var_column not in py_arg_dataframe.columns
    ]

    if py_var_missing_columns:
        raise ValueError(
            f"Columns not found in dataframe: {py_var_missing_columns}"
        )

    py_var_markdown_parser = MarkdownIt()
    py_df_output = py_arg_dataframe.copy()

    def py_fn_is_valid_markdown(py_arg_value: object) -> bool:
        if pd.isna(py_arg_value):
            return False
        try:
            py_var_markdown_parser.parse(str(py_arg_value))
            return True
        except Exception:
            return False

    for py_var_column in py_arg_columns_to_validate:
        py_var_output_column_name = f"is_{py_var_column}_valid_markdown"
        py_df_output[py_var_output_column_name] = (
            py_df_output[py_var_column].apply(py_fn_is_valid_markdown)
        )

    return py_df_output

    `;
    return [ValidateMarkdownFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {

	let tsConstColumnstoValidateMD = "None";
    if (config.tsCFcolumnsColumnstoValidateMD?.length > 0) {
      tsConstColumnstoValidateMD = `[${config.tsCFcolumnsColumnstoValidateMD
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }


    return `
${outputName} = py_fn_validate_markdown_columns(
    py_arg_dataframe=${inputName},
    py_arg_columns_to_validate=${tsConstColumnstoValidateMD}
)


    `;
  }
}
