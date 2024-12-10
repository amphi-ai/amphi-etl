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

    // Update the storage_options in parquetOptions
    if (Object.keys(storageOptions).length > 0) {
      parquetOptions.storage_options = storageOptions;
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
