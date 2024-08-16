import { aggregateIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class Aggregate extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Group by",
          id: "groupByColumns",
          placeholder: "Select columns"
        },
        {
          type: "keyvalueColumnsSelect",
          label: "Operations",
          id: "columnsOperations",
          placeholder: "Select column",
          
          options: [
            { value: "min", label: "Min" },
            { value: "max", label: "Max" },
            { value: "sum", label: "Sum" },
            { value: "mean", label: "Mean" },
            { value: "count", label: "Count" },
            { value: "nunique", label: "Distinct Count" },
            { value: "first", label: "First" },
            { value: "last", label: "Last" },
            { value: "median", label: "Median" },
            { value: "std", label: "Standard Deviation" },
            { value: "var", label: "Variance" },
            { value: "prod", label: "Product" },
            { value: "mad", label: "Mean Absolute Deviation" },
          ],
        }
      ],
    };

    super("Aggregate", "aggregate", "pandas_df_processor", [], "transform", aggregateIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }) {
    const groupColumns = config.groupByColumns.map(col => col.value);

    // Start constructing the aggregation arguments dynamically
    let aggArgs = "";

    if (config.columnsOperations && config.columnsOperations.length > 0) {
      config.columnsOperations.forEach((op, index) => {
        // Determine how to reference the column based on 'named'
        const columnReference = op.key.named ? `'${op.key.value}'` : op.key.value;
        const operation = op.value.value;
        const columnName = op.key.named ? op.key.value : `col${op.key.value}`;
        const operationName = `${columnName}_${operation}`;

        const sanitizeColumnName = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_');
        const operationNameReference = sanitizeColumnName(operationName);

        // Construct each aggregation argument
        aggArgs += `${operationNameReference}=(${columnReference}, '${operation}')`;
        if (index < config.columnsOperations.length - 1) {
          aggArgs += ", ";
        }
      });
    }

    // Generate groupby code
    let code = `
${outputName} = ${inputName}.groupby([`;

    // Add group columns
    groupColumns.forEach((col, index) => {
      code += `"${col}"`;
      if (index < groupColumns.length - 1) { // Avoid trailing comma
        code += ",";
      }
    });

    // Complete the aggregation function call
    code += `]).agg(${aggArgs}).reset_index()\n`;

    return code;
  }


}