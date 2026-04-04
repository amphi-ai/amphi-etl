import { washIcon } from '../../icons'; // Define this icon in your icons file
import { BaseCoreComponent } from '../BaseCoreComponent';

export class DataCleansing extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
	tsCFselectReplaceMethod: "value",
	tsCFinputValue: 0
	};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "boolean",
          label: "Drop rows with NULL values",
          id: "tsCFbooleanRemoveNullRows",
          advanced: true
        },
        {
          type: "radio",
          label: "Drop rows if",
          id: "tsCFradioRemoveRowsHow",
          options: [
            { value: "all", label: "All values are NULL" },
            { value: "any", label: "Any values are NULL (at least one)" }
          ],
          condition: { tsCFbooleanRemoveNullRows: true },
          advanced: true
        },
        {
          type: "boolean",
          label: "Drop columns with NULL values",
          id: "tsCFbooleanRemoveNullColumns",
          advanced: true
        },
        {
          type: "radio",
          label: "Drop rows if",
          id: "tsCFremoveradioColumnsHow",
          options: [
            { value: "all", label: "All values are NULL" },
            { value: "any", label: "Any values are NULL (at least one)" }
          ],
          condition: { tsCFbooleanRemoveNullColumns: true },
          advanced: true
        },
        {
          type: "columns",
          label: "Apply cleansing to columns",
          id: "tsCFcolumnsSelectColumns",
          tooltip: "Select the columns to apply the cleansing rules. If left blank, all columns will be selected by default.",
          placeholder: "Default: All columns",
          advanced: true
        },
        {
          type: "select",
          label: "Replace missing values with",
          id: "tsCFselectReplaceMethod",
          options: [
            { value: "blanks", label: "Replace with blanks (for string fields)" },
            { value: "0", label: "Replace with 0 (for numeric fields)" },
            { value: "custom", label: "Replace with custom value" },
            { value: "median", label: "Fill with median (for numeric fields)" },
            { value: "ffill", label: "Forward fill" },
            { value: "bfill", label: "Backward fill" },
          ],
          selectionRemovable: true
        },
        {
          type: "input",
          label: "Value",
          id: "tsCFinputValue",
          condition: { tsCFselectReplaceMethod: "custom" },
          placeholder: "Enter value"
        },
        {
          type: "selectMultipleCustomizable",
          label: "Remove Unwanted Characters",
          id: "tsCFselectMultipleCustomizableRemoveUnwantedCharacters",
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
          id: "tsCFselectCase",
          options: [
            { value: "lower", label: "Lower Case", tooltip: "Convert all characters to lowercase." },
            { value: "upper", label: "Upper Case", tooltip: "Convert all characters to uppercase." },
            { value: "capitalize", label: "Capitalize", tooltip: "Capitalize the first letter of the string and lowercase the rest." },
            { value: "swapcase", label: "Swap Case", tooltip: "Swap uppercase characters to lowercase and vice versa." },
            { value: "camelcase", label: "Camel Case", tooltip: "Convert to camel case, where the first letter is lowercase and subsequent words are capitalized without spaces." },
            { value: "snakecase", label: "Snake Case", tooltip: "Replace spaces with underscores and convert all characters to lowercase." },
          ],
          selectionRemovable: true
        },
      ],
    };

    const description = "Use Data Cleansing to clean and preprocess your data. It provides options to handle missing values, drop null rows or columns, modify string cases, and remove unwanted characters. You can apply these transformations to specific columns or the entire dataset.";

    super("Data Cleansing", "cleanDataCLeansing", description, "pandas_df_processor", [], "transforms", washIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const imports = [];
    // Import 're' only if unwanted characters are specified
    if (config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters && config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters.length > 0) {
      imports.push("import re");
    }
    return imports;
  }


  public generateComponentCode({ config, inputName, outputName }): string {
    const code = [];

    const columns = config.tsCFcolumnsSelectColumns;

    function getColumnReference(column: { value: string, named: boolean, type: string }): string {
      return column.named ? `'${column.value}'` : `${column.value}`;
    }

    // Determine if specific columns are provided
    const columnsArray = columns && columns.length > 0 ? columns.map(getColumnReference) : null;
    const columnsList = columnsArray ? `[${columnsArray.join(', ')}]` : null;

    code.push(`${outputName} = ${inputName}.copy()`);

    // Handle missing value replacement
    if (config.tsCFselectReplaceMethod) {
      let value;
      if (config.tsCFselectReplaceMethod === 'blanks') {
        value = "''";
      } else if (config.tsCFselectReplaceMethod === '0') {
        value = '0';
      } else if (config.tsCFselectReplaceMethod === 'custom') {
        value = isNaN(Number(config.tsCFinputValue)) ? `'${config.tsCFinputValue}'` : config.tsCFinputValue;
      }

      if (['blanks', '0', 'custom'].includes(config.tsCFselectReplaceMethod)) {
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].fillna(${value})`);
        } else {
          code.push(`${outputName} = ${outputName}.fillna(${value})`);
        }
      } else if (config.tsCFselectReplaceMethod === 'median') {
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].fillna(${outputName}[${columnsList}].median())`);
        } else {
          code.push(`${outputName} = ${outputName}.fillna(${outputName}.median())`);
        }
      } else if (['ffill', 'bfill'].includes(config.tsCFselectReplaceMethod)) {
        if (columnsList) {
          code.push(`${outputName}[${columnsList}] = ${outputName}[${columnsList}].fillna(method='${config.tsCFselectReplaceMethod}')`);
        } else {
          code.push(`${outputName} = ${outputName}.fillna(method='${config.tsCFselectReplaceMethod}')`);
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

    const removeUnwantedChars = config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters || [];
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
      'snakecase': ".replace(' ', '_').str.lower()"
    };

    // Determine case transformation
    const caseOption = config.tsCFselectCase;
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
    if (config.tsCFbooleanRemoveNullRows) {
      if (columnsList) {
        code.push(`${outputName} = ${outputName}.dropna(axis=0, how='${config.tsCFradioRemoveRowsHow}', subset=${columnsList})`);
      } else {
        code.push(`${outputName} = ${outputName}.dropna(axis=0, how='${config.tsCFradioRemoveRowsHow}')`);
      }
    }

    // Handle removal of null columns
    if (config.tsCFbooleanRemoveNullColumns) {
      if (columnsList) {
        code.push(`${outputName} = ${outputName}.dropna(axis=1, how='${config.tsCFremoveradioColumnsHow}', subset=${columnsList})`);
      } else {
        code.push(`${outputName} = ${outputName}.dropna(axis=1, how='${config.tsCFremoveradioColumnsHow}')`);
      }
    }

    return code.join('\n');
  }

}