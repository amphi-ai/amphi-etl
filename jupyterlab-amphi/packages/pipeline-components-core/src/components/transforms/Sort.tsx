
import { sortIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Sort extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { order: "True" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Columns",
          id: "by",
          placeholder: "Select columns",
        },
        {
          type: "radio",
          label: "Order",
          id: "order",
          options: [
            { value: "True", label: "Asc." },
            { value: "False", label: "Desc." }
          ],
        },
        {
          type: "boolean",
          label: "Ignore Index",
          id: "ignoreIndex",
          advanced: true
        }
      ],
    };

    super("Sort Rows", "sort", "pandas_df_processor", [], "transform", sortIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const byColumns = `by=[${config.by.map(column => column.named ? `"${column.value}"` : column.value).join(", ")}]`;
    const ascending = typeof config.order !== "undefined" ? `, ascending=${config.order}` : "";
    const ignoreIndex = config.ignoreIndex ? `, ignore_index=${config.ignoreIndex}` : "";
  
    const code = `
# Sort rows 
${outputName} = ${inputName}.sort_values(${byColumns}${ascending}${ignoreIndex})
`;
    return code;
  }
}
