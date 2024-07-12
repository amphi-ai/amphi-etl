
import { checkDiamondIcon } from '../../icons'; // Define this icon in your icons file
import { BaseCoreComponent } from '../BaseCoreComponent';

export class FillMissingValues extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { method: "value", value: 0, forward: false, backward: false };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Filling Method",
          id: "method",
          options: [
            { value: "value", label: "Fill with value" },
            { value: "mean", label: "Fill with mean" },
            { value: "median", label: "Fill with median" },
            { value: "ffill", label: "Forward fill" },
            { value: "bfill", label: "Backward fill" },
          ],
        },
        {
          type: "input",
          label: "Value",
          id: "value",
          placeholder: "Enter value"
        },
        {
          type: "columns",
          label: "Apply to columns",
          id: "columns",
          placeholder: "Default (All)",
          advanced: true
        },
      ],
    };

    super("Fill Missing Values", "fillMissingValues", "pandas_df_processor", [], "transform", checkDiamondIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    let code = `# Fill missing values\n`;

    const columns = config.columns && config.columns.length > 0 ? `[${config.columns.map(col => col.named ? `"${col.value}"` : col.value).join(", ")}]` : "";
    const columnsAssignment = config.columns && config.columns.length > 0 ? `${inputName}[${columns}]` : `${inputName}`;

    if (config.method === "value") {

      const value = config.columns.some(col => col.type === 'string') ? `"${config.value}"` : config.value;
      console.log("config.columns %o", config.columns);
      console.log("value %o", value);
      code += `${columnsAssignment} = ${columnsAssignment}.fillna(${value})\n`;
    } else if (config.method === "mean") {
      code += `${columnsAssignment} = ${columnsAssignment}.fillna(${columnsAssignment}.mean())\n`;
    } else if (config.method === "median") {
      code += `${columnsAssignment} = ${columnsAssignment}.fillna(${columnsAssignment}.median())\n`;
    } else if (config.method === "ffill") {
      code += `${columnsAssignment} = ${columnsAssignment}.ffill()\n`;
    } else if (config.method === "bfill") {
      code += `${columnsAssignment} = ${columnsAssignment}.bfill()\n`;
    }

    code += `${outputName} = ${inputName}\n`

    return code;
  }

}
