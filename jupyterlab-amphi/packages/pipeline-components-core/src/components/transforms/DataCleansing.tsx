
import { checkDiamondIcon } from '../../icons'; // Define this icon in your icons file
import { BaseCoreComponent } from '../BaseCoreComponent';

export class DataCleansing extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { method: "value", value: 0, forward: false, backward: false };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "boolean",
          label: "Drop rows with NULL values",
          id: "removeNullRows",
          advanced: true
        },
        {
          type: "radio",
          label: "Drop rows if",
          id: "removeRowsHow",
          options: [
            { value: "all", label: "All values are NULL" },
            { value: "any", label: "Any values are NULL (at least one)" }
          ],
          condition: { removeNullRows: true },
          advanced: true
        },
        {
          type: "boolean",
          label: "Drop columns with NULL values",
          id: "removeNullColumns",
          advanced: true
        },
        {
          type: "radio",
          label: "Drop rows if",
          id: "removeColumnsHow",
          options: [
            { value: "all", label: "All values are NULL" },
            { value: "any", label: "Any values are NULL (at least one)" }
          ],
          condition: { removeNullColumns: true },
          advanced: true
        },
        {
          type: "columns",
          label: "Apply cleansing to columns",
          id: "columns",
          tooltip: "Select the columns to apply the cleansing rules. If left blank, all columns will be selected by default.",
          placeholder: "Default: All columns",
          advanced: true
        },
        {
          type: "select",
          label: "Replace missing values with",
          id: "replaceMethod",
          options: [
            { value: "blanks", label: "Replace with blanks (for string fields)" },
            { value: "0", label: "Replace with 0 (for numeric fields)" },
            { value: "custom", label: "Replace with custom value" },
            { value: "median", label: "Fill with median (for numeric fields)" },
            { value: "ffill", label: "Forward fill" },
            { value: "bfill", label: "Backward fill" },
          ],
        },
        {
          type: "input",
          label: "Value",
          id: "value",
          condition: { replaceMethod: "custom" },
          placeholder: "Enter value"
        },
        {
          type: "selectMultipleCustomizable",
          label: "Remove Unwanted Characters",
          id: "removeUnwantedCharacters",
          options: [
            { value: "whitespace", label: "Leading and Trailing Whitespace" },
            { value: "tabs", label: "Tabs" },
            { value: "Line breaks", label: "Line Breaks" },
            { value: "allwhitespace", label: "All Whitespace" },
            { value: "letters", label: "All Letters" },
            { value: "numbers", label: "All Numbers" },
            { value: "punctuation", label: "Punctuation" }
          ],
        },
        {
          type: "select",
          label: "Modify Case",
          id: "case",
          options: [
            { value: "lower", label: "Lower Case", tooltip: "Convert all characters to lowercase." },
            { value: "upper", label: "Upper Case", tooltip: "Convert all characters to uppercase." },
            { value: "capitalize", label: "Capitalize", tooltip: "Capitalize the first letter of the string and lowercase the rest." },
            { value: "swapcase", label: "Swap Case", tooltip: "Swap uppercase characters to lowercase and vice versa." },
            { value: "camelcase", label: "Camel Case", tooltip: "Convert to camel case, where the first letter is lowercase and subsequent words are capitalized without spaces." },
            { value: "snakecase", label: "Snake Case", tooltip: "Replace spaces with underscores and convert all characters to lowercase." },
          ]
        },
      ],
    };

    super("Data Cleansing", "cleanDataCLeansing", "no desc", "pandas_df_processor", [], "transforms", checkDiamondIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const codeLines: string[] = [];

    codeLines.push("# Data Cleansing");
    codeLines.push(`${outputName} = (${inputName}`);

    // Drop rows with NULL values
    if (config.removeNullRows) {
      const dropHow = config.removeRowsHow || "any";
      codeLines.push(`    .dropna(axis=0, how='${dropHow}')`);
    }

    // Drop columns with NULL values
    if (config.removeNullColumns) {
      const dropHow = config.removeColumnsHow || "any";
      codeLines.push(`    .dropna(axis=1, how='${dropHow}')`);
    }

    const columns = config.columns;

      if (columns.length > 0) {
        // Apply fillna for specific columns
        switch (config.replaceMethod) {
            case "blanks":
                columns.forEach(col => {
                    codeLines.push(`    .assign(${col}: lambda x: x[${col}].fillna(""))`);
                });
                break;
            case "0":
                columns.forEach(col => {
                    codeLines.push(`    .assign(${col}: lambda x: x[${col}].fillna(0))`);
                });
                break;
            case "custom":
                const value = typeof config.value === 'string' ? `"${config.value}"` : config.value;
                columns.forEach(col => {
                    codeLines.push(`    .assign(${col}: lambda x: x[${col}].fillna(${value}))`);
                });
                break;
            case "median":
                columns.forEach(col => {
                    codeLines.push(`    .assign(${col}: lambda x: x[${col}].fillna(${inputName}[${col}].median()))`);
                });
                break;
            case "ffill":
                columns.forEach(col => {
                    codeLines.push(`    .assign(${col}: lambda x: x[${col}].fillna(method='ffill'))`);
                });
                break;
            case "bfill":
                columns.forEach(col => {
                    codeLines.push(`    .assign(${col}: lambda x: x[${col}].fillna(method='bfill'))`);
                });
                break;
        }
    } else {
        // Apply fillna for all columns based on data type
        switch (config.replaceMethod) {
            case "blanks":
                codeLines.push(`    .assign(**{col: ${inputName}[col].fillna("") for col in ${inputName}.select_dtypes(include=['object', 'category']).columns})`);
                break;
            case "0":
                codeLines.push(`    .assign(**{col: ${inputName}[col].fillna(0) for col in ${inputName}.select_dtypes(include=['number']).columns})`);
                break;
            case "custom":
                const value = typeof config.value === 'string' ? `"${config.value}"` : config.value;
                codeLines.push(`    .assign(**{col: ${inputName}[col].fillna(${value}) for col in ${inputName}.columns})`);
                break;
            case "median":
                codeLines.push(`    .assign(**{col: ${inputName}[col].fillna(${inputName}[col].median()) for col in ${inputName}.select_dtypes(include=['number']).columns})`);
                break;
            case "ffill":
                codeLines.push(`    .assign(**{col: ${inputName}[col].fillna(method='ffill') for col in ${inputName}.columns})`);
                break;
            case "bfill":
                codeLines.push(`    .assign(**{col: ${inputName}[col].fillna(method='bfill') for col in ${inputName}.columns})`);
                break;
        }
    }

    codeLines.push(`)`); // Close the parentheses

    return codeLines.join('\n');
  }


}
