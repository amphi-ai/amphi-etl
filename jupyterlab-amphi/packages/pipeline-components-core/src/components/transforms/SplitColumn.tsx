import { splitIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class SplitColumn extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { splitType: "columns", regex: false, keepOriginalColumn: false };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Split Type",
          id: "splitType",
          options: [
            { value: "columns", label: "Split to columns" },
            { value: "rows", label: "Split to rows" }
          ],
          advanced: true
        },
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
          label: "Is delimiter a regex?",
          id: "regex",
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Number of columns",
          id: "numberColumns",
          placeholder: "auto",
          min: 1,
          condition: { splitType: "columns" }
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
    const prefix = config?.backend?.prefix ?? "pd";
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
  
    // Determine whether to use regex in the split
    const regexOption = config.regex ? ", regex=True" : "";
  
    // Add the split logic based on splitType
    if (config.splitType === "columns") {
      // Split to columns
      code += `${uniqueSplitVar} = ${inputName}[${columnAccess}].str.split("${config.delimiter}"${regexOption}, expand=True)\n`;
  
      // Rename the new columns to avoid any potential overlap
      code += `${uniqueSplitVar}.columns  = [f"${columnName}_{i}" for i in range(${uniqueSplitVar}.shape[1])]\n`;
  
      // If numberColumns is specified, keep only the desired number of columns
      if (config.numberColumns > 0) {
        code += `${uniqueSplitVar} = ${uniqueSplitVar}.iloc[:, :${config.numberColumns}]\n`;
      }
  
      // Combine the original DataFrame with the new columns
      code += `${outputName} = ${prefix}.concat([${inputName}, ${uniqueSplitVar}], axis=1)\n`;
  
      // Check if the original column should be kept
      if (!config.keepOriginalColumn) {
        code += `\n# Remove the original column used for split\n`;
        code += `${outputName}.drop(columns=[${columnAccess}], inplace=True)\n`;
      }
    } else if (config.splitType === "rows") {
      // Split to rows
      code += `${uniqueSplitVar} = ${inputName}.assign(${columnAccess}=${inputName}[${columnAccess}].str.split("${config.delimiter}"${regexOption}))\n`;
      code += `${uniqueSplitVar} = ${uniqueSplitVar}.explode(${columnAccess})\n`;
      code += `${outputName} = ${uniqueSplitVar}\n`;
    }
  
    // Return the generated code
    return code;
  }


}