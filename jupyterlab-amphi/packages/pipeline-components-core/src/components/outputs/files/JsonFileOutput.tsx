
import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class JsonFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { jsonOptions: { "orient": "records" } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name",
          validation: "\.(json|jsonl)$",
          validationMessage: "This field expects a file with a json or jsonl extension such as output.json."
        },
        {
          type: "select",
          label: "Orientation",
          id: "jsonOptions.orient",
          placeholder: "Select orientation",
          options: [
            { value: "columns", label: "columns (JSON object with column labels as keys)" },
            { value: "records", label: "records (List of rows as JSON objects)" },
            { value: "index", label: "index (Dict with index labels as keys)" },
            { value: "split", label: "split (Dict with 'index', 'columns', and 'data' keys)" },
            { value: "table", label: "table (Dict with 'schema' and 'data' keys, following the Table Schema)" }
          ],
        },
        {
          type: "boolean",
          label: "Create folders if don't exist",
          id: "createFoldersIfNotExist",
          advanced: true
        },
      ],
    };

    super("JSON File Output", "jsonFileOutput", "pandas_df_output", [], "output", filePlusIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({config, inputName}): string {

    let optionsString = Object.entries(config.jsonOptions || {})
        .filter(([key, value]) => value !== null && value !== '')
        .map(([key, value]) => `${key}="${value}"`)
        .join(', ');

    const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

    const createFoldersCode = config.createFoldersIfNotExist ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n` : '';

    const code = `
# Export to JSON file
${createFoldersCode}${inputName}.to_json("${config.filePath}"${optionsCode})
`;
    return code;
  }  


}
