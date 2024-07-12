
import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; 

export class ParquetFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name",
          validation: "\\.(parquet)$",
          validationMessage: "This field expects a file with a .parquet extension such as input.parquet."
        },
      ],
    };

    super("Parquet File Input", "parquetFileInput", "pandas_df_input", ["parquet"], "input", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import pyarrow"];
  }

  public generateComponentCode({ config, outputName }): string {
    // Generate the Python code
    const code = `
# Reading data from ${config.filePath}
${outputName} = pd.read_parquet("${config.filePath}").convert_dtypes()
`;
    return code;
  }

}
