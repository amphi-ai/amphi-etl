import { renameIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class ManualRenameColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "keyvalueColumns",
          label: "Columns",
          id: "tsCFcolumnsColumnsToRename",
          placeholders: { key: "column name", value: "new column name" },
          advanced: true
        }
      ],
    };
    const description = "Use Rename Columns to rename one or more columns.";

    super("Manual Rename Columns", "manual rename", description, "pandas_df_processor", [], "transforms", renameIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let columnsParam = "{";
    if (config.tsCFcolumnsColumnsToRename && config.tsCFcolumnsColumnsToRename.length > 0) {
      columnsParam += config.tsCFcolumnsColumnsToRename.map(column => {
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