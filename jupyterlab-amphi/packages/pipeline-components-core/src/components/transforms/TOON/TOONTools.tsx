import { toonToolsIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
//real components behind it
import { JSONToTOON } from './JSONToTOON';
//import { ValidateTOON } from './ValidateTOON';
export class TOONTools extends BaseCoreComponent {
  constructor() {
	//default active component  
    const defaultConfig = {
		tsCFradioToolType: "JSONToTOON",
      tsCFcolumnsJSONColumnName: [],
      tsCFinputNewTOONColumnName: "toon_column"
		};
	
    const jsonToTOONComponent = new JSONToTOON();
    //const validateTOONComponent = new ValidateTOON();

    const jsonToTOONFields = jsonToTOONComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["JSONToTOON"], ...(field.condition || {}) }
    }));

	// const validateTOONFields = validateTOONComponent._form['fields'].map(field => ({
      // ...field,
      // condition: { tsCFradioToolType: ["ValidateTOON"], ...(field.condition || {}) }
    // }));

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Rename type',
          id: 'tsCFradioToolType',
          options: [
            { value: 'JSONToTOON', label: 'JSON To TOON' }//,
            // { value: 'ValidateTOON', label: 'Validate TOON' }
          ],
          advanced: false
        },
        ...jsonToTOONFields//,
        // ...validateTOONFields
      ]
    };

    const description = 'Transform a JSON to TOON';

super("TOON Tools", "TOONTools", description, "pandas_df_processor", [], "transforms", toonToolsIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const tool = config.tsCFradioToolType;
    const importsSets: string[] = [];
	if (tool === "JSONToTOON") {
      const jsonToTOON = new JSONToTOON();
      importsSets.push(...jsonToTOON.provideImports({ config }));
    }  //else if (tool === "ValidateTOON") {
      // const validateTOON = new ValidateTOON();
      // importsSets.push(...validateTOON.provideImports({ config }));	  
	// }

    const seen = new Set<string>();
    return importsSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public provideDependencies({ config }): string[] {
    const tool = config.tsCFradioToolType;
	const dependenciesSets: string[] = [];
    let deps: string[] = [];
	if (tool === "JSONToTOON") {
      const jsonToTOON = new JSONToTOON();
      dependenciesSets.push(...jsonToTOON.provideDependencies({ config }));
    // } else if (tool === "AddTOONStyle") {
      // const addTOONStyle = new AddTOONStyle();
      // dependenciesSets.push(...addTOONStyle.provideDependencies({ config }));
    } //else if (tool === "ValidateTOON") {
      // const validateTOON = new ValidateTOON();
      // dependenciesSets.push(...validateTOON.provideDependencies({ config }));	  
	// } 
	
    const seen = new Set<string>();
    return dependenciesSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }
  

  public provideFunctions({ config }): string[] {
    const tool = config.tsCFradioToolType;
	const functionSets: string[] = [];
    let deps: string[] = [];
	if (tool === "JSONToTOON") {
      const jsonToTOON = new JSONToTOON();
      functionSets.push(...jsonToTOON.provideFunctions({ config }));
    } //else if (tool === "ValidateTOON") {
      // const validateTOON = new ValidateTOON();
      // functionSets.push(...validateTOON.provideFunctions({ config }));
	// } 
	
    const seen = new Set<string>();
    return functionSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));

  }

  public generateComponentCode({ config, inputName, outputName }): string {
	const tool = config.tsCFradioToolType;
    if (tool === "JSONToTOON") {
      const jsonToTOON = new JSONToTOON();
      return jsonToTOON.generateComponentCode({ config, inputName, outputName });
    } ///else if (tool === "ValidateTOON") {
      // const validateTOON = new ValidateTOON();
      // return validateTOON.generateComponentCode({ config, inputName, outputName });  
	// } 
}
}