import { fileCsvIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';
import { FileUtils } from '../../common/FileUtils'; // Import the FileUtils class
import { FTPOptionsHandler } from '../../common/FTPOptionsHandler';

export class CsvFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      fileLocation: "local",
      connectionMethod: "env",
      csvOptions: {
        sep: ","
      }
    };
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
            { value: "s3", label: "S3" },
            { value: "ftp", label: "FTP" }
          ],
          advanced: true
        },
        ...S3OptionsHandler.getAWSFields(),        
        ...FTPOptionsHandler.getFTPFields(),
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name or use '*' for patterns",
          tooltip: "Provide a single CSV file path or use '*' for matching multiple files. Extensions accepted: .csv, .tsv, .txt. Can also read CSV files compressed as .gz, .bz2, .zip, .xz, .zst.",
          validation: "^(.*(\\.csv|\\.tsv|\\.txt))$|^(.*\\*)$",
          allowedExtensions: ["csv", "tsv", "txt", "gz", "bz2", "zip", "xz", "zst"]
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
            { value: "\\t", label: "tab" },
            { value: "|", label: "pipe (|)" },
            { value: "infer", label: "infer (tries to auto detect)" }
          ],
        },
        {
          type: "inputNumber",
          tooltip: "Number of rows of file to read. Useful for reading pieces of large files.",
          label: "Rows number",
          id: "csvOptions.nrows",
          placeholder: "Default: all",
          min: 0,
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "Decimal separator",
          id: "csvOptions.decimal",
          placeholder: "Default: .",
          tooltip: "Character to recognize as decimal point for parsing string columns to numeric. Note that this parameter is only necessary for columns stored as TEXT in Excel, any numeric columns will automatically be parsed, regardless of display format.(e.g. use , for European data).",
          options: [
            { value: ".", label: "." },
            { value: ",", label: "," }
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
          type: "input",
          label: "Wrapper Character",
          id: "csvOptions.quotechar",
          tooltip: "Defines the character used to wrap fields containing special characters like the delimiter or newline.",
          advanced: true
        },
        {
          type: "input",
          label: "Escaped character",
          id: "csvOptions.escapechar",
          tooltip: "Character used to escape other characters.",
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
          condition: { fileLocation: ["http", "s3", "ftp"] },
          advanced: true
        }
      ],
    };
    const description = "Use CSV File Input to access data from a CSV file or multiple CSV files using a wildcard, locally or remotely (via HTTP or S3)."

    super("CSV File Input", "csvFileInput", description, "pandas_df_input", ["csv", "tsv"], "inputs", fileCsvIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    if (config.csvOptions.engine === "pyarrow") {
      deps.push('pyarrow');
    }
    if (config.fileLocation === "s3") {
      deps.push('s3fs');
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

  // Utility method to determine if input uses a wildcard


  // Main generation method
  public generateComponentCode({ config, outputName }): string {
    const optionsString = this.generateOptionsCode({ config });
    const storageOptionsString = config.csvOptions.storage_options ? JSON.stringify(config.csvOptions.storage_options) : '{}';

    let code = '';
    if (FileUtils.isWildcardInput(config.filePath)) {
      if (config.fileLocation === "s3") {
        code += FileUtils.getS3FilePaths(config.filePath, storageOptionsString, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_csv", optionsString, true);
      } else if (config.fileLocation === "ftp") {
        code += FileUtils.getFTPFilePaths(config.filePath, storageOptionsString, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_csv", optionsString, true);
      } else {
        code += FileUtils.getLocalFilePaths(config.filePath, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_csv", optionsString, false);
      }
    } else {
      code = `
# Reading data from ${config.filePath}
${outputName} = pd.read_csv("${config.filePath}"${optionsString}).convert_dtypes()
      `;
    }

    return code.trim();
  }

  public generateOptionsCode({ config }): string {
    let csvOptions = { ...config.csvOptions };
  
    if (csvOptions.sep === 'infer') {
      csvOptions.sep = 'None';
      csvOptions.engine = 'python';
    }
  
    if (config.header === '0' || config.header === '1' || config.header === 'None') {
      csvOptions.header = config.header;
    }
  
    if (csvOptions.names && csvOptions.names.length > 0) {
      csvOptions.names = `['${csvOptions.names.join("', '")}']`;
      csvOptions.header = 0;
    }
  
    let storageOptions = csvOptions.storage_options || {};

    // Transform storage_options array into the correct format
    if (Array.isArray(storageOptions)) {
      const transformedStorageOptions = storageOptions.reduce((acc, item: { key: string; value: any }) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      // Merge transformed options with the S3-specific options
      const s3Options = S3OptionsHandler.handleS3SpecificOptions(config, {});
      storageOptions = { ...transformedStorageOptions, ...s3Options };

      // Merge transformed options with the FTP-specific options
      const ftpOptions = FTPOptionsHandler.handleFTPSpecificOptions(config, {});
      storageOptions = { ...transformedStorageOptions, ...ftpOptions };
    } else {
      // Ensure S3-specific options are handled when storageOptions is not an array
      storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);
      // Ensure FTP-specific options are handled when storageOptions is not an array
      storageOptions = FTPOptionsHandler.handleFTPSpecificOptions(config, storageOptions);
    }

    // Update the storage_options in csvOptions
    if (Object.keys(storageOptions).length > 0) {
      csvOptions.storage_options = storageOptions;
    }

    const optionsEntries = Object.entries(csvOptions)
      .filter(([key, value]) =>
        value !== null &&
        value !== '' &&
        !(key === 'sep' && value === 'None') &&
        (Array.isArray(value) ? value.length > 0 : true)
      )
      .map(([key, value]) => {
        if (key === 'header' && (value === '0' || value === '1' || value === 'None')) {
          return `${key}=${value}`;
        } else if (key === 'names') {
          return `${key}=${value}`;
        } else if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`;
        } else if (value == '"') {
          return `${key}='${value}'`;
        } else if (typeof value === 'string' && value !== 'None') {
          return `${key}="${value}"`;
        } else {
          return `${key}=${value}`;
        }
      });
  
    // Prepend a comma if there are options
    return optionsEntries.length > 0 ? `, ${optionsEntries.join(', ')}` : '';
  }

  public generateSampledComponentCode({ config, outputName, nrows }): string {
    config = {
      ...config,
      csvOptions: {
        ...config.csvOptions,
        nrows: nrows
      }
    };
    return this.generateComponentCode({ config, outputName });
  }
}
