import { dedupIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Deduplicate extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFselectKeep: "first"
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Keep (survivorship)",
          id: "tsCFselectKeep",
          options: [
            { value: "first", label: "First occurrence", tooltip: "Drop duplicates except for the first occurrence" },
            { value: "last", label: "Last occurrence", tooltip: "Drop duplicates except for the last occurrence" },
            { value: "False", label: "Drop all", tooltip: "Drop all duplicates" }
          ],
        },
        {
          type: "columns",
          label: "Columns",
          id: "tsCFcolumnsSubset",
          placeholder: "All columns",
          tooltip: "Columns considered for identifying duplicates. Leave empty to consider all columns."
        }
      ],
    };
    const description = "Use Deduplicate to remove duplicate rows based on values on one or more columns.";

    super("Deduplicate Rows", "deduplicateData", description, "pandas_df_processor", [], "transforms", dedupIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    
    // Initializing code string
    let code = `
  # Deduplicate rows\n`;
  
    // Ensuring config.subset is defined and has a length property
    const subset = config.tsCFcolumnsSubset && Array.isArray(config.tsCFcolumnsSubset) ? config.tsCFcolumnsSubset: [];
    const columns = subset.length > 0 ? `subset=[${subset.map(column => column.named ? `"${column.value.trim()}"` : column.value).join(', ')}]` : '';
  
    // Adjusting keep parameter based on config.keep value
    let keep;
    if (typeof config.tsCFselectKeep === 'boolean') {
      keep = config.tsCFselectKeep ? `"first"` : "False";
    } else {
      keep = config.tsCFselectKeep === "False" ? "False" : `"${config.tsCFselectKeep}"`;
    }
  
    // Generating the code for deduplication
    code += `${outputName} = ${inputName}.drop_duplicates(${columns}${columns && keep ? `, keep=${keep}` : !columns && keep ? `keep=${keep}` : ''})\n`;
  
    return code;
  }

}