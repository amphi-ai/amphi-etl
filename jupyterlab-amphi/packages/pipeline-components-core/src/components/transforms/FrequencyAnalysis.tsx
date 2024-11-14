import { activityIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class FrequencyAnalysis extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      columns: [],
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Select Columns",
          id: "columns",
          placeholder: "Default: all columns",
        }
      ],
    };

    const description = "Use Frequency Analysis to generate frequency tables on columns.";

    super("Frequency Analysis", "frequencyAnalysis", description, "pandas_df_processor", [], "Data Exploration", activityIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to perform frequency analysis
    const frequencyAnalysisFunction = `
# Function to perform frequency analysis
def frequency_analysis(df, column_name):
    # Frequency counts
    frequency = df[column_name].value_counts(dropna=False)
    percentage = df[column_name].value_counts(normalize=True, dropna=False) * 100
    
    # Cumulative frequency and percentage
    cumulative_frequency = frequency.cumsum()
    cumulative_percent = percentage.cumsum()

    # Combine all into a DataFrame
    result = ${prefix}.DataFrame({
        'Field Name': column_name,
        'Field Value': frequency.index,
        'Frequency': frequency.values,
        'Percent': percentage.values,
        'Cumulative Frequency': cumulative_frequency.values,
        'Cumulative Percent': cumulative_percent.values
    })
    return result
    `;
    return [frequencyAnalysisFunction];
  }

  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const prefix = config?.backend?.prefix ?? "pd";

    const selectedColumns = config.columns;
    let code = `
# Perform frequency analysis on selected columns
${outputName}_results = []
`;

    // Helper function to get the correct column reference
    const getColumnReference = (column: any) => {
      return column.named ? `'${column.value}'` : column.value;
    };

    // Check if columns are selected; if not, analyze all columns
    if (selectedColumns && selectedColumns.length > 0) {
      code += selectedColumns.map((col: any) => {
        const columnRef = getColumnReference(col);
        return `
${outputName}_result_${col.value} = frequency_analysis(${inputName}, ${columnRef})
${outputName}_result_${col.value}['Field Name'] = '${col.value}'
${outputName}_results.append(${outputName}_result_${col.value})
`;
      }).join('');

      code += `${outputName} = ${prefix}.concat(${outputName}_results, ignore_index=True)\n`;
    } else {
      // If no columns are selected, analyze all columns
      code += `
for col in ${inputName}.columns:
    result = frequency_analysis(${inputName}, col)
    ${outputName}_results.append(result)
${outputName} = ${prefix}.concat(${outputName}_results, ignore_index=True)\n`;
    }

    return code + '\n';
  }
}
