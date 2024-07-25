
import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class ParquetFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { parquetOptions: { compression: "snappy" } };
    const form = {
      idPrefix: "component__form",
      fields: [
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
          id: "createFoldersIfNotExist",
          advanced: true
        }
      ],
    };

    super("Parquet File Output", "parquetFileOutput", "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
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

    let optionsString = Object.entries(config.parquetOptions || {})
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => `${key}="${value}"`)
      .join(', ');

    // Add comma only if optionsString is not empty
    optionsString = optionsString ? `, ${optionsString}` : '';

    const createFoldersCode = config.createFoldersIfNotExist ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n` : '';

    const code = `
# Export to Parquet file
${createFoldersCode}${inputName}.to_parquet("${config.filePath}"${optionsString})
`;
    return code;
  }

}
