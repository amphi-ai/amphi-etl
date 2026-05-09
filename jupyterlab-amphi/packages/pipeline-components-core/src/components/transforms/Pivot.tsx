import { pivotIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class Pivot extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFselectAggFunc: "none",
		tsCFinputNumberFillValue: 0
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Index Columns",
          id: "tsCFcolumnsIndexColumns",
          tooltip: "List of columns used as index for the pivot.",
          placeholder: "Select columns"
        },
        {
          type: "columns",
          label: "Columns to pivot",
          id: "tsCFcolumnsColumnsToPivot",
          tooltip: "List of columns that are pivoted.",
          placeholder: "Select columns"
        },
        {
          type: "columns",
          label: "Values",
          id: "tsCFcolumnsValues",
          tooltip: "Values used to fill in the pivot table.",
          placeholder: "Select columns"
        },
        {
          type: "select",
          label: "Aggregation Function",
          id: "tsCFselectAggFunc",
          tooltip: "Aggregation used on the values to fill in the pivot table.",
          options: [
            { value: "none", label: "None (use pivot without aggregation)" },
            { value: "sum", label: "Sum" },
            { value: "mean", label: "Mean" },
            { value: "min", label: "Min" },
            { value: "max", label: "Max" }
          ],
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Fill missing values",
          id: "tsCFinputNumberFillValue",
          placeholder: "0",
          min: 0,
          advanced: true
        },
        {
          type: "boolean",
          label: "Drop rows with missing values",
          id: "tsCFbooleanDropNa",
          advanced: true
        }
      ],
    };
    const description = "Use Pivot Dataset to rearrange and aggregate data in a dataset. It allows you to organize your data into a new table by defining rows, columns, and the values to populate the table. If you're looking to simply swap rows and columns without aggregation, check out the Transpose Dataset component.";

    super("Pivot Dataset", "pivot", description, "pandas_df_processor", [], "transforms", pivotIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }) {
    const formatColumns = (cols) => cols.length === 1 ? `"${cols[0].value}"` : `[${cols.map(col => `"${col.value}"`).join(', ')}]`;

    const indexColumns = formatColumns(config.tsCFcolumnsIndexColumns);
    const columnsToPivot = formatColumns(config.tsCFcolumnsColumnsToPivot);
    const values = formatColumns(config.tsCFcolumnsValues);

    if (config.tsCFselectAggFunc === "none") {
      let code = `
${outputName} = ${inputName}.pivot(
    index=${indexColumns},
    columns=${columnsToPivot},
    values=${values}
).reset_index()\n`;

      if (config.tsCFinputNumberFillValue !== null && config.tsCFinputNumberFillValue !== undefined && config.tsCFinputNumberFillValue !== '') {
        code += `
${outputName} = ${outputName}.fillna(${config.tsCFinputNumberFillValue})\n`;
      }

      return code;
    } else {
      const aggfunc = `"${config.tsCFselectAggFunc}"`;
      const fillValue = config.tsCFinputNumberFillValue !== null && config.tsCFinputNumberFillValue !== undefined && config.tsCFinputNumberFillValue !== '' ? config.tsCFinputNumberFillValue : 0;
      const dropna = config.tsCFbooleanDropNa ? 'True' : 'False';

      let code = `
${outputName} = ${inputName}.pivot_table(
    index=${indexColumns},
    columns=${columnsToPivot},
    values=${values},
    aggfunc=${aggfunc},
    fill_value=${fillValue},
    dropna=${dropna}
).reset_index()\n`;

      return code;
    }
  }
}
