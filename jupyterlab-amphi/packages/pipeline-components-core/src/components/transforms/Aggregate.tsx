import { aggregateIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

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
          placeholder: "Default: all columns"
        },
        {
          type: "keyvalueColumnsSelect",
          label: "Operations",
          id: "columnsOperations",
          placeholder: "Select column",
          options: [
            { value: "min", label: "Min", tooltip: "Returns the minimum value in the group." },
            { value: "max", label: "Max", tooltip: "Returns the maximum value in the group." },
            { value: "sum", label: "Sum", tooltip: "Returns the sum of all values in the group." },
            { value: "mean", label: "Mean", tooltip: "Returns the average value of the group." },
            { value: "count", label: "Count", tooltip: "Counts the number of non-null entries." },
            { value: "nunique", label: "Distinct Count", tooltip: "Returns the number of distinct elements." },
            { value: "first", label: "First", tooltip: "Returns the first value in the group." },
            { value: "last", label: "Last", tooltip: "Returns the last value in the group." },
            { value: "median", label: "Median", tooltip: "Returns the median value in the group." },
            { value: "std", label: "Standard Deviation", tooltip: "Returns the standard deviation of the group." },
            { value: "var", label: "Variance", tooltip: "Returns the variance of the group." },
            { value: "prod", label: "Product", tooltip: "Returns the product of all values in the group." }
          ],
        }
      ],
    };
    const description = "Use Aggregate to perform various summary calculations such as sum, count, min/max, average, mean/median, count and more.";

    super("Aggregate Rows", "aggregate", description, "pandas_df_processor", [], "transforms", aggregateIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }) {
    //conditional because can be empty
    const groupColumns = config.groupByColumns?.map(col => col.value) || [];

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
    let code = "";

    if (groupColumns.length > 0) {
      code += `
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
    } else {
      // No grouping, apply named aggregations directly with an index and then destroy it
      code += `

# replace empty or none name
${inputName}.columns = [f"Unnamed_{i}" if col is None or col == "" else col for i, col in enumerate(${inputName}.columns)]
# generate dynamically the name based on the column list (so that we're sure it's not in the list)
column_name_concat = "_".join(${inputName}.columns)

# aggregation with the dummy index
${outputName} = ${inputName}.assign(**{column_name_concat: 0}).groupby(column_name_concat).agg(${aggArgs}).reset_index(drop=True)
`;
    }

    return code;
  }


}