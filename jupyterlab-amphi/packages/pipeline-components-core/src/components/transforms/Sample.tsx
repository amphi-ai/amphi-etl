import { ComponentItem, PipelineComponent } from '@amphi/pipeline-components-manager';
import { randomIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Sample extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { numberType: "number", rows: 1, percentage: 1, mode: "random", groupBy: [] };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Type",
          id: "numberType",
          options: [
            { value: "number", label: "Fixed Number" },
            { value: "percentage", label: "Percentage" }
          ],
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Rows number",
          id: "rows",
          placeholder: "0",
          min: 0,
          condition: { numberType: "number" }
        },
        {
          type: "inputNumber",
          label: "Percentage",
          id: "percentage",
          placeholder: "0",
          min: 0,
          max: 100,
          condition: { numberType: "percentage" }
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
        },
        {
          type: "columns",
          label: "Group By Columns",
          id: "groupBy",
          selectAll: true,
          advanced: true
        }
      ],
    };
    const description = "Use the Sample component to limit data by selecting a specified number of rows or percentage, either randomly, from the start, or from the end of the dataset. You can also group the sampling by one or more columns.";

    super("Sample Datasets", "sample", description, "pandas_df_processor", [], "transforms", randomIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  private formatGroupByColumns(groupBy: { value: string | number; type: string; named: boolean }[]): string {
    return groupBy.map(col => (col.named ? `"${col.value}"` : col.value)).join(', ');
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let sampleCode = "";

    const groupByColumns = config.groupBy && config.groupBy.length > 0 
      ? `[${this.formatGroupByColumns(config.groupBy)}]` 
      : null;

    if (config.numberType === "number") {
      if (config.mode === "random") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).sample(n=${config.rows})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.sample(n=${config.rows})`;
        }
      } else if (config.mode === "tail") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).tail(${config.rows})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.tail(${config.rows})`;
        }
      } else if (config.mode === "head") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).head(${config.rows})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.head(${config.rows})`;
        }
      }
    } else if (config.numberType === "percentage") {
      const frac = config.percentage / 100;
      if (config.mode === "random") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).sample(frac=${frac})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.sample(frac=${frac})`;
        }
      } else if (config.mode === "tail") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).apply(lambda x: x.tail(int(len(x) * ${frac}))).reset_index(drop=True)`;
        } else {
          sampleCode = `${outputName} = ${inputName}.iloc[-int(len(${inputName}) * ${frac}):]`;
        }
      } else if (config.mode === "head") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).apply(lambda x: x.head(int(len(x) * ${frac}))).reset_index(drop=True)`;
        } else {
          sampleCode = `${outputName} = ${inputName}.iloc[:int(len(${inputName}) * ${frac})]`;
        }
      }
    }

    // Template for the pandas query code
    const code = `
${sampleCode}
`;
    return code;
  }
}
