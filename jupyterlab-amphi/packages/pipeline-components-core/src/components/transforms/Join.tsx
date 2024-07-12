import { mergeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Join extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { condition: "==" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "First Input Column",
          id: "leftKeyColumn",
          placeholder: "Column name",
          inputNb: 1
        },
        {
          type: "column",
          label: "Second Input Column",
          id: "rightKeyColumn",
          placeholder: "Column name",
          inputNb: 2
        },
        {
          type: "select",
          label: "Join type",
          id: "how",
          placeholder: "Default: Inner",
          options: [
            { value: "inner", label: "Inner: return only the rows with matching keys in both data frames (intersection)." },
            { value: "left", label: "Left: return all rows from the left data frame and matched rows from the right data frame (including NaN for no match)." },
            { value: "right", label: "Right: return all rows from the right data frame and matched rows from the left data frame (including NaN for no match)." },
            { value: "outer", label: "Outer: return all rows from both data frames, with matches where available and NaN for no match (union)." }
          ],
          advanced: true
        }
      ],
    };

    super("Join Datasets", "join", "pandas_df_double_processor", [], "transform", mergeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {

    // column.value = name, column.type = type, column.name = boolean if column is named or false if numeric index
    const { value: leftKeyColumnValue, type: leftKeyColumnType, named: leftKeyColumnNamed } = config.leftKeyColumn;
    const { value: rightKeyColumnValue, type: rightKeyColumnType, named: rightKeyColumnNamed } = config.rightKeyColumn;

    // Modify to handle non-named (numeric index) columns by removing quotes
    const leftKey = leftKeyColumnNamed ? `"${leftKeyColumnValue}"` : leftKeyColumnValue;
    const rightKey = rightKeyColumnNamed ? `"${rightKeyColumnValue}"` : rightKeyColumnValue;

    const joinType = config.how ? `, how="${config.how}"` : '';
    const code = `
# Join ${inputName1} and ${inputName2}
${outputName} = pd.merge(${inputName1}, ${inputName2}, left_on=${leftKey}, right_on=${rightKey}${joinType})
`;

    return code;
  }



}