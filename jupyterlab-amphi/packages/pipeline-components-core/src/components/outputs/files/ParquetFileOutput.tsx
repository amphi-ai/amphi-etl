
import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class ParquetFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", parquetOptions: { compression: "snappy" } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "File Location",
          id: "fileLocation",
          options: [
            { value: "local", label: "Local" },
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
          validationMessage: "This field expects a file with a .parquet extension such as output.parquet."
        },
        {
          type: "radio",
          label: "Compression",
          id: "parquetOptions.compression",
          options: [
            { value: "snappy", label: "Snappy" },
            { value: "gzip", label: "GZip" },
            { value: "brotli", label: "Brotli" },
            { value: "None", label: "None" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Create folders if don't exist",
          condition: { fileLocation: ["local"] },
          id: "createFoldersIfNotExist",
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "csvOptions.storage_options",
          condition: { fileLocation: ["s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use Parquet File Output to write or append data to a Parquet file locally or remotely (S3)."

    super("Parquet File Output", "parquetFileOutput", "no desc", "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
  }

  public provideDependencies({config}): string[] {
    let deps: string[] = [];
    deps.push('pyarrow');
    return deps;
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    const optionsString = this.generateOptionsCode(config);
    const createFoldersCode = config.createFoldersIfNotExist 
      ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n`
      : '';

    const code = `
# Export to Parquet file
${createFoldersCode}${inputName}.to_parquet("${config.filePath}"${optionsString})
`;
    return code.trim();
  }

  public generateOptionsCode(config): string {
    let parquetOptions = { ...config.parquetOptions };

    // Handle storage options
    let storageOptions = parquetOptions.storage_options || {};
    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    if (Object.keys(storageOptions).length > 0) {
      parquetOptions.storage_options = storageOptions;
    }

    // Generate options string
    let optionsEntries = Object.entries(parquetOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`;
        } else if (value === "None") {
          return `${key}=None`;
        }
        return `${key}="${value}"`;
      });

    const optionsString = optionsEntries.join(', ');
    return optionsString ? `, ${optionsString}` : '';
  }

}
