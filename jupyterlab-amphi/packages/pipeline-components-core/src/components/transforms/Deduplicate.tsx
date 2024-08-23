import { dedupIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Deduplicate extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { keep: "first" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Keep (survivorship)",
          id: "keep",
          options: [
            { value: "first", label: "Drop duplicates except for the first occurrence" },
            { value: "last", label: "Drop duplicates except for the last occurrence" },
            { value: false, label: "Drop all duplicates" }
          ],
        },
        {
          type: "columns",
          label: "Columns",
          id: "subset",
          placeholder: "All columns",
          tooltip: "Columns considered for identifying duplicates. Leave empty to consider all columns."
        }
      ],
    };

    super("Deduplicate Rows", "deduplicateData", "pandas_df_processor", [], "transforms", dedupIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Initializing code string
    let code = `
# Deduplicate rows\n`;
    const columns = config.subset.length > 0 ? `subset=[${config.subset.map(column => column.named ? `"${column.value.trim()}"` : column.value).join(', ')}]` : '';
    const keep = typeof config.keep === 'boolean' ? (config.keep ? `"first"` : '') : `"${config.keep}"`;

    // Generating the Python code for deduplication
    code += `${outputName} = ${inputName}.drop_duplicates(${columns}${keep ? `, keep=${keep}` : ''})\n`;

    return code;
  }

}