import { FileActionIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class FileAction extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      action_on_file_all: "move",
      source_file_path : "",
      action_on_file : "",
      destination_path : "",
      file_new_name : "",
      overwrite_file_if_exists : "",
      retry_count : 0
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Action on file",
          id: "action_on_file_all",
          options: [
            { value: "move", label: "Move" },
            { value: "delete", label: "Delete" },
            { value: "rename", label: "Rename" },
            { value: "copy", label: "Copy" },
            { value: "zip", label: "Zip" },
            { value: "create as empty", label: "Create as empty" },
            { value: "", label: "From Field" }
          ],
          advanced: true
        },
        {
          type: "column",
          label: "Source file path",
          allowedTypes: ["string"],
          id: "source_file_path",
          placeholder: "Column name",
          advanced: true
        },
        {
          type: "column",
          label: "Action on file",
          tooltip: "Action to perform: move, delete, copy, rename, zip,create as empty (string)",
          allowedTypes: ["string"],
          id: "action_on_file",
          placeholder: "Column name",
          condition: { action_on_file_all: ""},
          advanced: true
        },
        {
          type: "column",
          label: "Destination path",
          tooltip: "Destination path such as C:/windows/result/file.txt or /your/destination/path",
          allowedTypes: ["string"],
          id: "destination_path",
          placeholder: "/your/destination/path",
          condition: { action_on_file_all: ["","move","copy"]},
          advanced: true
        },
        {
          type: "column",
          label: "New name",
          tooltip: "New name for the file",
          allowedTypes: ["string"],
          id: "file_new_name",
          placeholder: "Column name",
          condition: { action_on_file_all: ["","rename"]},
          advanced: true
        },
        {
          type: "column",
          label: "Overwrite if exists",
          id: "overwrite_file_if_exists",
          placeholder: "Column name",
          condition: { action_on_file_all: ["","move","copy","zip","rename"]},
          advanced: true
        },
        {
          type: "column",
          label: "Retry Count(integer)",
          allowedTypes: ["numeric"],
          id: "retry_count",
          placeholder: "Column name",
          advanced: true
        },
        {
          type: "info",
          id: "description",
          text: "⚠️ As of now, all fields are mandatory, meaning you have too choose From Field, fill all options (even with a dummy column) and then stay on From Field or Choose an action for all rows",
          advanced: false
        },
      ],
    };

    const description = "Delete, move, rename, zip.. files";

    super("File Action", "FileAction", description, "pandas_df_processor", [], "File Management", FileActionIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "import os",
      "import shutil",
      "import zipfile"
      ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Functions to normalize and do the file action
    const FileActionFunction = `
def normalize_path(path):
    #Normalize a file path and replace backslashes with slashes for cross-platform consistency.
    #backslash is an escape character so we use the character number
    if pd.isna(path):
        return None
    return os.path.normpath(str(path)).replace(chr(92), "/")

def normalize_input_dataframe(
    input_df,
    file_path_col='file_path',
    destination_col='destination',
    action_col='action',
    new_name_col='new_name',
    overwrite_col='overwrite_if_exists',
    retry_count_col='retry_count',
    action_from_form=""
):

    allowed_actions = {'delete', 'move', 'copy', 'zip', 'rename', 'create as empty'}

    df = input_df.copy()

    # Normalize file paths
    df['normalized_file_path'] = df[file_path_col].apply(normalize_path)

    if destination_col in df.columns:
        df['normalized_destination'] = df[destination_col].apply(normalize_path)
    else:
        df['normalized_destination'] = ""

    # Normalize actions: trim, lowercase, validate, fallback to "unknown"
    def resolve_action(row_action):
        action = str(action_from_form).strip().lower() if action_from_form and str(action_from_form).strip().lower() != "undefined"  else str(row_action).strip().lower()
        return action if action in allowed_actions else "unknown"

    df['normalized_action'] = df[action_col].apply(resolve_action)

    # Enforce string data type for normalized columns
    df = df.astype({
        'normalized_file_path': 'string',
        'normalized_destination': 'string',
        'normalized_action': 'string'
    })

    return df
#################################################################
def handle_file_safe(file_path, action, destination=None, new_name=None, overwrite=False, retry_count=0):
    # Handle NaN values for overwrite and retry_count
    overwrite = False if pd.isna(overwrite) else overwrite
    retry_count = 0 if pd.isna(retry_count) else retry_count
    
    file_path = normalize_path(file_path)  # Normalize the input file path

    # Normalize the destination and new name if they exist
    if  not pd.isna(destination):
        destination = normalize_path(destination)
    
    if  not pd.isna(new_name):  # Ensure new_name isn't NA before normalizing
        new_name = normalize_path(new_name)
    
    attempt = 0
    while attempt <= retry_count:
        try:
            if action == 'delete':
                if pd.isna(file_path) or not os.path.exists(file_path):
                    return 'failure', f"File not found: {file_path}"

                os.remove(file_path)
                return 'success', f"Deleted: {file_path}"

            elif action in ['move', 'copy']:
                if pd.isna(destination) or not os.path.exists(file_path):
                    return 'failure', f"Source file not found or destination missing: {file_path}"

                dest_dir = os.path.dirname(destination)
                if not os.path.exists(dest_dir):
                    try:
                        os.makedirs(dest_dir)
                    except Exception as e:
                        return 'failure', f"Cannot create destination folder: {dest_dir} ({e})"

                if os.path.exists(destination) and not overwrite:
                    return 'failure', f"Destination file already exists: {destination}"

                if action == 'move':
                    shutil.move(file_path, destination)
                else:
                    shutil.copy(file_path, destination)

                return 'success', f"{action.title()}d to {destination}"

            elif action == 'rename':
                if pd.isna(new_name) or pd.isna(file_path):
                    return 'failure', "new_name missing or file_path invalid for rename"
                
                new_path = os.path.join(os.path.dirname(file_path), new_name)
                if os.path.exists(new_path) and not overwrite:
                    return 'failure', f"Target name already exists: {new_path}"

                os.rename(file_path, new_path)
                return 'success', f"Renamed to {new_path}"

            elif action == 'create as empty':
                if pd.isna(file_path):
                    return 'failure', "File path is missing for create as empty"
                
                dir_name = os.path.dirname(file_path)
                if dir_name and not os.path.exists(dir_name):
                    os.makedirs(dir_name)

                if os.path.exists(file_path) and not overwrite:
                    return 'failure', f"File already exists: {file_path}"

                with open(file_path, 'w') as f:
                    pass
                return 'success', f"Empty file created: {file_path}"

            elif action == 'zip':
                if pd.isna(file_path) or not os.path.exists(file_path):
                    return 'failure', f"File not found: {file_path}"

                zip_dest = destination if not pd.isna(destination) else f"{file_path}.zip"
                zip_dir = os.path.dirname(zip_dest)

                if not pd.isna(zip_dir) and not os.path.exists(zip_dir):
                    try:
                        os.makedirs(zip_dir)
                    except Exception as e:
                        return 'failure', f"Cannot create zip destination folder: {zip_dir} ({e})"

                if os.path.exists(zip_dest) and not overwrite:
                    return 'failure', f"Zip file already exists: {zip_dest}"

                with zipfile.ZipFile(zip_dest, 'w') as zipf:
                    zipf.write(file_path, os.path.basename(file_path))

                return 'success', f"Zipped to {zip_dest}"

            else:
                return 'failure', f"Unknown action: {action}"

        except Exception as e:
            if attempt < retry_count:
                time.sleep(1)  # pause before retry
                attempt += 1
            else:
                return 'failure', f"Exception after {attempt+1} attempt(s) during '{action}' on {file_path}: {e}"
    `;
    return [FileActionFunction];
  }

  // Generate the Python execution script
public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
const source_file_path_value =  config.source_file_path?.value ?? "";
console.log(source_file_path_value);
const destination_path_value = config.destination_path?.value ?? "";
console.log(destination_path_value);
const action_on_file_value = config.action_on_file?.value ?? "";
console.log(action_on_file_value);
const file_new_name_value = config.file_new_name?.value ?? "";
console.log(file_new_name_value);
const overwrite_file_if_exists_value = config.overwrite_file_if_exists?.value ?? "";
console.log(overwrite_file_if_exists_value);
const retry_count_value = config.retry_count?.value ?? "";
console.log(retry_count_value);
const action_on_file_all_value = config.action_on_file_all ?? "";
console.log(action_on_file_all_value);
    return `
# Execute the file action function
${outputName} = []

normalized_input_dataframe=normalize_input_dataframe(
    input_df=${inputName},
    file_path_col='${source_file_path_value}',
    destination_col='${destination_path_value}',
    action_col='${action_on_file_value}',
    new_name_col='${file_new_name_value}',
    overwrite_col='${overwrite_file_if_exists_value}',
    retry_count_col='${retry_count_value}',
    action_from_form='${action_on_file_all_value}'
)
results = normalized_input_dataframe.apply(
    lambda row: handle_file_safe(
        file_path=row['normalized_file_path'],
        action=row['normalized_action'],
        destination=row.get('normalized_destination'),
        new_name=row.get('${file_new_name_value}'),
        overwrite=row['${overwrite_file_if_exists_value}'],
        retry_count=row['${retry_count_value}']
    ),
    axis=1
)

# Unpack results into 'status' and 'reason' columns as strings
normalized_input_dataframe['status'] = results.apply(lambda x: str(x[0]))  # Ensure status is a string
normalized_input_dataframe['reason'] = results.apply(lambda x: str(x[1]))  # Ensure reason is a string
normalized_input_dataframe=normalized_input_dataframe.astype({
        "status": "string",
        "reason": "string"
    })
# The output dataframe
${outputName} = normalized_input_dataframe.copy()
del normalized_input_dataframe
    `;
  }
}
