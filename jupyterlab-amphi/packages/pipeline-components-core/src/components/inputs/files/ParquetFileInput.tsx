
import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class ParquetFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env"  };
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
          validation: "\\.(parquet)$",
          validationMessage: "This field expects a file with a .parquet extension such as input.parquet."
        },
        {
          type: "select",
          label: "Engine",
          id: "parquetOptions.engine",
          placeholder: "Select engine",
          options: [
            { value: "auto", label: "auto", tooltip: "The default behavior is to try ‘pyarrow’, falling back to ‘fastparquet’ if ‘pyarrow’ is unavailable." },
            { value: "pyarrow", label: "pyarrow" },
            { value: "fastparquet", label: "fastparquet" }
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "excelOptions.storage_options",
          advanced: true
        }
      ],
    };
    const description = "Use Parquet File Input to access data from a Parquet file locally or remotely (via HTTP or S3)."

    super("Parquet File Input", "parquetFileInput", description, "pandas_df_input", ["parquet"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import pyarrow"];
  }

  public generateComponentCode({ config, outputName }): string {
    
    let parquetOptions = { ...config.parquetOptions };

    // Initialize storage_options if not already present
    let storageOptions = parquetOptions.storage_options || {};

    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    // Only add storage_options to csvOptions if it's not empty
    if (Object.keys(storageOptions).length > 0) {
      parquetOptions.storage_options = storageOptions;
    }

    let optionsString = Object.entries(parquetOptions || {})
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`; 
        } else {
          return `${key}="${value}"`; // Handle numbers and Python's None without quotes
        }
      })      
      .join(', ');

      const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

    // Generate the Python code
    const code = `
# Reading data from ${config.filePath}
${outputName} = pd.read_parquet("${config.filePath}"${optionsCode}).convert_dtypes()
`;
    return code;
  }

}
