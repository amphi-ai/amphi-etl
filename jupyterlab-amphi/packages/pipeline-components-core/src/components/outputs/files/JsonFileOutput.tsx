
import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class JsonFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", jsonOptions: { "orient": "records" } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "File Location",
          id: "fileLocation",
          options: [
            { value: "local", label: "Local" },
            { value: "s3", label: "S3" }
          ],
          advanced: true
        },
        ...S3OptionsHandler.getAWSFields(),
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
          condition: { fileLocation: ["local"] },
          id: "createFoldersIfNotExist",
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "csvOptions.storage_options",
          condition: { fileLocation: ["s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use JSON File Output to write or append data to a JSON file locally or remotely (S3)."

    super("JSON File Output", "jsonFileOutput", description, "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    const optionsString = this.generateOptionsCode(config);
    const createFoldersCode = config.createFoldersIfNotExist 
      ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n`
      : '';

    const code = `
# Export to JSON file
${createFoldersCode}${inputName}.to_json("${config.filePath}"${optionsString})
`;
    return code.trim();
  }

  public generateOptionsCode(config): string {
    let jsonOptions = { ...config.jsonOptions };

    // Handle storage options
    let storageOptions = jsonOptions.storage_options || {};
    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    if (Object.keys(storageOptions).length > 0) {
      jsonOptions.storage_options = storageOptions;
    }

    // Generate options string
    let optionsEntries = Object.entries(jsonOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}="${value}"`;
      });

    const optionsString = optionsEntries.join(', ');
    return optionsString ? `, ${optionsString}` : '';
  }

}
