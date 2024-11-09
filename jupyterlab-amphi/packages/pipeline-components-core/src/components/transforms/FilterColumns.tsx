import { crosshairIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class FilterColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { columns: { sourceData: [], targetKeys: [] } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "transferData",
          label: "Filter columns",
          id: "columns",
          advanced: true
        }
      ],
    };
    const description = "Use Select Columns to select and reorder columns.";

    super("Select Columns", "filterColumn", description, "pandas_df_processor", [], "transforms", crosshairIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const allColumns = config.columns.sourceData;
    const targetKeys = config.columns.targetKeys;

    // Prepare column references, handling named and unnamed columns
    const columnsToKeep = targetKeys.map(key => {
      const column = allColumns.find(c => c.value === key);
      return column && column.named ? `"${key.trim()}"` : `${key.trim()}`;
    }).join(', ');

    // Python code generation for DataFrame operation
    const code = `
# Filter and order columns
${outputName} = ${inputName}[[${columnsToKeep}]]
`;
    return code;
  }
}