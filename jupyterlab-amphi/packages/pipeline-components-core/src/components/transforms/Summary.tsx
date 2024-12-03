import { eyeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Summary extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { 
      statisticsType: "all",
      pivot: "rows" // Set default pivot to 'columns'
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Apply to column types",
          id: "statisticsType",
          placeholder: "Select statistics type",
          options: [
            { value: "all", label: "All types" },
            { value: "numerical", label: "Numerical only", tooltip: "Limit the result to numeric types" },
            { value: "categorical", label: "Categorical only", tooltip: "Limit the result to categorical types" }, // Fixed 'toolip' to 'tooltip'
          ],
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
    let code = `
# Generate summary statistics
`;

    switch (statisticsType) {
      case "all":
        code += `${outputName} = ${inputName}.describe(include='all')\n`;
        break;
      case "numerical":
        code += `${outputName} = ${inputName}.describe()\n`;
        break;
      case "categorical":
        code += `${outputName} = ${inputName}.describe(include=['object', 'category'])\n`;
        break;
      default:
        code += `${outputName} = ${inputName}.describe()\n`;
        break;
    }

    // Apply pivot if specified
    if (pivot === "rows") {
      code += `${outputName} = ${outputName}.transpose()\n`;
    }

    return code + '\n';
  }
}
