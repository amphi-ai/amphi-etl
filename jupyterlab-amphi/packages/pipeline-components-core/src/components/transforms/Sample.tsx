import { ComponentItem, PipelineComponent } from '@amphi/pipeline-components-manager';
import { randomIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Sample extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { mode: "random" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "inputNumber",
          label: "Rows number",
          id: "rows",
          placeholder: "0",
          min: 0
        },
        {
          type: "radio",
          label: "Mode",
          id: "mode",
          options: [
            { value: "random", label: "Random" },
            { value: "head", label: "First" },
            { value: "tail", label: "Last" }
          ],
          advanced: true
        }
      ],
    };

    super("Sample Datasets", "sample", "pandas_df_processor", [], "transforms", randomIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let sampleCode = "";

    if (config.mode === "random") {
      sampleCode = `${outputName} = ${inputName}.sample(n=${config.rows})`;
    } else if (config.mode === "tail") {
      sampleCode = `${outputName} = ${inputName}.tail(${config.rows})`;
    } else if (config.mode === "head") {
      sampleCode = `${outputName} = ${inputName}.head(${config.rows})`;
    }

    // Template for the pandas query code
    const code = `
${sampleCode}
`;
    return code;
  }



}