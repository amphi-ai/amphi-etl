import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class CsvFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", csvOptions: { sep: "," } };
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
            { value: "error", label: "Error", tooltip: "Raise an Exception when a bad line is encountered" },
            { value: "warn", label: "Warn", tooltip: "Raise a warning when a bad line is encountered and skip that line." },
            { value: "skip", label: "Skip", tooltip: "Skip bad lines without raising or warning when they are encountered." }
          ],
          advanced: true
        },
        {
          type: "select",
          label: "Engine",
          id: "csvOptions.engine",
          placeholder: "Select engine",
          options: [
            { value: "python", label: "python", tooltip: "Python is more feature complete." },
            { value: "c", label: "c", tooltip: "C is faster." },
            { value: "pyarrow", label: "pyarrow", tooltip: "The pyarrow engine was added as an experimental engine, and some features are unsupported, or may not work correctly, with this engine." }
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "csvOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };

    super("CSV File Input", "csvFileInput", "pandas_df_input", ["csv", "tsv"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    if (config.csvOptions.engine == "pyarrow") {
      deps.push('pyarrow');
    }
    if (config.fileLocation == "s3") {
      deps.push('s3fs');
    }
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {
    return this.generatePandasComponentCode({ config, outputName });
  }


  public generatePandasComponentCode({ config, outputName }): string {
    // Initialize an object to modify without affecting the original config
    let csvOptions = { ...config.csvOptions };
    console.log("csvOptions.names %o", csvOptions.names);

    // Handle 'infer' option
    if (csvOptions.sep === 'infer') {
      csvOptions.sep = 'None'; // Set sep to Python's None for code generation
      csvOptions.engine = 'python'; // Ensure engine is set to 'python'
    }

    // Adjust handling for 'header' and 'names'
    if (config.header === '0' || config.header === '1' || config.header === 'None') {
      csvOptions.header = config.header;
    }

    console.log("config.names %o", csvOptions.names)
    if (csvOptions.names) {
      if (csvOptions.names.length > 0) {
        csvOptions.names = `['${csvOptions.names.join("', '")}'], index_col=False`;
        console.log("csvOptions.names %o", csvOptions.names);
        csvOptions.header = 0;
      }
    }

    // Initialize storage_options if not already present
    let storageOptions = csvOptions.storage_options || {};

    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    // Only add storage_options to csvOptions if it's not empty
    if (Object.keys(storageOptions).length > 0) {
      csvOptions.storage_options = storageOptions;
    }

    // Prepare options string for pd.read_csv
    let optionsString = Object.entries(csvOptions)
      .filter(([key, value]) => value !== null && value !== '' && !(key === 'sep' && value === 'infer') && (Array.isArray(value) ? value.length > 0 : true))
      .map(([key, value]) => {
        if (key === 'header' && (value === '0' || value === '1' || value === 'None')) {
          return `${key}=${value}`; // Handle header as string without quotes
        } else if (key === 'names') {
          return `${key}=${value}`; // Directly use the formatted names list
        } else if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`; 
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


}
