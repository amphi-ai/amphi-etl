import { ComponentItem, PipelineComponent } from '@amphi/pipeline-components-manager';
import { sampleIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Sample extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
    	tsCFradioNumberType: "number",
		tsCFinputNumberRows: 1,
		tsCFinputPercentage: 1,
		tsCFradioMode: "random",
		tsCFcolumnsGroupByColumns: [] 
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Type",
          id: "tsCFradioNumberType",
          options: [
            { value: "number", label: "Fixed Number" },
            { value: "percentage", label: "Percentage" }
          ],
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Rows number",
          id: "tsCFinputNumberRows",
          placeholder: "0",
          min: 0,
          condition: { tsCFradioNumberType: "number" }
        },
        {
          type: "inputNumber",
          label: "Percentage",
          id: "tsCFinputPercentage",
          placeholder: "0",
          min: 0,
          max: 100,
          condition: { tsCFradioNumberType: "percentage" }
        },
        {
          type: "radio",
          label: "Mode",
          id: "tsCFradioMode",
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
          id: "tsCFcolumnsGroupByColumns",
          selectAll: true,
          advanced: true
        }
      ],
    };
    const description = "Use the Sample component to limit data by selecting a specified number of rows or percentage, either randomly, from the start, or from the end of the dataset. You can also group the sampling by one or more columns.";

    super("Sample Datasets", "sample", description, "pandas_df_processor", [], "transforms", sampleIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  private formatGroupByColumns(groupBy: { value: string | number; type: string; named: boolean }[]): string {
    return groupBy.map(col => (col.named ? `"${col.value}"` : col.value)).join(', ');
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let sampleCode = "";

    const groupByColumns = config.tsCFcolumnsGroupByColumns && config.tsCFcolumnsGroupByColumns.length > 0 
      ? `[${this.formatGroupByColumns(config.tsCFcolumnsGroupByColumns)}]` 
      : null;

    if (config.tsCFradioNumberType === "number") {
      if (config.tsCFradioMode === "random") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).sample(n=${config.tsCFinputNumberRows})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.sample(n=${config.tsCFinputNumberRows})`;
        }
      } else if (config.tsCFradioMode === "tail") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).tail(${config.tsCFinputNumberRows})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.tail(${config.tsCFinputNumberRows})`;
        }
      } else if (config.tsCFradioMode === "head") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).head(${config.tsCFinputNumberRows})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.head(${config.tsCFinputNumberRows})`;
        }
      }
    } else if (config.tsCFradioNumberType === "percentage") {
      const frac = config.tsCFinputPercentage / 100;
      if (config.tsCFradioMode === "random") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).sample(frac=${frac})`;
        } else {
          sampleCode = `${outputName} = ${inputName}.sample(frac=${frac})`;
        }
      } else if (config.tsCFradioMode === "tail") {
        if (groupByColumns) {
          sampleCode = `${outputName} = ${inputName}.groupby(${groupByColumns}).apply(lambda x: x.tail(int(len(x) * ${frac}))).reset_index(drop=True)`;
        } else {
          sampleCode = `${outputName} = ${inputName}.iloc[-int(len(${inputName}) * ${frac}):]`;
        }
      } else if (config.tsCFradioMode === "head") {
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
