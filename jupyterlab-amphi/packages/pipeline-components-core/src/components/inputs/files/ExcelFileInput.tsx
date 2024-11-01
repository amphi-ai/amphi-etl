import { BaseCoreComponent } from '../../BaseCoreComponent';
import { fileTextIcon } from '../../../icons';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';
import { FileUtils } from '../../common/FileUtils'; // Import the FileUtils class

export class ExcelFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", excelOptions: { sheet_name: 0 }, engine: "None" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "File Location",
          id: "fileLocation",
          options: [
            { value: "local", label: "Local" },
            { value: "http", label: "HTTP" },
            { value: "s3", label: "S3" }
          ],
          advanced: true
        },
        ...S3OptionsHandler.getAWSFields(),
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name or use '*' for patterns",
          validation: "\\.(xlsx)$|^(.*\\*)$",
          validationMessage: "This field expects a file with an xlsx extension or a wildcard pattern such as input*.xlsx."
        },
        {
          type: "selectCustomizable",
          label: "Sheets",
          id: "excelOptions.sheet_name",
          placeholder: "Default: 0 (first sheet)",
          tooltip: "Select the sheet number or all of them. Use custom number to select a specific sheet. You can also select multiple sheets if they have the same structure with [0, 1, 'Sheet5'] for example.",
          options: [
            { value: "0", label: "0 (First sheet)" },
            { value: "1", label: "1 (Second sheet)" },
            { value: "None", label: "All worksheets (multiple)" }
          ],
        },
        {
          type: "selectCustomizable",
          label: "Header",
          id: "excelOptions.header",
          placeholder: "default: 0 (first row)",
          options: [
            { value: "0", label: "0 (1st row)" },
            { value: "1", label: "1 (2nd row)" },
            { value: "None", label: "None (No header)" }
          ],
          advanced: true
        },
        {
          type: "select",
          label: "Engine",
          id: "engine",
          tooltip: "Depending on the file format, different engines might be used.\nopenpyxl supports newer Excel file formats.\n calamine supports Excel (.xls, .xlsx, .xlsm, .xlsb) and OpenDocument (.ods) file formats.\n odf supports OpenDocument file formats (.odf, .ods, .odt).\n pyxlsb supports Binary Excel files.\n xlrd supports old-style Excel files (.xls).",
          options: [
            { value: "openpyxl", label: "openpyxl" },
            { value: "calamine", label: "calamine" },
            { value: "odf", label: "odf (for .ods files)" },
            { value: "pyxlsb", label: "pyxlsb (for *.xlsb)" },
            { value: "xlrd", label: "xlrd (for *.xls)" },
            { value: "None", label: "Default" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Verbose",
          id: "excelOptions.verbose",
          placeholder: "false",
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "excelOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use Excel File Input to access data from Excel files (e.g., xlsx, xls, ods) locally or remotely (via HTTP or S3)."

    super("Excel File Input", "excelfileInput", description, "pandas_df_input", ["xlsx", "xls", "ods", "xlsb"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];

    const engine = config.engine;

    if (engine === 'None' || engine === 'openpyxl') {
      deps.push('openpyxl');
    } else if (engine === 'calamine') {
      deps.push('python-calamine');
    } else if (engine === 'odf') {
      deps.push('odfpy');
    } else if (engine === 'pyxlsb') {
      deps.push('pyxlsb');
    } else if (engine === 'xlrd') {
      deps.push('xlrd');
    }
    else {
      deps.push(config.engine);
    }
    if (FileUtils.isWildcardInput(config.filePath)) {
      deps.push(config.fileLocation === "s3" ? 's3fs' : 'glob');
    }

    return deps;
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (FileUtils.isWildcardInput(config.filePath)) {
      if (config.fileLocation === "s3") {
        imports.push("import s3fs");
      } else {
        imports.push("import glob");
      }
    }
    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    const excelOptions = { ...config.excelOptions };
    const storageOptionsString = excelOptions.storage_options ? JSON.stringify(excelOptions.storage_options) : '{}';
    const optionsString = this.generateOptionsString(excelOptions);

    let code = '';
    if (config.fileLocation === "s3") {
      code += FileUtils.getS3FilePaths(config.filePath, storageOptionsString, outputName);
      code += FileUtils.generateConcatCode(outputName, "read_excel", optionsString, true);
    } else {
      code += FileUtils.getLocalFilePaths(config.filePath, outputName);
      code += FileUtils.generateConcatCode(outputName, "read_excel", optionsString, false);
    }

    return code;
  }

  private generateOptionsString(excelOptions): string {
    return Object.entries(excelOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return `${key}=${value ? 'True' : 'False'}`;
        } else if (value === "None") {
          return `${key}=None`;
        } else if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`;
        } else if (/^\d+$/.test(value as string)) {
          return `${key}=${value}`;
        } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
          return `${key}=${value}`;
        } else {
          return `${key}='${value}'`;
        }
      })
      .join(', ');
  }
}
