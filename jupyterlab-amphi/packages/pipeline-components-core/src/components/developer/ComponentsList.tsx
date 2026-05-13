// Import necessary icons and the base component
import { componentListIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

// Main component definition
export class ComponentsList extends BaseCoreComponent {
  
  // Constructor to define the component's structure
  constructor() {
    const defaultConfig = {
		tsCFinputAmphiProjectPath:""
	};

    // Define the form structure
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Info",
          id: "tsCFinfoDescription",
          text: "List of the available Amphi Components. Please note this tool will be updated with a folder input soon. \n You have to specify where you cloned your project.",
          advanced: false
        },
        {
          type: "input",
          label: "Amphi Project Path",
          id: "tsCFinputAmphiProjectPath",
		  placeholder: "local path ending by /amphi-etl",
          advanced: false
        },
      ]
    };

    // Tooltip description for the component in the menu
    const description = "List of the available Amphi Components";

    // Call the parent class constructor with component details
    super(
      "Components List",
      "Components_list",
      description,
      "pandas_df_input",
      [],
      "developer",
      componentListIcon,
      defaultConfig,
      form
    );
  }

  // List of additional Python package imports required for this component
  public provideImports({ config }): string[] {
    return [
	  "import re",
      "from pathlib import Path",
      "from typing import Optional, Dict, List, Set",
      "import pandas as pd"
    ];
  }

  // Define the Python function
  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";

    const tsComponentsListFunction = `
def py_fn_amphi_components_list(py_arg_amphi_project_path: str) -> pd.DataFrame:
    """
    Build a dataframe listing Amphi TSX components and extracted metadata.
 
    The function scans TSX files from:
    - jupyterlab-amphi/packages/pipeline-components-core/src/components
    - jupyterlab-amphi/packages/pipeline-components-local/src/components
 
    It also checks activation in UI from:
    - jupyterlab-amphi/packages/pipeline-components-core/src/index.ts
    - jupyterlab-amphi/packages/pipeline-components-local/src/index.ts
 
    Parameters
    ----------
    py_arg_amphi_project_path : str
        Root path of the Amphi project.
 
    Returns
    -------
    pd.DataFrame
        One row per TSX file with columns:
        - full_path (string)
        - file_name (string)
        - directory (string)
        - class_name (string)
        - ui_name (string)
        - technical_name (string)
        - super_description (string)
        - ui_category (string)
        - const_description (string)
        - coalesced_description (string)
        - activated_in_ui (bool)
    """
    py_var_root_path = Path(py_arg_amphi_project_path)
 
    py_var_components_directories: List[Path] = [
        py_var_root_path / "jupyterlab-amphi" / "packages" / "pipeline-components-core" / "src" / "components",
        py_var_root_path / "jupyterlab-amphi" / "packages" / "pipeline-components-local" / "src" / "components",
    ]
 
    py_var_index_files: List[Path] = [
        py_var_root_path / "jupyterlab-amphi" / "packages" / "pipeline-components-core" / "src" / "index.ts",
        py_var_root_path / "jupyterlab-amphi" / "packages" / "pipeline-components-local" / "src" / "index.ts",
    ]
 
    py_var_activated_class_names = _extract_activated_class_names(py_arg_index_files=py_var_index_files)
 
    py_var_records: List[Dict[str, object]] = []
 
    for py_var_components_directory in py_var_components_directories:
        if not py_var_components_directory.exists():
            continue
 
        for py_var_tsx_file in py_var_components_directory.rglob("*.tsx"):
            py_var_content = _read_text_file(py_arg_file_path=py_var_tsx_file)
 
            py_var_super_arguments = _extract_super_arguments(py_arg_content=py_var_content)
            py_var_class_name = _extract_class_name(py_arg_content=py_var_content)
            py_var_const_description = _extract_const_description(py_arg_content=py_var_content)
 
            py_var_ui_name = py_var_super_arguments[0] if len(py_var_super_arguments) > 0 else None
            py_var_technical_name = py_var_super_arguments[1] if len(py_var_super_arguments) > 1 else None
            py_var_super_description = py_var_super_arguments[2] if len(py_var_super_arguments) > 2 else None
            py_var_ui_category = py_var_super_arguments[5] if len(py_var_super_arguments) > 5 else None
 
            py_var_coalesced_description = (
                py_var_const_description if py_var_const_description else py_var_super_description
            )
            py_var_activated_in_ui = bool(
                py_var_class_name and py_var_class_name in py_var_activated_class_names
            )
 
            py_var_records.append(
                {
                    "full_path": _to_str(py_arg_value=py_var_tsx_file.resolve()),
                    "file_name": _to_str(py_arg_value=py_var_tsx_file.name),
                    "directory": _to_str(py_arg_value=py_var_tsx_file.resolve().parent),
                    "class_name": _to_str(py_arg_value=py_var_class_name),
                    "ui_name": _to_str(py_arg_value=py_var_ui_name),
                    "technical_name": _to_str(py_arg_value=py_var_technical_name),
                    "super_description": _to_str(py_arg_value=py_var_super_description),
                    "ui_category": _to_str(py_arg_value=py_var_ui_category),
                    "const_description": _to_str(py_arg_value=py_var_const_description),
                    "coalesced_description": _to_str(py_arg_value=py_var_coalesced_description),
                    "activated_in_ui": py_var_activated_in_ui,
                }
            )
 
    py_df_components = pd.DataFrame(py_var_records)
 
    py_var_string_columns = [
        "full_path",
        "file_name",
        "directory",
        "class_name",
        "ui_name",
        "technical_name",
        "super_description",
        "ui_category",
        "const_description",
        "coalesced_description",
    ]
 
    for py_var_column in py_var_string_columns:
        py_df_components[py_var_column] = py_df_components[py_var_column].astype("string")
 
    py_df_components["activated_in_ui"] = py_df_components["activated_in_ui"].astype(bool)
 
    return py_df_components
 
 
def _to_str(py_arg_value: Optional[object]) -> str:
    """Convert value to string. None becomes empty string."""
    if py_arg_value is None:
        return ""
    return str(py_arg_value)
 
 
def _read_text_file(py_arg_file_path: Path) -> str:
    """Read file content using utf-8, fallback to latin-1."""
    try:
        return py_arg_file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return py_arg_file_path.read_text(encoding="latin-1")
 
 
def _extract_super_arguments(py_arg_content: str) -> List[Optional[str]]:
    """Extract arguments from the first super(...) call."""
    py_const_antislash=chr(92)	
    py_var_match = re.search(rf"{py_const_antislash}bsuper{py_const_antislash}s*{py_const_antislash}((.*?){py_const_antislash}){py_const_antislash}s*;", py_arg_content, flags=re.DOTALL)
    if not py_var_match:
        return []
 
    py_var_raw_arguments = py_var_match.group(1)
    py_var_tokens = _split_top_level_arguments(py_arg_arguments=py_var_raw_arguments)
    return [_normalize_argument(py_arg_token=py_var_token) for py_var_token in py_var_tokens]
 
 
def _split_top_level_arguments(py_arg_arguments: str) -> List[str]:
    """Split arguments by commas, ignoring commas in nested structures, quotes and comments."""
    
    py_var_tokens: List[str] = []
    py_var_current: List[str] = []

    py_var_depth_parentheses = 0
    py_var_depth_brackets = 0
    py_var_depth_braces = 0

    py_var_in_single_quote = False
    py_var_in_double_quote = False

    py_var_in_line_comment = False
    py_var_in_block_comment = False

    py_var_escaped = False

    py_var_length = len(py_arg_arguments)
    py_var_index = 0
    py_const_antislash=chr(92)
    py_const_line_feed=chr(10)	
    while py_var_index < py_var_length:
        py_var_character = py_arg_arguments[py_var_index]

        py_var_next = (
            py_arg_arguments[py_var_index + 1]
            if py_var_index + 1 < py_var_length
            else ""
        )

        # ---------------------------------------------------------
        # Line comments
        # ---------------------------------------------------------

        if py_var_in_line_comment:
            if py_var_character == py_const_line_feed:
                py_var_in_line_comment = False
            py_var_index += 1
            continue

        # ---------------------------------------------------------
        # Block comments
        # ---------------------------------------------------------

        if py_var_in_block_comment:
            if py_var_character == "*" and py_var_next == "/":
                py_var_in_block_comment = False
                py_var_index += 2
                continue

            py_var_index += 1
            continue

        # ---------------------------------------------------------
        # Start comments
        # ---------------------------------------------------------

        if (
            not py_var_in_single_quote
            and not py_var_in_double_quote
        ):
            if py_var_character == "/" and py_var_next == "/":
                py_var_in_line_comment = True
                py_var_index += 2
                continue

            if py_var_character == "/" and py_var_next == "*":
                py_var_in_block_comment = True
                py_var_index += 2
                continue

        # ---------------------------------------------------------
        # Escaped characters
        # ---------------------------------------------------------

        if py_var_escaped:
            py_var_current.append(py_var_character)
            py_var_escaped = False
            py_var_index += 1
            continue

        if py_var_character == f"{py_const_antislash}{py_const_antislash}":
            py_var_current.append(py_var_character)
            py_var_escaped = True
            py_var_index += 1
            continue

        # ---------------------------------------------------------
        # Quotes
        # ---------------------------------------------------------

        if py_var_in_single_quote:
            py_var_current.append(py_var_character)

            if py_var_character == "'":
                py_var_in_single_quote = False

            py_var_index += 1
            continue

        if py_var_in_double_quote:
            py_var_current.append(py_var_character)

            if py_var_character == '"':
                py_var_in_double_quote = False

            py_var_index += 1
            continue

        if py_var_character == "'":
            py_var_current.append(py_var_character)
            py_var_in_single_quote = True
            py_var_index += 1
            continue

        if py_var_character == '"':
            py_var_current.append(py_var_character)
            py_var_in_double_quote = True
            py_var_index += 1
            continue

        # ---------------------------------------------------------
        # Nesting depth
        # ---------------------------------------------------------

        if py_var_character == "(":
            py_var_depth_parentheses += 1

        elif py_var_character == ")":
            py_var_depth_parentheses -= 1

        elif py_var_character == "[":
            py_var_depth_brackets += 1

        elif py_var_character == "]":
            py_var_depth_brackets -= 1

        elif py_var_character == "{":
            py_var_depth_braces += 1

        elif py_var_character == "}":
            py_var_depth_braces -= 1

        # ---------------------------------------------------------
        # Top-level comma
        # ---------------------------------------------------------

        if (
            py_var_character == ","
            and py_var_depth_parentheses == 0
            and py_var_depth_brackets == 0
            and py_var_depth_braces == 0
        ):
            py_var_tokens.append("".join(py_var_current).strip())
            py_var_current = []
            py_var_index += 1
            continue

        py_var_current.append(py_var_character)
        py_var_index += 1

    if py_var_current:
        py_var_tokens.append("".join(py_var_current).strip())

    return py_var_tokens
 
 
def _normalize_argument(py_arg_token: str) -> Optional[str]:
    """Normalize a token from super(...) arguments."""
    py_var_token = py_arg_token.strip()
    if not py_var_token:
        return None
 
    if len(py_var_token) >= 2 and py_var_token[0] == '"' and py_var_token[-1] == '"':
        return py_var_token[1:-1]
 
    if len(py_var_token) >= 2 and py_var_token[0] == "'" and py_var_token[-1] == "'":
        return py_var_token[1:-1]
 
    return py_var_token
 
 
def _extract_const_description(py_arg_content: str) -> Optional[str]:
    """Extract const description value with flexible spaces and quotes."""
    #due to escaped characters an some specificities, we cut the search string and use chr
    py_const_antislash=chr(92)
    py_const_inf="<"
    py_const_sup=">"
    py_const_single_quote=chr(39)
    py_const_double_quote=chr(34)
    py_const_search_description_part1=rf"^{py_const_antislash}s*const{py_const_antislash}s+description{py_const_antislash}s*={py_const_antislash}s*(?P"
    py_const_search_description_part2=rf"{py_const_inf}quote{py_const_sup}['{py_const_antislash}"
    py_const_search_description_part3=rf"{py_const_double_quote}])(?P{py_const_inf}value{py_const_sup}.*?)(?P=quote){py_const_antislash}s*;"
    py_const_search_description=f"{py_const_search_description_part1}{py_const_search_description_part2}{py_const_search_description_part3}"
    #warning when printing, the strings between <> aren't displayed 
    #print(py_const_search_description)
    #but you can control through a text export
    #f = open( 'test_search_desc.txt', 'w' )
    #f.write(py_const_search_description)
    #f.close()
    py_var_match = re.search(
        #rf"^\s*const\s+description\s*=\s*(?P<quote>['\"])(?P<value>.*?)(?P=quote)\s*;",
        f"{py_const_search_description_part1}{py_const_search_description_part2}{py_const_search_description_part3}",
        py_arg_content,
        flags=re.MULTILINE | re.DOTALL,
    )
    if not py_var_match:
        return None
    return py_var_match.group("value")
 
 
def _extract_class_name(py_arg_content: str) -> Optional[str]:
    """Extract class name from: export class MyClass extends ..."""
    #due to escaped characters an some specificities, we cut the search string and use chr
    py_const_antislash=chr(92)
    py_const_inf="<"
    py_const_sup=">"
    py_const_single_quote=chr(39)
    py_const_double_quote=chr(34)
    py_const_search_class_name_part1=rf"^{py_const_antislash}s*export{py_const_antislash}s+class{py_const_antislash}s+([A-Za-z_][A-Za-z0-9_]*){py_const_antislash}s+extends{py_const_antislash}b"
    #py_const_search_class_name_part2=rf"{py_const_inf}quote{py_const_sup}['{py_const_antislash}"
    #py_const_search_class_name_part3=rf"{py_const_double_quote}])(?P{py_const_inf}value{py_const_sup}.*?)(?P=quote){py_const_antislash}s*;"
    py_const_search_class_name=f"{py_const_search_class_name_part1}"
    #warning when printing, the strings between <> aren't displayed 
    #print(py_const_search_class_name)
    #but you can control through a text export
    #f = open( 'test_search_desc.txt', 'w' )
    #f.write(py_const_search_class_name)
    #f.close()
    py_var_match = re.search(
        #rf"^\s*export\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\s+extends\b",
        rf"{py_const_search_class_name}",
        py_arg_content,
        flags=re.MULTILINE,
    )
    if not py_var_match:
        return None
    return py_var_match.group(1)
 
 
def _extract_activated_class_names(py_arg_index_files: List[Path]) -> Set[str]:
    """Extract activated class names from uncommented addComponent(...getInstance()) lines."""
    py_var_names: Set[str] = set()
    #due to escaped characters an some specificities, we cut the search string and use chr
    py_const_antislash=chr(92)
    py_const_inf="<"
    py_const_sup=">"
    py_const_single_quote=chr(39)
    py_const_double_quote=chr(34)
    py_const_search_activated_class_name_part1=rf"{py_const_antislash}bcomponentService{py_const_antislash}.addComponent{py_const_antislash}s*{py_const_antislash}({py_const_antislash}s*([A-Za-z_][A-Za-z0-9_]*){py_const_antislash}.getInstance{py_const_antislash}s*{py_const_antislash}({py_const_antislash}s*{py_const_antislash}){py_const_antislash}s*{py_const_antislash})"
    #py_const_search_class_name_part2=rf"{py_const_inf}quote{py_const_sup}['{py_const_antislash}"
    #py_const_search_class_name_part3=rf"{py_const_double_quote}])(?P{py_const_inf}value{py_const_sup}.*?)(?P=quote){py_const_antislash}s*;"
    py_const_search_activated_class_name=f"{py_const_search_activated_class_name_part1}"
    #warning when printing, the strings between <> aren't displayed 
    #print(py_const_search_class_name)
    #but you can control through a text export
    #f = open( 'test_search_desc.txt', 'w' )
    #f.write(py_const_search_activated_class_name)
    #f.close()
    py_var_names: Set[str] = set()
    py_const_pattern = re.compile(
        #rf"\bcomponentService\.addComponent\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\.getInstance\s*\(\s*\)\s*\)"
        rf"{py_const_search_activated_class_name}"
    )
 
    for py_var_index_file in py_arg_index_files:
        if not py_var_index_file.exists():
            continue
 
        py_var_content = _read_text_file(py_arg_file_path=py_var_index_file)
 
        for py_var_line in py_var_content.splitlines():
            py_var_stripped_line = py_var_line.strip()
            if not py_var_stripped_line:
                continue
            if py_var_stripped_line.startswith("//"):
                continue
 
            py_var_call_position = py_var_stripped_line.find("componentService.addComponent")
            py_var_comment_position = py_var_stripped_line.find("//")
            if py_var_comment_position != -1 and (
                py_var_call_position == -1 or py_var_comment_position < py_var_call_position
            ):
                continue
 
            py_var_match = py_const_pattern.search(py_var_stripped_line)
            if py_var_match:
                py_var_names.add(py_var_match.group(1))
 
    return py_var_names
    `;

    return [tsComponentsListFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, outputName }: { config: any; outputName: string }): string {
    let tsConstAmphiProjectPath = 'None';
    if (config.tsCFinputAmphiProjectPath && config.tsCFinputAmphiProjectPath.trim() !== '' 
	) {
      tsConstAmphiProjectPath = '"' + config.tsCFinputAmphiProjectPath+ '"';
    }	
		
    return `
${outputName}=py_fn_amphi_components_list(
    py_arg_amphi_project_path =  ${tsConstAmphiProjectPath}
)

    `;
  }
}
