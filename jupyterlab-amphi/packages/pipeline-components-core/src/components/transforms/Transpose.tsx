
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
      ],
    };
    const description = "Use Transpose Dataset to swap the rows and the columns of a dataset. It simply repositions the data without aggregation. If you're looking for rearranging and aggregating the data, check out the Pivot Dataset component."

    super("Transpose Dataset", "transpose", description, "pandas_df_processor", [], "transforms", transposeIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const code = `
# Transpose data
${outputName} = ${inputName}.transpose()
`;
    return code;
  }
  

}
