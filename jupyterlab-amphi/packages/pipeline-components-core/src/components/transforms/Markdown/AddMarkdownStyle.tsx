import { markdownTTMIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class AddMarkdownStyle extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFcolumnsColumnsToStyle: [],
      tsCFselectMultipleMarkdownStyles :[],
      tsCFbooleanCreateNewColumn : true,
      tsCFinputPrefixNewMdColumn : "",
      tsCFinputSuffixNewMdColumn : ""
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Columns to Style",
          id: "tsCFcolumnsColumnsToStyle",
          advanced: true
        },
        {
          type: "selectMultiple",
          label: "Markdown Styles",
          id: "tsCFselectMultipleMarkdownStyles",
          options: [
            { value: "Heading level 1", label: "Heading level 1" },
            { value: "Heading level 2", label: "Heading level 2" },
            { value: "Heading level 3", label: "Heading level 3" },
            { value: "Heading level 4", label: "Heading level 4" },
            { value: "Heading level 5", label: "Heading level 5" },
            { value: "Heading level 6", label: "Heading level 6" },
            { value: "Blockquote", label: "Blockquote" },
            { value: "Bold", label: "Bold" },
            { value: "Italic", label: "Italic" },
            { value: "Strikethrough", label: "Strikethrough" },
            { value: "Inline Code", label: "Inline Code" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Create New Column(s)",
          id: "tsCFbooleanCreateNewColumn",
          advanced: true
         },
        {
          type: "input",
          label: "Prefix New Column",
          id: "tsCFinputPrefixNewMdColumn",
          condition: { tsCFbooleanCreateNewColumn: true},
          advanced: true
        },
        {
          type: "input",
          label: "Suffix New Column",
          id: "tsCFinputSuffixNewMdColumn",
          condition: { tsCFbooleanCreateNewColumn: true},
          advanced: true
        },
      ],
    };

    const description = "Add Markdown Style to a string";

    super("Add Markdown Style", "AddMarkdownStyle", description, "pandas_df_processor", [], "transforms", markdownTTMIcon, defaultConfig, form);
  }

  // public provideDependencies({ config }): string[] {
    // let deps: string[] = [];
    // deps.push('markdown_it');
    // return deps;
  // }
  
  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from typing import List, Optional"
    ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const AddMarkdownStyleFunction = `
def py_fn_add_markdown_styles_to_columns(
    py_arg_dataframe: pd.DataFrame,
    py_arg_columns: List[str],
    py_arg_styles: Optional[List[str]] = None,
    py_arg_create_new_column: bool = False,
    py_arg_prefix_new_md_column: str = "",
    py_arg_suffix_new_md_column: str = ""
) -> pd.DataFrame:
    """
    Apply markdown styles to selected columns using user-friendly style names.

    Supported styles:
    -Heading level 1
    -Heading level 2
    -Heading level 3
    -Heading level 4
    -Heading level 5
    -Heading level 6
    -Blockquote
    -Bold
    -Italic
    -Strikethrough
    -Inline Code

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input dataframe.
    py_arg_columns : List[str]
        Columns to transform.
    py_arg_styles : Optional[List[str]], default None
        User-friendly markdown styles to apply.
    py_arg_create_new_column : bool, default False
        If True, create new columns; else modify existing columns.
    py_arg_prefix_new_md_column : str, default ""
        Prefix for new columns.
    py_arg_suffix_new_md_column : str, default ""
        Suffix for new columns.

    Returns
    -------
    pd.DataFrame
        Transformed dataframe.
    """
    py_df_output = py_arg_dataframe.copy()

    if py_arg_styles is None:
        py_arg_styles = []

    py_var_hash = chr(35)  
    py_var_backtick = chr(96)  
    py_var_carriagereturnlinefeed = chr(13)+chr(10)
        

    py_var_style_map = {
        "Heading level 1": {"left": py_var_hash + " ", "right": ""},
        "Heading level 2": {"left": py_var_hash * 2 + " ", "right": ""},
        "Heading level 3": {"left": py_var_hash * 3 + " ", "right": ""},
        "Heading level 4": {"left": py_var_hash * 4 + " ", "right": ""},
        "Heading level 5": {"left": py_var_hash * 5 + " ", "right": ""},
        "Heading level 6": {"left": py_var_hash * 6 + " ", "right": ""},
        "Blockquote": {"left": py_var_carriagereturnlinefeed+">", "right": py_var_carriagereturnlinefeed},
        "Bold": {"left": "**", "right": "**"},
        "Italic": {"left": "_", "right": "_"},
        "Strikethrough": {"left": "~~", "right": "~~"},
        "Inline Code": {"left": py_var_backtick, "right": py_var_backtick},
    }

    py_var_left_tags = ""
    py_var_right_tags = ""

    for py_var_style in py_arg_styles:
        if py_var_style in py_var_style_map:
            py_var_left_tags += py_var_style_map[py_var_style]["left"]
            py_var_right_tags = py_var_style_map[py_var_style]["right"] + py_var_right_tags

    if py_arg_columns :
        py_var_columns = py_arg_columns
    else :
        py_var_columns = []
    for py_var_column in py_var_columns:
        if py_var_column not in py_df_output.columns:
            continue

        py_var_series = py_df_output[py_var_column].fillna("").astype(str)
        py_var_transformed = py_var_left_tags + py_var_series + py_var_right_tags

        if py_arg_create_new_column:
            py_var_new_column = f"{py_arg_prefix_new_md_column}{py_var_column}{py_arg_suffix_new_md_column}"
            py_df_output[py_var_new_column] = py_var_transformed.astype("string")
        else:
            py_df_output[py_var_column] = py_var_transformed.astype("string")

    return py_df_output

    `;
    return [AddMarkdownStyleFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {

    let tsConstColumnsToStyle = "None";
    if (config.tsCFcolumnsColumnsToStyle?.length > 0) {
      tsConstColumnsToStyle = `[${config.tsCFcolumnsColumnsToStyle
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

	let tsConstMarkdownStyles = 'None';
    if (config.tsCFselectMultipleMarkdownStyles && config.tsCFselectMultipleMarkdownStyles.length > 0
	) {
      tsConstMarkdownStyles = JSON.stringify(config.tsCFselectMultipleMarkdownStyles);
    }	

	let tsConstCreateNewColumn = config.tsCFbooleanCreateNewColumn ? 'True' : 'False';

    let tsConstPrefixNewMdColumn = 'None';
    if (config.tsCFinputPrefixNewMdColumn && config.tsCFinputPrefixNewMdColumn.trim() !== '' 
	) {
      tsConstPrefixNewMdColumn = '"' + config.tsCFinputPrefixNewMdColumn+ '"';
    }	
    let tsConstSuffixNewMdColumn = 'None';
    if (config.tsCFinputPrefixNewMdColumn && config.tsCFinputPrefixNewMdColumn.trim() !== '' 
	) {
      tsConstSuffixNewMdColumn = '"' + config.tsCFinputPrefixNewMdColumn+ '"';
    }	
    return `
${outputName} = py_fn_add_markdown_styles_to_columns(
    py_arg_dataframe=${inputName},
    py_arg_columns=${tsConstColumnsToStyle},
    py_arg_styles=${tsConstMarkdownStyles},
    py_arg_create_new_column=${tsConstCreateNewColumn},
    py_arg_prefix_new_md_column=${tsConstPrefixNewMdColumn},
    py_arg_suffix_new_md_column=${tsConstSuffixNewMdColumn}
)
    `;
  }
}
