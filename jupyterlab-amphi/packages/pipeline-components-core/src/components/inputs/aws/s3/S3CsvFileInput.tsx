import { fileTextIcon } from '../../../../icons';
import { BaseCoreComponent } from '../../../BaseCoreComponent';// Adjust the import path

export class S3CsvFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { csvOptions: { sep: "," } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name",
          tooltip: "This field expects a file path with a csv, tsv or txt extension such as input.csv.",
          validation: "\\.(csv|tsv|txt)$",
        },
        {
          type: "selectCustomizable",
          label: "Separator",
          id: "csvOptions.sep",
          placeholder: "default: ,",
          tooltip: "Select or provide a custom delimiter.",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" },
            { value: "  ", label: "tab" },
            { value: "|", label: "pipe (|)" },
            { value: "infer", label: "infer (tries to auto detect)" }
          ],
        },
        {
          type: "selectCustomizable",
          tooltip: "Row number containing column labels and marking the start of the data (zero-indexed).",
          label: "Header",
          id: "csvOptions.header",
          placeholder: "Default: first line",
          options: [
            { value: "None", label: "None" },
            { value: "0", label: "First line" },
            { value: "1", label: "Second Line" }
          ],
          advanced: true
        },
        {
          type: "selectTokenization",
          tooltip: "Sequence of column labels to apply.",
          label: "Column names",
          id: "csvOptions.names",
          placeholder: "Type header fields (ordered and comma-separated)",
          options: [],
          advanced: true
        },
        {
          type: "select",
          label: "On Bad Lines",
          id: "csvOptions.on_bad_lines",
          placeholder: "Error: raise an Exception when a bad line is encountered",
          options: [
            { value: "error", label: "Error: raise an Exception when a bad line is encountered" },
            { value: "warn", label: "Warn: raise a warning when a bad line is encountered and skip that line." },
            { value: "skip", label: "Skip: skip bad lines without raising or warning when they are encountered." }
          ],
          advanced: true
        }
      ],
    };

    super("S3 CSV File Input", "s3CsvFileInput", "no desc", "pandas_df_input", ["csv", "tsv"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import boto3"];
  }

  public generateComponentCode({ config, outputName }): string {
    return this.generatePandasComponentCode({ config, outputName });
  }


  public generatePandasComponentCode({ config, outputName }): string {
    // Initialize an object to modify without affecting the original config
    let csvOptions = { ...config.csvOptions };

    // Handle 'infer' option
    if (csvOptions.sep === 'infer') {
      csvOptions.sep = 'None'; // Set sep to Python's None for code generation
      csvOptions.engine = 'python'; // Ensure engine is set to 'python'
    }

    // Adjust handling for 'header' and 'names'
    if (typeof config.header === 'number' || config.header === 'None') {
      csvOptions.header = config.header; // Use the header value directly if it's a number or 'None'
    }

    if (config.names && Array.isArray(config.names) && config.names.length > 0) {
      csvOptions.names = `['${config.names.join("', '")}']`; // Format names as a Python list
      csvOptions.header = 0; // Set header to 0 if names are provided
    }

    // Prepare options string for pd.read_csv
    let optionsString = Object.entries(csvOptions)
      .filter(([key, value]) => value !== null && value !== '' && !(key === 'sep' && value === 'infer'))
      .map(([key, value]) => {
        if (key === 'header' && (typeof value === 'number' || value === 'None' || value === 'string ')) {
          return `${key}=${value}`; // Handle header as number or None without quotes
        } else if (key === 'names') {
          return `${key}=${value}`; // Directly use the formatted names list
        } else if (typeof value === 'string' && value !== 'None') {
          return `${key}="${value}"`; // Handle strings with quotes, except for 'None'
        } else {
          return `${key}=${value}`; // Handle numbers and Python's None without quotes
        }
      })
      .join(', ');

    // Generate the Python code
    const code = `
# Reading data from ${config.filePath}
${outputName} = pd.read_csv("${config.filePath}"${optionsString ? `, ${optionsString}` : ''}).convert_dtypes()
`;
    return code;
  }

  public generateComponentIbisCode({ config, outputName }): string {
    // Initialize an object to modify without affecting the original config
    let csvOptions = { ...config.csvOptions };
  
    // Handle 'infer' option
    if (csvOptions.sep === 'infer') {
      csvOptions.sep = ','; // Default to comma for Ibis
    }
  
    // Adjust handling for 'header' and 'names'
    if (typeof config.header === 'number' || config.header === 'None') {
      csvOptions.header = config.header; // Use the header value directly if it's a number or 'None'
    }
  
    if (config.names && Array.isArray(config.names) && config.names.length > 0) {
      csvOptions.names = `['${config.names.join("', '")}']`; // Format names as a Python list
    }
  
    // Prepare options string for Ibis CSV reader
    let optionsString = Object.entries(csvOptions)
      .filter(([key, value]) => value !== null && value !== '' && !(key === 'sep' && value === 'infer'))
      .map(([key, value]) => {
        if (key === 'header' && (typeof value === 'number' || value === 'None')) {
          return `${key}=${value}`; // Handle header as number or None without quotes
        } else if (key === 'names') {
          return `${key}=${value}`; // Directly use the formatted names list
        } else if (typeof value === 'string' && value !== 'None') {
          return `${key}="${value}"`; // Handle strings with quotes, except for 'None'
        } else {
          return `${key}=${value}`; // Handle numbers and Python's None without quotes
        }
      })
      .join(', ');
  
    // Generate the Python code for Ibis
    const code = `
# Reading data from ${config.filePath}
${outputName} = ibis.read_csv("${config.filePath}"${optionsString ? `, ${optionsString}` : ''})`;
    return code;
  }


}
