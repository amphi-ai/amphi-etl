import { plusCircleIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Unite extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { ignoreIndex: true, sort: false, concatDirection: "horizontal" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Concatenation direction",
          id: "concatDirection",
          tooltip: "Select whether you want to concatenate the datasets vertically (stacking rows) or horizontally (side-by-side columns).",
          options: [
            { value: "horizontal", label: "Along columns (horizontal)" },
            { value: "vertical", label: "Along rows (vertical)" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Ignore Index",
          tooltip: "Enable this option to reindex the combined dataset.",
          id: "ignoreIndex",
          advanced: true
        },
        {
          type: "boolean",
          label: "Sort",
          tooltip: "Disable this option to prevent automatic sorting of columns.",
          id: "sort",
          advanced: true
        }
      ],
    };
    const description = "Use Concatenate to combine two or more datasets vertically (stacking rows) or horizontally (side-by-side columns)."

    super("Concatenate", "concat", description, "pandas_df_multi_processor", [], "transforms", plusCircleIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputNames, outputName }): string {
    
    const prefix = config?.backend?.prefix ?? "pd";    const ignoreIndex = config.ignoreIndex !== undefined ? `, ignore_index=${config.ignoreIndex ? 'True' : 'False'}` : '';
    const sort = config.sort !== undefined ? `, sort=${config.sort ? 'True' : 'False'}` : '';
    const concatDirection = config.concatDirection === "horizontal" 
    ? ", axis=1" 
    : config.concatDirection === "vertical"
    ? ", axis=0"
    : "";

    const dataframesList = inputNames.join(', ');

    const code = `
# Concatenate dataframes
${outputName} = ${prefix}.concat([${dataframesList}]${ignoreIndex}${sort}${concatDirection})
`;
    return code;
  }
}