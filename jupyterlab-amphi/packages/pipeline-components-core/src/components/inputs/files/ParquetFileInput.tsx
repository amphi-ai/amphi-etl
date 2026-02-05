import { fileParquetIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';
import { FileUtils } from '../../common/FileUtils'; // Import the FileUtils class

export class ParquetFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env" };
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
          validation: "\\.(parquet)$|^(.*\\*)$",
          tooltip: "This field expects a file with a .parquet extension or a wildcard pattern such as input*.parquet."
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
          id: "parquetOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use Parquet File Input to access data from Parquet files locally or remotely (via HTTP or S3).";

    super("Parquet File Input", "parquetFileInput", description, "pandas_df_input", ["parquet"], "inputs", fileParquetIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = ['pyarrow'];
    if (config.parquetOptions?.engine === "fastparquet") {
      deps.push('fastparquet');
    }
    if (FileUtils.isWildcardInput(config.filePath)) {
      deps.push(config.fileLocation === "s3" ? 's3fs' : 'glob');
    }
    return deps;
  }

  public provideImports({ config }): string[] {
    const imports = ["import pandas as pd"];
    if (config.parquetOptions?.engine === "fastparquet") {
      imports.push("import fastparquet");
    }
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
    const parquetOptions = { ...config.parquetOptions };
    const storageOptionsString = parquetOptions.storage_options ? JSON.stringify(parquetOptions.storage_options) : '{}';
    const optionsString = this.generateParquetOptionsCode({ config });

    let code = '';

    // Check for wildcard input and generate appropriate code
    if (FileUtils.isWildcardInput(config.filePath)) {
      if (config.fileLocation === "s3") {
        code += FileUtils.getS3FilePaths(config.filePath, storageOptionsString, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_parquet", optionsString, true);
      } else {
        code += FileUtils.getLocalFilePaths(config.filePath, outputName);
        code += FileUtils.generateConcatCode(outputName, "read_parquet", optionsString, false);
      }
    } else {
      // Simple file reading without wildcard
      code += `${outputName} = pd.read_parquet("${config.filePath}"${optionsString}).convert_dtypes()\n`;
    }

    return code.trim();
  }

  public generateParquetOptionsCode({ config }): string {
    let parquetOptions = { ...config.parquetOptions };

    let storageOptions = parquetOptions.storage_options || {};

    // Start with an empty object for final storage options
    let finalStorageOptions = {};

    // Step 1: Transform manual storage_options array if it exists
    if (Array.isArray(storageOptions)) {
      finalStorageOptions = storageOptions.reduce((acc, item: { key: string; value: any }) => {
        if (item.key) {  // Only add if key exists
          acc[item.key] = item.value;
        }
        return acc;
      }, {});
    } else if (typeof storageOptions === 'object') {
      // If it's already an object, use it as base
      finalStorageOptions = { ...storageOptions };
    }

    // Step 2: Always apply S3-specific options (these will override manual entries if needed)
    if (config.fileLocation === 's3') {
      const s3Options = S3OptionsHandler.handleS3SpecificOptions(config, finalStorageOptions);
      finalStorageOptions = { ...finalStorageOptions, ...s3Options };
    }

    // Update the storage_options in parquetOptions only if there are actual options
    if (Object.keys(finalStorageOptions).length > 0) {
      parquetOptions.storage_options = finalStorageOptions;
    } else {
      // Clean up - remove storage_options if empty
      delete parquetOptions.storage_options;
    }

    const options = Object.entries(parquetOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (key === 'storage_options' && typeof value === 'object') {
          return `${key}=${JSON.stringify(value)}`;
        } else if (typeof value === 'string') {
          return `${key}="${value}"`;
        } else {
          return `${key}=${value}`;
        }
      });

    // Prepend a comma if there are options
    return options.length > 0 ? `, ${options.join(', ')}` : '';
  }
}
