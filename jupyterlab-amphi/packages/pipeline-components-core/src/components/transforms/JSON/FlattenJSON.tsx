import { expandIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';


export class FlattenJSON extends BaseCoreComponent {
  constructor() {
    const defaultConfig =
        {
         tsCFbooleanKeepColumns: true,
		 tsCFbooleanAllLevels: true,
         tsCFselectCustomizableLevelSeparator	: "."	
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column",
          id: "tsCFcolumnColumnToFlatten",
          placeholder: "Select column",
        },
        {
          type: "boolean",
          label: "Keep all columns",
          id: "tsCFbooleanKeepColumns",
          advanced: true
        },
		{
          type: "selectCustomizable",
          label: "Level Separator",
          id: "tsCFselectCustomizableLevelSeparator",
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
          id: "tsCFbooleanAllLevels",
          advanced: true
        },
		{
          type: "inputNumber",
          tooltip: "Max Level to flatten",
          label: "Level (index 0)",
          id: "tsCFinputNumberMaxLevel",
          min: 0,
		  condition: { tsCFbooleanAllLevels: [false] },
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
    const columnName = config.tsCFcolumnColumnToFlatten.value;
    const columnIsNamed = config.tsCFcolumnColumnToFlatten.named;
    const const_ts_boolean_keepAll = config.tsCFbooleanKeepColumns;
	const const_ts_boolean_alllevels = config.tsCFbooleanAllLevels;
	const const_ts_inputnumber_maxlevel = config.tsCFbooleanAllLevels ? "None" : config.tsCFinputNumberMaxLevel;
	const const_ts_levelseparator=config.tsCFselectCustomizableLevelSeparator;
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
