import { filterIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Filter extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { filterType: "basic", condition: "==" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Type",
          id: "filterType",
          options: [
            { value: "basic", label: "Basic" },
            { value: "advanced", label: "Advanced" }
          ],
          advanced: true
        },
        {
          type: "column",
          label: "Column name",
          id: "column",
          placeholder: "Select column",
          condition: { filterType: "basic" }
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
          condition: { filterType: "basic" }
        },
        {
          type: "input",
          label: "Value",
          id: "conditionValue",
          placeholder: "Any string of characters (enforce numbers if needed)",
          condition: { filterType: "basic" }
        },
        {
          type: "boolean",
          label: "Enforce value as string",
          id: "enforceString",
          condition: { filterType: "basic" },
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "Python Expression",
          mode: "python",
          id: "pythonExpression",
          tooltip: "Enter a valid pandas query expression. This should be combining column names, values, and logical operators (e.g., ==, and, or, notnull()). Do not include variable assignments, print statements, or comments.",
          placeholder: "(firstName == 'Bob' or Lastname == 'SMITH') and Age > 50",
          aiInstructions: "Generate only the Python expression to be used within the query attribute of a pandas filter.\nIMPORTANT: Return only the expression string, ensuring it is valid for pandas.DataFrame.query. Do not include display or print statements, variable assignments, or explanatory comments.",
          aiGeneration: true,
          aiPromptExamples: [
            { label: "Simple equality filter", value: "Filter rows where BillingCountry is 'France'." },
            { label: "Multiple conditions", value: "Filter rows where Industry is 'Technology' and CurrencyIsoCode is 'USD'." },
            { label: "Null check", value: "Filter rows where BillingPostalCode is not null." },
            { label: "Date comparison", value: "Filter rows where CreatedDate is on or after '2020-01-01'." },
            { label: "List membership", value: "Filter rows where Industry is either 'Technology' or 'Healthcare'." }
          ],
          condition: { filterType: "advanced" },
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

  public generateComponentCode({
    config,
    inputName,
    outputName
  }: {
    config: any;
    inputName: string;
    outputName: string;
  }): string {
    /* ---------- advanced mode ---------- */
    if (config.filterType === "advanced") {
      const expr = String(config.pythonExpression || "").replace(/"/g, '\\"');
      return `
# Advanced filter using pandas.DataFrame.query
${outputName} = ${inputName}.query("${expr}")
`;
    }

    /* ---------- basic mode ---------- */
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
        conditionValueReference =
          enforceString || ["string", "category", "object"].includes(columnType)
            ? `'${conditionValue}'`
            : `${conditionValue}`;

        code += `${outputName} = ${inputName}[${inputName}[${columnReference}] ${condition} ${conditionValueReference}]`;
        break;

      case "contains":
      case "not contains":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        if (["string", "object", "category"].includes(columnType)) {
          const neg = condition === "not contains" ? "~" : "";
          code += `${outputName} = ${inputName}[${neg}${inputName}[${columnReference}].str.contains("${conditionValue}", na=False)]`;
        } else {
          throw new Error("Invalid operation for the data type");
        }
        break;

      case "startswith":
      case "endswith":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        if (["string", "object", "category"].includes(columnType)) {
          code += `${outputName} = ${inputName}[${inputName}[${columnReference}].str.${condition}("${conditionValue}", na=False)]`;
        } else {
          throw new Error("Invalid operation for the data type");
        }
        break;

      case "notnull":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        code += `${outputName} = ${inputName}.dropna(subset=[${columnReference}])`;
        break;

      case "isnull":
        columnReference = columnIsNamed ? `'${columnName}'` : columnName;
        code += `${outputName} = ${inputName}[${inputName}[${columnReference}].isna()]`;
        break;

      default: {
        // Quote column name with back‑ticks only if it contains non‑alphanumeric chars
        const needsBackticks = /[^a-zA-Z0-9_]/.test(columnName);
        columnReference = needsBackticks ? `\`${columnName}\`` : columnName;

        queryExpression = `${columnReference} ${condition} '${conditionValue}'`;
        code += `${outputName} = ${inputName}.query("${queryExpression}")`;
        break;
      }
    }

    return code + "\n";
  }
}