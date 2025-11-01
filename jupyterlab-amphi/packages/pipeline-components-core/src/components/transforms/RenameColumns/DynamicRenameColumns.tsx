import { renameIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class DynamicRenameColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      columns: []
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Select Columns",
          id: "combinationColumns",
          placeholder: "Default: all columns",
        },
        {
          type: "select",
          label: "Global case operation",
          id: "selectGlobalCaseOperation",
          options: [
            { value: "none", label: "None", tooltip: "Keep the text exactly as it is, with no changes to case or formatting." },
            { value: "lower", label: "Lower case", tooltip: "Convert all letters to lowercase (e.g., 'Example Text' → 'example text')." },
            { value: "upper", label: "Upper cqse", tooltip: "Convert all letters to uppercase (e.g., 'Example Text' → 'EXAMPLE TEXT')." },
            { value: "camel_lower", label: "Lower camel case", tooltip: "Capitalize each word except the first, remove spaces (e.g., 'example text' → 'exampleText')." },
            { value: "camel_upper", label: "Upper camel case", tooltip: "Capitalize each word including the first, remove spaces (e.g., 'example text' → 'ExampleText')." },
            { value: "snake", label: "Snake case", tooltip: "Convert spaces to underscores and all letters to lowercase (e.g., 'Example Text' → 'example_text')." }
          ],
          advanced: true
        },
        {
          type: "select",
          label: "Action on special characters",
          tooltip: "Define how to handle special characters in column names. (_ will be keeped if snake case is selected)",
          id: "selectActionSpecialCharacters",
          options: [
            { value: "None", label: "None", tooltip: "No action on special characters" },
            { value: "replace", label: "Replace", tooltip: "Replace all special characters" }
          ],
          advanced: true
        },
        {
          type: "input",
          label: "Replace special characters with",
          id: "inputCharReplacement",
          tooltip: "Defines the character used to replace special characters",
          advanced: true,
          condition: { selectActionSpecialCharacters: ["replace"] },
        },
        {
          type: "input",
          label: "Prefix to delete",
          id: "inputPrefixDelete",
          tooltip: "Prefix to delete",
          advanced: true
        },
        {
          type: "input",
          label: "Prefix to add",
          id: "inputPrefixAdd",
          tooltip: "Prefix to add",
          advanced: true
        },
        {
          type: "input",
          label: "Suffix to delete",
          id: "inputSuffixDelete",
          tooltip: "Suffix to delete",
          advanced: true
        },
        {
          type: "input",
          label: "Suffix to add",
          id: "inputSuffixAdd",
          tooltip: "Suffix to add",
          advanced: true
        },
      ],
    };

    const description = "Dynamically rename columns based on selected transformations such as case conversion, special character handling, and prefix/suffix modifications.";

    super("Dynamic Rename Columns", "DynamicRenameColumns", description, "pandas_df_processor", [], "transforms", renameIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from itertools import combinations"
    ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to perform frequency analysis
    const DynamicRenameColumnsFunction = `
def dynamic_rename_dataframe_columns(
    df: pd.DataFrame,
    columns=None,
    case: str = "none",
    special_chars: str = "none",
    replace_char: str = "_",
    prefix_to_delete: str = None,
    prefix_to_add: str = None,
    suffix_to_delete: str = None,
    suffix_to_add: str = None,
) -> pd.DataFrame:
    """
    Rename columns of a DataFrame according to specified transformations.

    Transformations are applied in this order:
    1. Case change
    2. Special character handling
    3. Prefix deletion
    4. Prefix addition
    5. Suffix deletion
    6. Suffix addition
    """

    def to_camel_case(s: str, upper_first: bool = False) -> str:
        parts = [p for p in re.split(r'[^a-zA-Z0-9]+', s) if p]
        if not parts:
            return s
        first = parts[0].lower()
        rest = ''.join(word.capitalize() for word in parts[1:])
        result = first + rest
        if upper_first:
            result = result[0].upper() + result[1:]
        return result

    def to_snake_case(s: str) -> str:
        # Keep underscores, but collapse multiple special characters into one underscore
        s = re.sub(r'[^a-zA-Z0-9_]+', '_', s)
        s = re.sub(r'_+', '_', s)  # collapse consecutive underscores
        return s.strip('_').lower()

    def transform(col: str) -> str:
        new_col = col

        # 1. Case conversion
        if case == "lower":
            new_col = new_col.lower()
        elif case == "upper":
            new_col = new_col.upper()
        elif case == "camel_lower":
            new_col = to_camel_case(new_col, upper_first=False)
        elif case == "camel_upper":
            new_col = to_camel_case(new_col, upper_first=True)
        elif case == "snake":
            new_col = to_snake_case(new_col)

        # 2. Special characters (skip for snake case since it already handles them)
        if case != "snake" and special_chars == "replace":
            new_col = re.sub(r'[^0-9a-zA-Z]+', replace_char, new_col)

        # 3. Prefix deletion
        if prefix_to_delete and new_col.startswith(prefix_to_delete):
            new_col = new_col[len(prefix_to_delete):]

        # 4. Prefix addition
        if prefix_to_add:
            new_col = f"{prefix_to_add}{new_col}"

        # 5. Suffix deletion
        if suffix_to_delete and new_col.endswith(suffix_to_delete):
            new_col = new_col[: -len(suffix_to_delete)]

        # 6. Suffix addition
        if suffix_to_add:
            new_col = f"{new_col}{suffix_to_add}"

        return new_col

    # Determine which columns to rename
    if columns is None:
        columns = df.columns.tolist()

    rename_map = {col: transform(col) for col in columns}
    return df.rename(columns=rename_map)

    `;
    return [DynamicRenameColumnsFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {

    const combinationColumns_step1 = [];
    // If no columns are selected, pass None so that the Python function uses all columns(default).
    let combinationColumns = "None";
    if (config.combinationColumns?.length > 0) {
      combinationColumns = `[${config.combinationColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

    const const_ts_global_case_operation = config.selectGlobalCaseOperation ?? "none";
    const const_ts_action_special_characters = config.selectActionSpecialCharacters ?? "";
    const const_ts_char_replacement = config.inputCharReplacement ?? "";
    const const_ts_prefix_delete = config.inputPrefixDelete ?? "";
    const const_ts_prefix_add = config.inputPrefixAdd ?? "";
    const const_ts_suffix_delete = config.inputSuffixDelete ?? "";
    const const_ts_suffix_add = config.inputSuffixAdd ?? "";


    return `

${outputName} = dynamic_rename_dataframe_columns(df=${inputName},columns=${combinationColumns},case = '${const_ts_global_case_operation}', special_chars='${const_ts_action_special_characters}',replace_char='${const_ts_char_replacement}',prefix_to_delete='${const_ts_prefix_delete}', prefix_to_add='${const_ts_prefix_add}',suffix_to_delete='${const_ts_suffix_delete}', suffix_to_add='${const_ts_suffix_add}')
    `;
  }
}
