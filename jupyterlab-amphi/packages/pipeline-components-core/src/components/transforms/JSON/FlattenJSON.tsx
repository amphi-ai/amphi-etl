import { expandIcon } from '../../../icons';

import { BaseCoreComponent } from '../../BaseCoreComponent';


export class FlattenJSON extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { keepColumns: true };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column",
          id: "column",
          placeholder: "Select column",
        },
        {
          type: "boolean",
          label: "Keep all columns",
          id: "keepColumns",
          advanced: true
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
    const columnName = config.column.value;
    const columnIsNamed = config.column.named;
    const keepAll = config.keepColumns;

    const columnReference = columnIsNamed ? `'${columnName}'` : columnName;

    let code = `# Flatten JSON in the specified column\n`;
    if (keepAll) {
      code += `${outputName} = ${inputName}.join(pd.json_normalize(${inputName}.pop(${columnReference})))\n`;
    } else {
      code += `${outputName} = pd.json_normalize(${inputName}[${columnReference}])\n`;
    }
    return code;
  }
}
