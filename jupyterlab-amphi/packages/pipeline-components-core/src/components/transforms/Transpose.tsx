import { transposeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Transpose extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { order: "True" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Information",
          id: "information",
          text: "Switches the rows and columns of the input."
        },
        {
          type: "columns",
          label: "Key Columns",
          id: "key",
          selectAll: true,
          advanced: true
        },
        {
          type: "columns",
          label: "Columns to transpose",
          id: "columns",
          selectAll: true,
          advanced: true
        }
      ],
    };
    const description = "Use Transpose Dataset to swap the rows and the columns of a dataset. It simply repositions the data without aggregation. If you're looking for rearranging and aggregating the data, check out the Pivot Dataset component."

    super("Transpose Dataset", "transpose", description, "pandas_df_processor", [], "transforms", transposeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    
    const keyColumns = this.formatColumns(config.key);
    const dataColumns = this.formatColumns(config.columns);

    // Determine if key columns are provided
    const hasKey = config.key && config.key.length > 0;
    const idVars = hasKey ? `[${keyColumns}]` : '';

    // Determine if specific data columns are provided
    const hasDataColumns = config.columns && config.columns.length > 0;
    const valueVars = hasDataColumns ? `[${dataColumns}]` : '';

    // Create the melt function parameters
    const meltParams = [
      hasKey ? `id_vars=${idVars},` : '',
      hasDataColumns ? `value_vars=${valueVars},` : '',
      `var_name='Variable',`,
      `value_name='Value'`
    ]
      .filter(param => param) // Remove empty strings
      .map(param => `    ${param}`) // Indent each parameter
      .join('\n');

    // Construct the Python code using template literals
    const code = `
# Transpose Dataset Component
${hasKey ? `# Preserving key columns: ${keyColumns}` : `# No key columns provided; transposing entire DataFrame`}

# Melting the DataFrame to unpivot selected columns
melted = ${inputName}.melt(
${meltParams}
)

# Assign the melted DataFrame to the output
${outputName} = melted
`.trim(); // Trim to remove leading/trailing whitespace

    return code;
  }

  private formatColumns(columns: { value: string | number; type: string; named: boolean }[]): string {
    return columns.map(col => (col.named ? `"${col.value}"` : col.value)).join(', ');
  }
}
