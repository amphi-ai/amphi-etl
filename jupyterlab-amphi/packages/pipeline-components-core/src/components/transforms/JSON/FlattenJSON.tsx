import { expandIcon } from '../../../icons';

import { BaseCoreComponent } from '../../BaseCoreComponent';


export class FlattenJSON extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column",
          id: "column",
          placeholder: "Select column",
        }
      ]
    };
    const description = "Flatten JSON data in a specified column for easier export to CSV.";

    super("Flatten JSON", "flattenJSON", description, "pandas_df_processor", [], "transforms.JSON", expandIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from pandas import json_normalize"
    ];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Retrieve the column details from the config
    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnIsNamed = config.column.named;

    let columnReference: string;
    columnReference = columnIsNamed ? `'${columnName}'` : columnName;

    let code = `# Flatten the JSON data in the specified column\n`;
    code += `${outputName} = pd.json_normalize(${inputName}[${columnReference}])\n`;

    return code;
  }
}
