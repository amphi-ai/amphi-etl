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
            { value: "first", label: "First occurrence", tooltip: "Drop duplicates except for the first occurrence" },
            { value: "last", label: "Last occurrence", tooltip: "Drop duplicates except for the last occurrence" },
            { value: false, label: "Drop all", tooltip: "Drop all duplicates" }
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
    const description = "Use Deduplicate to remove duplicate rows based on values on one or more columns.";

    super("Deduplicate Rows", "deduplicateData", description, "pandas_df_processor", [], "transforms", dedupIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Initializing code string
    let code = `
# Deduplicate rows\n`;

    // Ensuring config.subset is defined and has a length property
    const subset = config.subset && Array.isArray(config.subset) ? config.subset : [];
    const columns = subset.length > 0 ? `subset=[${subset.map(column => column.named ? `"${column.value.trim()}"` : column.value).join(', ')}]` : '';
    const keep = typeof config.keep === 'boolean' ? (config.keep ? `"first"` : '') : `"${config.keep}"`;

    // Generating the code for deduplication
    code += `${outputName} = ${inputName}.drop_duplicates(${columns}${columns && keep ? `, keep=${keep}` : !columns && keep ? `keep=${keep}` : ''})\n`;

    return code;
  }

}