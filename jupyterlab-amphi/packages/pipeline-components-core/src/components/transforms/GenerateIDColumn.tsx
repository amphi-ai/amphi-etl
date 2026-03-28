import { numberIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class GenerateIDColumn extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFselectCustomizableColumnType: 'int64',
      tsCFradioInsertPosition: 'first',
      tsCFinputNumberStartingValue: 1,
      tsCFinputRowIdName: 'ID'
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "inputNumber",
          label: "Starting Value",
          id: "tsCFinputNumberStartingValue",
          placeholder: "0",
          min: 0
        },
        {
          type: "radio",
          label: "Insert Position",
          id: "tsCFradioInsertPosition",
          options: [
            { value: "first", label: "First" },
            { value: "last", label: "Last" }
          ]
        },
        {
          type: "input",
          label: "Name",
          id: "tsCFinputRowIdName",
          placeholder: "default ID",
          tooltip: "you may want to change that if you want a special name or no upper case, or id is already taken",
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "Column Type",
          id: "tsCFselectCustomizableColumnType",
          options: [
            { value: "int64", label: "int64", tooltip: "Integer (int64)" },
            { value: "float64", label: "float64", tooltip: "Float (float64)" }
          ],
          advanced: true
        }
      ],
    };
    const description = "Use Row ID to assign a unique identifier to each row in a dataset.";

    super("Row ID", "generate_id_column", description, "pandas_df_processor", [], "transforms", numberIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const prefix = config?.backend?.prefix ?? "pd";
    const tsConstStartingValue = config.tsCFinputNumberStartingValue || 1;
    const tsConstColumnType = config.tsCFselectCustomizableColumnType || "int64";
    const tsConstInsertPosition = config.tsCFradioInsertPosition || "last";
    //if null, undefined or empty
    const tsConstRowIdName =
      config.tsCFinputRowIdName && config.tsCFinputRowIdName.length > 0
        ? config.tsCFinputRowIdName
        : "ID";
    const tsConstIdColumn = `range(${tsConstStartingValue}, ${tsConstStartingValue} + len(${inputName}))`;
    const tsConstIdColumnFirst = `['${tsConstRowIdName}'] + ${inputName}.columns.tolist()`;
    const tsConstIdColumnLast = `${inputName}.columns.tolist() + ['${tsConstRowIdName}']`;

    const code = `
# Generate ID column
#copy the df
${outputName} = ${inputName}.copy()
#insert the new column with its type
${outputName}['${tsConstRowIdName}'] = ${prefix}.Series(${tsConstIdColumn}, dtype='${tsConstColumnType}')
#deal with the position
${outputName} = ${outputName}.reindex(columns=${tsConstInsertPosition === "first" ? tsConstIdColumnFirst : tsConstIdColumnLast})
`;

    return code;
  }
}