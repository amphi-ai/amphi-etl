import { hashIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class GenerateIDColumn extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { columnType: 'int64', insertPosition: 'first'};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "inputNumber",
          label: "Starting Value",
          id: "startingValue",
          placeholder: "0",
          min: 0
        },
        {
          type: "selectCustomizable",
          label: "Column Type",
          id: "columnType",
          options: [
            { value: "int64", label: "Integer (int64)" },
            { value: "float64", label: "Float (float64)" }
          ],
          advanced: true
        },
        {
          type: "radio",
          label: "Insert Position",
          id: "insertPosition",
          options: [
            { value: "first", label: "First" },
            { value: "last", label: "Last" }
          ]
        }
      ],
    };
    const description = "Use Row ID to assign a unique identifier to each row in a dataset.";

    super("Row ID", "generate_id_column", description, "pandas_df_processor", [], "transforms", hashIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const prefix = config?.backend?.prefix ?? "pd";
    const startingValue = config.startingValue || 0;
    const columnType = config.columnType || "int64";
    const insertPosition = config.insertPosition || "last";

    const idColumn = `range(${startingValue}, ${startingValue} + len(${inputName}))`;
    const idColumnFirst = `['ID'] + ${inputName}.columns.tolist()`;
    const idColumnLast = `${inputName}.columns.tolist() + ['ID']`;

    const code = `
# Generate ID column
${outputName} = ${inputName}.copy()
${outputName}['ID'] = ${prefix}.Series(${idColumn}, dtype='${columnType}')
${outputName} = ${outputName}.reindex(columns=${insertPosition === "first" ? idColumnFirst : idColumnLast})
`;

    return code;
  }
}
