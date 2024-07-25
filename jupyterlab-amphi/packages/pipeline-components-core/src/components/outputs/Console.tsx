
import { monitorIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class Console extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "inputNumber",
          label: "Records limit",
          id: "limit",
          placeholder: "Number of records to print in console",
          min: 0
        }
      ],
    };

    super("Console", "console", "pandas_df_output", [], "outputs", monitorIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName }): string {

    if (config.limit) {
      inputName += `.head(${config.limit})`;
    }

    const code = `
print(${inputName})
`;
    return code;
  }
}
