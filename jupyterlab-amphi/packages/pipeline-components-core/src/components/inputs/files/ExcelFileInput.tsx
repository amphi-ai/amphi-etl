import { BaseCoreComponent } from '../../BaseCoreComponent';
import { fileTextIcon } from '../../../icons';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';

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
          placeholder: "Type file name",
          validation: "\\.(xlsx)$",
          validationMessage: "This field expects a file with a xlsx extension such as input.xlsx."
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

    super("Excel File Input", "excelfileInput", "pandas_df_input", ["xlsx", "xls", "ods", "xlsb"], "inputs", fileTextIcon, defaultConfig, form);
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

    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {

    let listOfDataframes = false;
    let code = ''
    let excelOptions = { ...config.excelOptions };

    // Initialize storage_options if not already present
    let storageOptions = excelOptions.storage_options || {};

    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    // Only add storage_options to csvOptions if it's not empty
    if (Object.keys(storageOptions).length > 0) {
      excelOptions.storage_options = storageOptions;
    }

    let optionsString = Object.entries(excelOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return `${key}=${value ? 'True' : 'False'}`;
        } else if (value === "None") { // Handle None values
          listOfDataframes = true;
          return `${key}=None`;
        } else if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`; 
        } else if (/^\d+$/.test(value as string)) {
          return `${key}=${value}`;
        } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) { // Check if value is an array-like string
          listOfDataframes = true;
          return `${key}=${value}`;
        } else {
          return `${key}='${value}'`;
        }
      })
      .join(', ');

    const engine = config.engine !== 'None' ? `'${config.engine}'` : config.engine;

    const readExcelcode = optionsString
      ? `pd.read_excel("${config.filePath}", engine=${engine}, ${optionsString})`
      : `pd.read_excel("${config.filePath}", engine=${engine})`;

    if (listOfDataframes) {
      code = `# Read multiple sheets from Excel file
${outputName}_dict = ${readExcelcode}

# Concatenate the dataframes into a single dataframe
${outputName} = pd.concat(${outputName}_dict.values(), ignore_index=True).convert_dtypes()
`
    } else {
      code = `# Read Excel sheet
${outputName} = ${readExcelcode}.convert_dtypes()
`
    }

    return code;
  }

}
