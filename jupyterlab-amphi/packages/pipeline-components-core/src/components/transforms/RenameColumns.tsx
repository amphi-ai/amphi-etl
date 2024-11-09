import { editIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class RenameColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "keyvalueColumns",
          label: "Columns",
          id: "columns",
          placeholders: { key: "column name", value: "new column name" },
          advanced: true
        }
      ],
    };
    const description = "Use Rename Columns to rename one or more columns.";

    super("Rename Columns", "rename", description, "pandas_df_processor", [], "transforms", editIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let columnsParam = "{";
    if (config.columns && config.columns.length > 0) {
      columnsParam += config.columns.map(column => {
        if (column.key.named) {
          // Handle named columns as strings
          return `"${column.key.value}": "${column.value}"`;
        } else {
          // Handle unnamed (numeric index) columns, converting them to strings
          return `${column.key.value}: "${column.value}"`;
        }
      }).join(", ");
      columnsParam += "}";
    } else {
      columnsParam = "{}"; // Ensure columnsParam is always initialized
    }

    // Template for the pandas rename columns code, explicitly setting axis='columns'
    const code = `
# Rename columns
${outputName} = ${inputName}.rename(columns=${columnsParam})
`;
    return code;
  }



}