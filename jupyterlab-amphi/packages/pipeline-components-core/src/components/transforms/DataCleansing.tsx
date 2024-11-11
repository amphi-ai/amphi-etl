
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

    const description = "Use Data Cleansing to clean and preprocess your data. It provides options to handle missing values, drop null rows or columns, modify string cases, and remove unwanted characters. You can apply these transformations to specific columns or the entire dataset.";

    super("Data Cleansing", "cleanDataCLeansing", description, "pandas_df_processor", [], "transforms", checkDiamondIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const imports = [];
    // Import 're' only if unwanted characters are specified
    if (config.removeUnwantedCharacters && config.removeUnwantedCharacters.length > 0) {
      imports.push("import re");
    }
    return imports;
  }


  public generateComponentCode({ config, inputName, outputName }): string {
    const code = [];

    const columns = config.columns;

    function getColumnReference(column: { value: string, named: boolean, type: string }): string {
      return column.named ? `'${column.value}'` : `${column.value}`;
    }

    // Determine if specific columns are provided
    const columnsArray = columns && columns.length > 0 ? columns.map(getColumnReference) : null;
    const columnsList = columnsArray ? `[${columnsArray.join(', ')}]` : null;

    code.push(`${outputName} = ${inputName}.copy()`);

    // Handle missing value replacement
    if (config.replaceMethod) {
      let value;
      if (config.replaceMethod === 'blanks') {
        value = "''";
      } else if (config.replaceMethod === '0') {
        value = '0';
      } else if (config.replaceMethod === 'custom') {
        value = isNaN(Number(config.value)) ? `'${config.value}'` : config.value;
      }

      if (['blanks', '0', 'custom'].includes(config.replaceMethod)) {
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].fillna(${value})`);
        } else {
          code.push(`${outputName} = ${outputName}.fillna(${value})`);
        }
      } else if (config.replaceMethod === 'median') {
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].fillna(${outputName}[${columnsList}].median())`);
        } else {
          code.push(`${outputName} = ${outputName}.fillna(${outputName}.median())`);
        }
      } else if (['ffill', 'bfill'].includes(config.replaceMethod)) {
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].fillna(method='${config.replaceMethod}')`);
        } else {
          code.push(`${outputName} = ${outputName}.fillna(method='${config.replaceMethod}')`);
        }
      }
    }

    // Handle removal of unwanted characters and case modifications
    const unwantedCharacterMapping = {
      'whitespace': { '^\\s+|\\s+$': '' },
      'tabs': { '\\t': '' },
      'Line breaks': { '\\n': '', '\\r': '' },
      'allwhitespace': { '\\s+': '' },
      'letters': { '[A-Za-z]+': '' },
      'numbers': { '\\d+': '' },
      'punctuation': { '[^\\w\\s]+': '' }
    };

    const removeUnwantedChars = config.removeUnwantedCharacters || [];
    let replaceDict = {};

    removeUnwantedChars.forEach(char => {
      const mappings = unwantedCharacterMapping[char];
      if (mappings) {
        replaceDict = { ...replaceDict, ...mappings };
      }
    });

    const caseMapping = {
      'lower': '.lower()',
      'upper': '.upper()',
      'capitalize': '.capitalize()',
      'swapcase': '.swapcase()',
      'camelcase': ".title().replace(' ', '')",
      'snakecase': ".replace(' ', '_').lower()"
    };

    // Determine case transformation
    const caseOption = config.case;
    const caseTransform = caseOption ? caseMapping[caseOption] : null;

    if (Object.keys(replaceDict).length > 0 || caseTransform) {
      if (columnsList) {
        code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].astype(str)`);
      } else {
        code.push(`${outputName} = ${outputName}.astype(str)`);
      }

      if (Object.keys(replaceDict).length > 0) {
        const regexFlag = 'regex=True';
        const replaceStr = JSON.stringify(replaceDict).replace(/"/g, '\'');
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].replace(${replaceStr}, ${regexFlag})`);
        } else {
          code.push(`${outputName} = ${outputName}.replace(${replaceStr}, ${regexFlag})`);
        }
      }

      if (caseTransform) {
        if (columnsArray) {
          if (columnsArray.length === 1) {
            const col = columnsArray[0];
            code.push(`${outputName}[${col}] = ${outputName}[${col}].str${caseTransform}`);
          } else {
            code.push(`for col in ${columnsList}:`);
            code.push(`    ${outputName}[col] = ${outputName}[col].str${caseTransform}`);
          }
        } else {
          code.push(`for col in ${outputName}.columns:`);
          code.push(`    ${outputName}[col] = ${outputName}[col].str${caseTransform}`);
        }
      }
    }

    // Handle removal of null rows
    if (config.removeNullRows) {
      if (columnsList) {
        code.push(`${outputName} = ${outputName}.dropna(axis=0, how='${config.removeRowsHow}', subset=${columnsList})`);
      } else {
        code.push(`${outputName} = ${outputName}.dropna(axis=0, how='${config.removeRowsHow}')`);
      }
    }

    // Handle removal of null columns
    if (config.removeNullColumns) {
      if (columnsList) {
        code.push(`${outputName} = ${outputName}.dropna(axis=1, how='${config.removeColumnsHow}', subset=${columnsList})`);
      } else {
        code.push(`${outputName} = ${outputName}.dropna(axis=1, how='${config.removeColumnsHow}')`);
      }
    }

    return code.join('\n');
  }

}