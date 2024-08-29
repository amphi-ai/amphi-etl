import { splitIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class SplitColumn extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { keepOriginalColumn: false };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column",
          id: "column",
          placeholder: "Type column name",
        },
        {
          type: "selectCustomizable",
          label: "Delimiter",
          id: "delimiter",
          placeholder: "Select or type delimiter",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" },
            { value: "  ", label: "tab" },
            { value: "|", label: "pipe (|)" }
          ],
        },
        {
          type: "boolean",
          label: "Keep original column",
          id: "keepOriginalColumn",
          advanced: true
        }
      ],
    }
    const description = "Use Split Column to split the text from one column into multiple columns.";

    super("Split Column", "splitColumn", description, "pandas_df_processor", [], "transforms", splitIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const columnName = config.column.value; // name of the column
    const columnType = config.column.type; // current type of the column (e.g., 'int', 'string')
    const columnNamed = config.column.named; // boolean, true if column is named, false if index is used

    // Ensure unique variable names for intermediate dataframes
    const uniqueSplitVar = `${outputName}_split`;
    const uniqueCombinedVar = `${outputName}_combined`;

    // Start generating the code string
    let code = `\n# Create a new DataFrame from the split operation\n`;

    // Handling column access based on whether it's named or indexed
    const columnAccess = columnNamed ? `"${columnName}"` : columnName;

    // Convert column to string if it's not already
    if (columnType !== "string") {
      code += `${inputName}[${columnAccess}] = ${inputName}[${columnAccess}].astype("string")\n`;
    }

    // Split operation
    code += `${uniqueSplitVar} = ${inputName}[${columnAccess}].str.split("${config.delimiter}", expand=True)\n`;

    // Rename the new columns to avoid any potential overlap
    code += `${uniqueSplitVar}.columns  = [f"${columnName}_{i}" for i in range(${uniqueSplitVar}.shape[1])]\n`;

    // Combine the original DataFrame with the new columns
    code += `${outputName} = pd.concat([${inputName}, ${uniqueSplitVar}], axis=1)\n`;

    // Check if the original column should be kept
    if (!config.keepOriginalColumn) {
      code += `\n# Remove the original column used for split\n`;
      code += `${outputName}.drop(columns=[${columnAccess}], inplace=True)\n`;
    }

    // Assign to output

    return code;
  }


}