import { filterIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Filter extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { condition: "==" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column name",
          id: "column",
          placeholder: "Select column",
        },
        {
          type: "select",
          label: "Condition",
          id: "condition",
          placeholder: "Select condition",
          options: [
            { value: "==", label: "==" },
            { value: "!=", label: "!=" },
            { value: ">", label: ">" },
            { value: "<", label: "<" },
            { value: ">=", label: ">=" },
            { value: "<=", label: "<=" },
            { value: "notnull", label: "Not Null" },
            { value: "isnull", label: "Is Null" },
            { value: "notempty", label: "Not Empty" },
            { value: "isempty", label: "Is Empty" },
            { value: "contains", label: "Contains (string)" },
            { value: "not contains", label: "Not contains (string)" },
            { value: "startswith", label: "Starts With (string)" },
            { value: "endswith", label: "Ends With (string)" }
          ],
        },
        {
          type: "input",
          label: "Value",
          id: "conditionValue",
          placeholder: "Any string of characters (enforce numbers if needed)"
        },
        {
          type: "boolean",
          label: "Enforce value as string",
          id: "enforceString",
          advanced: true
        }
      ],
    };
    const description = "Use Filter Rows to select and output data that meets a specified condition.";

    super("Filter Rows", "filter", description, "pandas_df_processor", [], "transforms", filterIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnIsNamed = config.column.named;
    const condition = config.condition;
    const conditionValue = config.conditionValue;
    const enforceString = config.enforceString;

    let code = `
# Filter rows based on condition
`;
    let queryExpression: string;
    let conditionValueReference: string;
    let columnReference: string;

    switch (condition) {
      case "==":
      case "!=":
      case ">":
      case "<":
      case ">=":
      case "<=":
        columnReference = `'${columnName}'`;

        // If columnType is not a string or category, don't wrap into quotes
        if (enforceString) {
          conditionValueReference = `'${conditionValue}'`;
        }
        else if (columnType === 'string' || columnType === 'category' || columnType === 'object') {
          conditionValueReference = `'${conditionValue}'`;
        } else {
          conditionValueReference = `${conditionValue}`;
        }

        // Use boolean indexing instead of query
        switch (condition) {
          case "==":
            code += `${outputName} = ${inputName}[${inputName}[${columnReference}] == ${conditionValueReference}]`;
            break;
          case "!=":
            code += `${outputName} = ${inputName}[${inputName}[${columnReference}] != ${conditionValueReference}]`;
            break;
          case ">":
            code += `${outputName} = ${inputName}[${inputName}[${columnReference}] > ${conditionValueReference}]`;
            break;
          case "<":
            code += `${outputName} = ${inputName}[${inputName}[${columnReference}] < ${conditionValueReference}]`;
            break;
          case ">=":
            code += `${outputName} = ${inputName}[${inputName}[${columnReference}] >= ${conditionValueReference}]`;
            break;
          case "<=":
            code += `${outputName} = ${inputName}[${inputName}[${columnReference}] <= ${conditionValueReference}]`;
            break;
        }
        break;
      case "contains":
      case "not contains":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        if (['string', 'Object', 'category'].includes(columnType)) {
          const negation = condition === "not contains" ? "~" : "";
          queryExpression = `${inputName}[${negation}${inputName}[${columnReference}].str.contains("${conditionValue}", na=False)]`;
          code += `${outputName} = ${queryExpression}`;
        } else {
          throw new Error('Invalid operation for the data type');
        }
        break;
      case "startswith":
      case "endswith":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        if (['string', 'Object', 'category'].includes(columnType)) {
          queryExpression = `${inputName}[${inputName}[${columnReference}].str.${condition}("${conditionValue}", na=False)]`;
          code += `${outputName} = ${queryExpression}`;
        } else {
          throw new Error('Invalid operation for the data type');
        }
        break;
      case "notnull":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        queryExpression = `${inputName}.dropna(subset=[${columnReference}])`
        code += `${outputName} = ${queryExpression}`;
        break;
      case "isnull":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        queryExpression = `${inputName}[${inputName}[${columnReference}].isna()]`;
        code += `${outputName} = ${queryExpression}`;
        break;
      default:
        columnReference = /[^a-zA-Z0-9_]/.test(columnName) ? `\`${columnName}\`` : columnName;
        queryExpression = `${columnReference} ${condition} '${conditionValue}'`;
        code += `${outputName} = ${inputName}.query("${queryExpression}")`;
        break;
    }

    return code + '\n';
  }


}