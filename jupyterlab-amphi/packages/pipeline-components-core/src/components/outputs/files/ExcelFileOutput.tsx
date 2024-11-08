import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class ExcelFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", excelOptions: { header: true }, engine: 'xlsxwriter' };
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
          validation: "\\.(xlsx)$",
          validationMessage: "This field expects a file with a xlsx extension such as output.xlsx."
        },
        {
          type: "input",
          label: "Sheet",
          id: "excelOptions.sheet_name",
          placeholder: "default: Sheet1"
        },
        {
          type: "boolean",
          label: "Create folders if don't exist",
          condition: { fileLocation: ["local"] },
          id: "createFoldersIfNotExist",
          advanced: true
        },
        {
          type: "radio",
          label: "Mode",
          id: "mode",
          options: [
            { value: "write", label: "Write" },
            { value: "append", label: "Append" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Header",
          id: "excelOptions.header",
          advanced: true
        },
        {
          type: "boolean",
          label: "Row index",
          tooltip: "Write row names (index).",
          id: "excelOptions.index",
          advanced: true
        },
        {
          type: "select",
          label: "Engine",
          id: "engine",
          tooltip: "Depending on the file format, different engines might be used.\nopenpyxl supports newer Excel file formats.\n calamine supports Excel (.xls, .xlsx, .xlsm, .xlsb) and OpenDocument (.ods) file formats.\n odf supports OpenDocument file formats (.odf, .ods, .odt).\n pyxlsb supports Binary Excel files.\n xlrd supports old-style Excel files (.xls).",
          options: [
            { value: "openpyxl", label: "openpyxl" },
            { value: "xlsxwriter", label: "xlsxwriter" }
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "csvOptions.storage_options",
          condition: { fileLocation: ["s3"] },
          advanced: true
        },
        
      ],
    };
    const description = "Use Excel File Output to write or append data to an Excel file locally or remotely (S3)."

    super("Excel File Output", "excelFileOutput", description, "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];

    const engine = config.engine;
    
    if (engine === 'None' || engine === 'openpyxl') {
      deps.push('openpyxl');
    } if (engine === 'xlsxwriter') {
      deps.push('xlsxwriter');
    }

    return deps;
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
    const engine = config.engine !== 'None' ? `'${config.engine}'` : config.engine;

    let code = '';
    if (config.excelOptions.mode === 'append') {
      code = `
# Exporting to Excel (append mode)
with pd.ExcelWriter("${config.filePath}", mode="a", engine=${engine}) as writer:
    ${inputName}.to_excel(writer${optionsString})
`;
    } else {
      code = `
# Exporting to Excel
${inputName}.to_excel("${config.filePath}", engine=${engine}${optionsString})
`;
    }

    return `${createFoldersCode}${code.trim()}`;
  }

  public generateOptionsCode(config): string {
    let excelOptions = { ...config.excelOptions };

    // Handle storage options
    let storageOptions = excelOptions.storage_options || {};
    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    if (Object.keys(storageOptions).length > 0) {
      excelOptions.storage_options = storageOptions;
    }

    // Generate options string
    let optionsEntries = Object.entries(excelOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return `${key}=${value ? 'True' : 'False'}`;
        } else if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`;
        } else if (value === "None") {
          return `${key}=None`;
        }
        return `${key}='${value}'`;
      });

    const optionsString = optionsEntries.join(', ');
    return optionsString ? `, ${optionsString}` : '';
  }
}
