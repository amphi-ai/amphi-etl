import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class ExcelFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { excelOptions: { header: true }, engine: 'xlsxwriter' };
    const form = {
      idPrefix: "component__form",
      fields: [
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
        }
      ],
    };

    super("Excel File Output", "excelFileOutput", "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
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

  public generateComponentCode({config, inputName}): string {
    let excelWriterNeeded = config.excelOptions.mode === 'a';
    let options = {...config.excelOptions};
  
    // Remove mode from options as it's handled separately
    delete options.mode;
    
    let optionsString = Object.entries(config.excelOptions)
    .filter(([key, value]) => value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}=${value ? 'True' : 'False'}`;
      } else if (value === "None") { // Handle None values
        return `${key}=None`;
      }
      return `${key}='${value}'`;
    })
    .join(', ');
  
    optionsString = optionsString ? `, ${optionsString}` : '';
  
    const createFoldersCode = config.createFoldersIfNotExist ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n` : '';
    const engine = config.engine !== 'None' ? `'${config.engine}'` : config.engine;

    let code = '';
    if (excelWriterNeeded) {
      code = `with pd.ExcelWriter("${config.filePath}", mode="a") as writer:\n` +
             `    ${inputName}.to_excel(writer${optionsString})
  `;
    } else {
      code = `
${inputName}.to_excel("${config.filePath}", engine=${engine}${optionsString})
  `;
    }

    return `${createFoldersCode}${code}`;
  }
}
