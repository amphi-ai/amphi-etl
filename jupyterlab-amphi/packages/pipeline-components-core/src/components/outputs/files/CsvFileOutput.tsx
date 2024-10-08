import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class CsvFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", csvOptions: { sep: ",", header: true, index: false } };
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
          validation: "\\.(csv|tsv|txt)$",
          validationMessage: "This field expects a file with a csv, tsv or txt extension such as output.csv."
        },
        {
          type: "selectCustomizable",
          label: "Separator",
          id: "csvOptions.sep",
          placeholder: "auto",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" },
            { value: "  ", label: "tab" },
            { value: "|", label: "pipe (|)" }
          ],
        },
        {
          type: "boolean",
          label: "Create folders if don't exist",
          id: "createFoldersIfNotExist",
          condition: { fileLocation: ["local"] },
          advanced: true
        },
        {
          type: "radio",
          label: "Mode",
          id: "csvOptions.mode",
          options: [
            { value: "w", label: "Write" },
            { value: "x", label: "Exclusive Creation" },
            { value: "a", label: "Append" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Header",
          id: "csvOptions.header",
          advanced: true
        },
        {
          type: "boolean",
          label: "Row index",
          tooltip: "Write row names (index).",
          id: "csvOptions.index",
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
    const description = "Use CSV File Output to write or append data to a CSV file locally or remotely (S3)."

    super("CSV File Output", "csvFileOutput", description, "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {

    let csvOptions = { ...config.csvOptions };

    // Initialize storage_options if not already present
    let storageOptions = csvOptions.storage_options || {};

    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    // Only add storage_options to csvOptions if it's not empty
    if (Object.keys(storageOptions).length > 0) {
      csvOptions.storage_options = storageOptions;
    }

    let optionsString = Object.entries(csvOptions)
    .filter(([key, value]) => value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}=${value ? 'True' : 'False'}`;
      } else if (key === 'storage_options') {
        return `${key}=${JSON.stringify(value)}`; 
      }
      return `${key}='${value}'`;
    })
    .join(', ');

    // Add comma only if optionsString is not empty
    optionsString = optionsString ? `, ${optionsString}` : '';

    const createFoldersCode = config.createFoldersIfNotExist ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n` : '';

    const code = `
# Export to CSV file
${createFoldersCode}${inputName}.to_csv("${config.filePath}"${optionsString})
`;
    return code;
  }
}
