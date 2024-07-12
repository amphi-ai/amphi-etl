import { expandIcon } from '../../icons';

import { BaseCoreComponent } from '../BaseCoreComponent';

export class ExpandList extends BaseCoreComponent {
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

    super("Expand JSON List", "expandList", "pandas_df_processor", [], "transform", expandIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Start generating the code string

    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnIsNamed = config.column.named;

    let columnReference: string;
    columnReference = columnIsNamed ? `'${columnName}'` : columnName;

    let code = `# Expand the list in the specified column\n`;
    code += `${outputName} = ${inputName}[${columnReference}].apply(pd.Series)\n`;

    return code;
  }

}