import { sortIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Sort extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFkeyvalueColumnsRadioColumnAndOrder: [],
        tsCFbooleanIgnoreIndex : false		
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "keyvalueColumnsRadio",
          label: "Columns Sorting Order",
          id: "tsCFkeyvalueColumnsRadioColumnAndOrder",
          options: [
            { value: "True", label: "Asc." },
            { value: "False", label: "Desc." }
          ],
        },
        {
          type: "boolean",
          label: "Ignore Index",
          id: "tsCFbooleanIgnoreIndex",
          advanced: true
        }
      ],
    };
    const description = "Use Sort Rows to sort based on the values in columns. Values will be sorted by lexicographical order.";

    super("Sort Rows", "sort", description, "pandas_df_processor", [], "transforms", sortIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const tsConstByColumns = `by=[${config.tsCFkeyvalueColumnsRadioColumnAndOrder.map(item => item.key.named ? `"${item.key.value}"` : item.key.value).join(", ")}]`;
    const tsConstAscending = `ascending=[${config.tsCFkeyvalueColumnsRadioColumnAndOrder.map(item => item.value === "True" ? "True" : "False").join(", ")}]`;
		//for boolean
	let tsConstIgnoreIndexStep1 = config.tsCFbooleanIgnoreIndex ? 'True' : 'False';
    const tsConstIgnoreIndex = config.tsCFbooleanIgnoreIndex ? `, ignore_index=${tsConstIgnoreIndexStep1}` : "";
    
    const code = `
# Sort rows 
${outputName} = ${inputName}.sort_values(${tsConstByColumns}, ${tsConstAscending}${tsConstIgnoreIndex})
`;
    return code;
  }
}
