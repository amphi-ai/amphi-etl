import { plusCircleIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Unite extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { ignoreIndex: true, sort: false };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "boolean",
          label: "Ignore Index",
          tooltip: "Enable this option to reindex the combined dataset.",
          id: "ignoreIndex",
        },
        {
          type: "boolean",
          label: "Sort",
          tooltip: "Disable this option to prevent automatic sorting of columns.",
          id: "sort",
        }
      ],
    };

    super("Unite Dataset", "concat", "pandas_df_multi_processor", [], "transforms", plusCircleIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputNames, outputName }): string {

    const ignoreIndex = config.ignoreIndex !== undefined ? `, ignore_index=${config.ignoreIndex ? 'True' : 'False'}` : '';
    const sort = config.sort !== undefined ? `, sort=${config.sort ? 'True' : 'False'}` : '';

    const dataframesList = inputNames.join(', ');

    const code = `
# Concatenate dataframes
${outputName} = pd.concat([${dataframesList}]${ignoreIndex}${sort})
`;
    return code;
  }
}