import { markdownToolsIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
//real components behind it
import { TableToMarkdown } from './TableToMarkdown';

export class MarkdownTools extends BaseCoreComponent {
  constructor() {
	//default active component  
    const defaultConfig = {
		tsCFradioToolType: "TableToMarkdown",
		tsCFcolumnsGroupColumns: [],
        tsCFcolumnsMarkdownColumns: [],
        tsCFinputTargetMarkdownColumnName : "markdown_table"
		};
	
    const TableToMarkdownComponent = new TableToMarkdown();

    const TableToMarkdownFields = TableToMarkdownComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["TableToMarkdown"], ...(field.condition || {}) }
    }));

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Rename type',
          id: 'tsCFradioToolType',
          options: [
            { value: 'TableToMarkdown', label: 'Table To Markdown' }
          ],
          advanced: true
        },
        ...TableToMarkdownFields,
      ]
    };

    const description = 'Transform a table to Markdown or anything related to Markdown';

super("Markdown Tools", "MarkdownTools", description, "pandas_df_processor", [], "transforms", markdownToolsIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const tool = config.tsCFradioToolType;
    const importsSets: string[] = [];
	if (tool === "TableToMarkdown") {
      const tableToMD = new TableToMarkdown();
      importsSets.push(...tableToMD.provideImports({ config }));
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
    } 
    const seen = new Set<string>();
    return dependenciesSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }
  

  public provideFunctions({ config }): string[] {
    if (config.tsCFradioToolType === 'TableToMarkdown' && typeof (TableToMarkdown as any).prototype.provideFunctions === 'function') {
      return new TableToMarkdown().provideFunctions({ config });
    }
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
	const tool = config.tsCFradioToolType;
    if (tool === "TableToMarkdown") {
      const tableToMD = new TableToMarkdown();
      return tableToMD.generateComponentCode({ config, inputName, outputName });
    }
}
}