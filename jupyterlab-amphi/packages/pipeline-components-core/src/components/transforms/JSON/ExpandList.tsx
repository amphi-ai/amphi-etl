import { expandJsonIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class ExpandList extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column",
          id: "tsCFcolumnColumnToExpand",
          placeholder: "Select column",
        }
      ]
    };
    const description = "Use Expand JSON List on columns containing JSON list into multiple columns.";

    super("Expand JSON List", "expandList", description, "pandas_df_processor", [], "transforms.JSON", expandJsonIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Start generating the code string

    const columnName = config.tsCFcolumnColumnToExpand.value;
    const columnType = config.tsCFcolumnColumnToExpand.type;
    const columnIsNamed = config.tsCFcolumnColumnToExpand.named;

    let columnReference: string;
    columnReference = columnIsNamed ? `'${columnName}'` : columnName;

    let code = `# Expand the list in the specified column\n`;
    code += `${outputName} = ${inputName}[${columnReference}].apply(pd.Series)\n`;

    return code;
  }

}