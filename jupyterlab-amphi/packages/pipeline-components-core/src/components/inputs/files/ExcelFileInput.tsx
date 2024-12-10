import { BaseCoreComponent } from '../../BaseCoreComponent';
import { fileExcelIcon } from '../../../icons';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';
import { FileUtils } from '../../common/FileUtils'; // Import the FileUtils class

export class ExcelFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", excelOptions: {engine: "None" } };
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
          tooltip: "This field expects a file with an xlsx extension or a wildcard pattern such as input*.xlsx."
        },
        {
          type: "sheets",
          label: "Sheets",
          id: "excelOptions.sheet_name",
          placeholder: "Default: 0 (first sheet)",
          tooltip: "Select one or multiple sheets. If multiple sheets are selected, the sheets are concatenated to output a single dataset.",
          condition: { fileLocation: "local"}
        },
        {
          type: "selectTokenization",
          label: "Sheets",
          id: "excelOptions.sheet_name",
          placeholder: "Default: 0 (first sheet)",
          tooltip: "Type the sheet names to read data from. If multiple sheets are provided, the sheets are concatenated to output a single dataset.",
          options: [],
          condition: { fileLocation: ["http", "s3"] }
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
          type: "inputNumber",
          tooltip: "Number of rows of file to read. Useful for reading pieces of large files.",
          label: "Rows number",
          min: 0,
          id: "excelOptions.nrows",
          placeholder: "Default: all",
          advanced: true
        },
        {
          type: "inputNumber",
          tooltip: "Number of rows to skip at the start of the file.",
          label: "Skip rows at the start",
          id: "excelOptions.skiprows",
          min: 0,
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "Decimal separator",
          id: "excelOptions.decimal",
          placeholder: "Default: .",
          tooltip: "Character to recognize as decimal point for parsing string columns to numeric. Note that this parameter is only necessary for columns stored as TEXT in Excel, any numeric columns will automatically be parsed, regardless of display format.(e.g. use , for European data).",
          options: [
            { value: ".", label: "." },
            { value: ",", label: "," }
          ],
          advanced: true
        },
        {
          type: "select",
          label: "Engine",
          id: "excelOptions.engine",
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
          type: "keyvalue",
          label: "Storage Options",
          id: "excelOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use Excel File Input to access data from Excel files (e.g., xlsx, xls, ods) locally or remotely (via HTTP or S3)."

    super("Excel/ODS File Input", "excelfileInput", description, "pandas_df_input", ["xlsx", "xls", "ods", "xlsb"], "inputs", fileExcelIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];

    const engine = config.excelOptions.engine;

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
      deps.push(config.fileLocation === "s3" ? 's3fs' : '');
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
    let optionsString = this.generateOptionsCode(config);
  
    let code = '';
  
    // Handle sheet_name dynamically
    if (excelOptions.sheet_name && excelOptions.sheet_name.length > 0) {
      if (excelOptions.sheet_name.length === 1) {
        optionsString += `, sheet_name='${excelOptions.sheet_name[0]}'`;
      } else {
        optionsString += `, sheet_name=${JSON.stringify(excelOptions.sheet_name)}`;
      }
    }
  
    // Check for wildcard input and generate appropriate code
    if (FileUtils.isWildcardInput(config.filePath)) {
      if (config.fileLocation === "s3") {
        code += FileUtils.getS3FilePaths(config.filePath, storageOptionsString, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_excel", optionsString, true);
      } else {
        code += FileUtils.getLocalFilePaths(config.filePath, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_excel", optionsString, false);
      }
    } else {
      // Simple file reading without wildcard
      if (excelOptions.sheet_name && excelOptions.sheet_name.length > 1) {
        // Multiple sheets: Concatenate DataFrames into a single output
        code += `${outputName}_dict = pd.read_excel("${config.filePath}"${optionsString})\n`;
        code += `${outputName} = pd.concat(${outputName}_dict.values(), ignore_index=True).convert_dtypes()\n`;
      } else {
        // Single sheet or no sheet_name specified
        code += `${outputName} = pd.read_excel("${config.filePath}"${optionsString}).convert_dtypes()\n`;
      }
    }
  
    return code;
  }

  
  public generateOptionsCode(config): string {
    let excelOptions = { ...config.excelOptions };
    let storageOptions = excelOptions.storage_options || {};
    
    // Transform storage_options array into the correct format
    if (Array.isArray(storageOptions)) {
      const transformedStorageOptions = storageOptions.reduce((acc, item: { key: string; value: any }) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      // Merge transformed options with the S3-specific options
      const s3Options = S3OptionsHandler.handleS3SpecificOptions(config, {});
      storageOptions = { ...transformedStorageOptions, ...s3Options };
    } else {
      // Ensure S3-specific options are handled when storageOptions is not an array
      storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);
    }

    // Update the storage_options in excelOptions
    if (Object.keys(storageOptions).length > 0) {
      excelOptions.storage_options = storageOptions;
    }
    
    const options = Object.entries(excelOptions)
      .filter(([key, value]) => value !== null && value !== '' && key !== 'sheet_name') // Ignore sheet_name since it's handled separately
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
      });
  
    // Prepend a comma if there are options
    return options.length > 0 ? `, ${options.join(', ')}` : '';
  }
}
