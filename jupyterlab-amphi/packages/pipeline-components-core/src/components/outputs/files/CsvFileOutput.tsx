import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class CsvFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { csvOptions: { sep: ",", header: true, index: false } };
    const form = {
      idPrefix: "component__form",
      fields: [
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
        }
      ],
    };

    super("CSV File Output", "csvFileOutput", "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {

    let optionsString = Object.entries(config.csvOptions)
    .filter(([key, value]) => value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}=${value ? 'True' : 'False'}`;
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
