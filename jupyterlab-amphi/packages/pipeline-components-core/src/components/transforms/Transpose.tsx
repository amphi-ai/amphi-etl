
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

    super("Transpose Dataset", "transpose", "pandas_df_processor", [], "transforms", transposeIcon, defaultConfig, form);
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
