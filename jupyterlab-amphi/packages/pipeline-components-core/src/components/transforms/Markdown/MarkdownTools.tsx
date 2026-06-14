import { markdownToolsIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
//real components behind it
import { TableToMarkdown } from './TableToMarkdown';
import { AddMarkdownStyle } from './AddMarkdownStyle';
import { ValidateMarkdown } from './ValidateMarkdown';
export class MarkdownTools extends BaseCoreComponent {
  constructor() {
	//default active component  
    const defaultConfig = {
		tsCFradioToolType: "TableToMarkdown",
		tsCFcolumnsGroupColumns: [],
        tsCFcolumnsMarkdownColumns: [],
        tsCFinputTargetMarkdownColumnName : "markdown_table",
        tsCFcolumnsColumnsToStyle: [],
        tsCFselectMultipleMarkdownStyles :[],
        tsCFbooleanCreateNewColumn : true,
        tsCFinputPrefixNewMdColumn : "",
        tsCFinputSuffixNewMdColumn : "",
        tsCFcolumnsColumnstoValidateMD: []
		};
	
    const tableToMarkdownComponent = new TableToMarkdown();
    const addMarkdownStyleComponent = new AddMarkdownStyle();
    const validateMarkdownComponent = new ValidateMarkdown();

    const tableToMarkdownFields = tableToMarkdownComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["TableToMarkdown"], ...(field.condition || {}) }
    }));
	
	const addMarkdownStyleFields = addMarkdownStyleComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["AddMarkdownStyle"], ...(field.condition || {}) }
    }));
	
	const validateMarkdownFields = validateMarkdownComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["ValidateMarkdown"], ...(field.condition || {}) }
    }));

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Rename type',
          id: 'tsCFradioToolType',
          options: [
            { value: 'TableToMarkdown', label: 'Table To Markdown' },
            { value: 'AddMarkdownStyle', label: 'Add Markdown Style' },
            { value: 'ValidateMarkdown', label: 'Validate Markdown' }
          ],
          advanced: false
        },
        ...tableToMarkdownFields,
        ...addMarkdownStyleFields,
        ...validateMarkdownFields
      ]
    };

    const description = 'Transform a table to Markdown, add Markdown Style or validate a Markdown';

super("Markdown Tools", "MarkdownTools", description, "pandas_df_processor", [], "transforms", markdownToolsIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const tool = config.tsCFradioToolType;
    const importsSets: string[] = [];
	if (tool === "TableToMarkdown") {
      const tableToMD = new TableToMarkdown();
      importsSets.push(...tableToMD.provideImports({ config }));
    } else if (tool === "AddMarkdownStyle") {
      const addMDStyle = new AddMarkdownStyle();
      importsSets.push(...addMDStyle.provideImports({ config }));
    } else if (tool === "ValidateMarkdown") {
      const validateMD = new ValidateMarkdown();
      importsSets.push(...validateMD.provideImports({ config }));	  
	}

    const seen = new Set<string>();
    return importsSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }



  public provideDependencies({ config }): string[] {
    const tool = config.tsCFradioToolType;
	const dependenciesSets: string[] = [];
    let deps: string[] = [];
	if (tool === "TableToMarkdown") {
      const tableToMD = new TableToMarkdown();
      dependenciesSets.push(...tableToMD.provideDependencies({ config }));
    // } else if (tool === "AddMarkdownStyle") {
      // const addMDStyle = new AddMarkdownStyle();
      // dependenciesSets.push(...addMDStyle.provideDependencies({ config }));
    } else if (tool === "ValidateMarkdown") {
      const validateMD = new ValidateMarkdown();
      dependenciesSets.push(...validateMD.provideDependencies({ config }));	  
	} 
	
    const seen = new Set<string>();
    return dependenciesSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }
  

  public provideFunctions({ config }): string[] {
    const tool = config.tsCFradioToolType;
	const functionSets: string[] = [];
    let deps: string[] = [];
	if (tool === "TableToMarkdown") {
      const tableToMD = new TableToMarkdown();
      functionSets.push(...tableToMD.provideFunctions({ config }));
    } else if (tool === "AddMarkdownStyle") {
      const addMDStyle = new AddMarkdownStyle();
      functionSets.push(...addMDStyle.provideFunctions({ config }));
    } else if (tool === "ValidateMarkdown") {
      const validateMD = new ValidateMarkdown();
      functionSets.push(...validateMD.provideFunctions({ config }));
	} 
	
    const seen = new Set<string>();
    return functionSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));	  

  }

  public generateComponentCode({ config, inputName, outputName }): string {
	const tool = config.tsCFradioToolType;
    if (tool === "TableToMarkdown") {
      const tableToMD = new TableToMarkdown();
      return tableToMD.generateComponentCode({ config, inputName, outputName });
    } else if (tool === "AddMarkdownStyle") {
      const addMDStyle = new AddMarkdownStyle();
      return addMDStyle.generateComponentCode({ config, inputName, outputName });
    } else if (tool === "ValidateMarkdown") {
      const validateMD = new ValidateMarkdown();
      return validateMD.generateComponentCode({ config, inputName, outputName });  
	} 
}
}