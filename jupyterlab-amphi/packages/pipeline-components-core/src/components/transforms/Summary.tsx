import { eyeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Summary extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      statisticsType: "all",
      pivot: "rows", // Set default pivot to 'rows'
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Apply to ",
          id: "statisticsType",
          placeholder: "Select statistics type",
          options: [
            { value: "all", label: "All columns" },
            { value: "numerical", label: "Numerical columns", tooltip: "Limit the result to numeric columns" },
            { value: "categorical", label: "Categorical columns", tooltip: "Limit the result to categorical columns" },
            { value: "select", label: "Select columns", tooltip: "Limit the result to the selected columns" },
          ],
        },
        {
          type: "columns",
          label: "Columns",
          id: "columns",
          placeholder: "Select columns",
          tooltip: "Select which columns to analyze",
          condition: { statisticsType: "select" },
          advanced: true
        },
        {
          type: "radio",
          label: "Resulting Table Columns",
          id: "pivot",
          placeholder: "Select how should the resulting table be formatted",
          options: [
            { value: "rows", label: "As rows" },
            { value: "columns", label: "As columns" }
          ],
        }
      ],
    };

    const description = "Use Summary Component to provide a statistical summary of the incoming data.";

    super("Summary", "summary", description, "pandas_df_processor", [], "Data Exploration", eyeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const statisticsType = config.statisticsType;
    const pivot = config.pivot;
    
    let code = `# Generate summary statistics\n`;

    // Handle subset selection based on statisticsType.
    if (statisticsType === "select") {
      const selectedColumns = config.columns.map((col: any) => col.value);
      code += `df_subset = ${inputName}[${JSON.stringify(selectedColumns)}]\n`;
    } else if (statisticsType === "numerical") {
      code += `df_subset = ${inputName}.select_dtypes(include=['number'])\n`;
    } else if (statisticsType === "categorical") {
      code += `df_subset = ${inputName}.select_dtypes(include=['object', 'category'])\n`;
    } else {
      code += `df_subset = ${inputName}\n`;
    }

    // Use describe for summary statistics.
    if (statisticsType === "categorical") {
      code += `${outputName} = df_subset.describe(include=['object', 'category'])\n`;
    } else if (statisticsType === "all" || statisticsType === "select") {
      code += `${outputName} = df_subset.describe(include='all')\n`;
    } else {
      code += `${outputName} = df_subset.describe()\n`;
    }

    // Apply pivot if specified.
    if (pivot === "rows") {
      code += `${outputName} = ${outputName}.transpose()\n`;
    }

    return code + '\n';
  }
}
