import { expandIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';


export class FlattenJSON extends BaseCoreComponent {
  constructor() {
    const defaultConfig =
        {
         boolean_keepColumns: true,
		 boolean_alllevels: true,
         selectCustomizable_levelseparator	: "."	
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column",
          id: "column",
          placeholder: "Select column",
        },
        {
          type: "boolean",
          label: "Keep all columns",
          id: "boolean_keepColumns",
          advanced: true
        },
		{
          type: "selectCustomizable",
          label: "Level Separator",
          id: "selectCustomizable_levelseparator",
          placeholder: "default: .",
          tooltip: "Select or provide a custom delimiter between levels.",
          options: [
            { value: ".", label: "point (.)" },
            { value: "/", label: "slash (/)" },
            { value: " ", label: "space" },
            { value: "_", label: "underscore(_)" }
          ],
          advanced: true
        },
		{
          type: "boolean",
          label: "Flatten all levels",
          id: "boolean_alllevels",
          advanced: true
        },
		{
          type: "inputNumber",
          tooltip: "Max Level to flatten",
          label: "Level (index 0)",
          id: "inputnumber_maxlevel",
          min: 0,
		  condition: { boolean_alllevels: [false] },
          advanced: true
        },
      ]
    };
    const description = "Flatten JSON data in a specified column for easier export to CSV.";

    super("Flatten JSON", "flattenJSON", description, "pandas_df_processor", [], "transforms.JSON", expandIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from pandas import json_normalize"
    ];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const columnName = config.column.value;
    const columnIsNamed = config.column.named;
    const const_ts_boolean_keepAll = config.boolean_keepColumns;
	const const_ts_boolean_alllevels = config.boolean_alllevels;
	const const_ts_inputnumber_maxlevel = config.boolean_alllevels ? "None" : config.inputnumber_maxlevel;
	const const_ts_levelseparator=config.selectCustomizable_levelseparator;
    const columnReference = columnIsNamed ? `'${columnName}'` : columnName;

    let code = `# Flatten JSON in the specified column\n`;
    if (const_ts_boolean_keepAll) {
	code += `${outputName} = ${inputName}.join(pd.json_normalize(${inputName}[${columnReference}],sep='${const_ts_levelseparator}',max_level=${const_ts_inputnumber_maxlevel}))\n`;
    } else {
      code += `${outputName} = pd.json_normalize(${inputName}[${columnReference}],sep='${const_ts_levelseparator}',max_level=${const_ts_inputnumber_maxlevel})\n`;
    }
    return code;
  }
}
