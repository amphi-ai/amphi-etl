import { eyeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Summary extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { statisticsType: "numerical" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Apply to column types",
          id: "statisticsType",
          placeholder: "Select statistics type",
          options: [
            { value: "all", label: "All types",  },
            { value: "numerical", label: "Numerical only", tooltip: "Limit the result to numeric types" },
            { value: "categorical", label: "Categorical only", toolip: "Limit the result to categorical types" },
          ],
        }
      ],
    };

    const description = "Use Summary Component to provide a statistical summary of the incoming data.";

    super("Summary", "summary", description, "pandas_df_processor", [], "transforms", eyeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const statisticsType = config.statisticsType;
    let code = `
# Generate summary statistics
`;

    switch (statisticsType) {
      case "all":
        code += `${outputName} = ${inputName}.describe(include='all')`;
        break;
      case "numerical":
        code += `${outputName} = ${inputName}.describe()`;
        break;
      case "categorical":
        code += `${outputName} = ${inputName}.describe(include=['object', 'category'])`;
        break;
      default:
        code += `${outputName} = ${inputName}.describe()`;
        break;
    }

    return code + '\n';
  }
}
