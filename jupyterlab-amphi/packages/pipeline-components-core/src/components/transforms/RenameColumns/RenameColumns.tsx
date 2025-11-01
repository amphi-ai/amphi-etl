import { renameIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
//real components behind it
import { ManualRenameColumns } from './ManualRenameColumns';
import { DynamicRenameColumns } from './DynamicRenameColumns';



export class RenameColumns extends BaseCoreComponent {
  constructor() {
	//default active component  
    const defaultConfig = { mode: "manual"};
	
    const manual = new ManualRenameColumns();
    const dynamic = new DynamicRenameColumns();

    const getFields = (comp: BaseCoreComponent): any[] => {
      const form = (comp as any)._form as any;
      return Array.isArray(form?.fields) ? form.fields : [];
    };

    const wrapFields = (fields: any[], mode: 'manual' | 'dynamic') =>
      fields.map(f => ({ ...f, condition: { mode: [mode], ...(f.condition || {}) } }));

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Rename type',
          id: 'mode',
          options: [
            { value: 'manual', label: 'Manual' },
            { value: 'dynamic', label: 'Dynamic' }
          ],
          advanced: true
        },
        ...wrapFields(getFields(manual), 'manual'),
        ...wrapFields(getFields(dynamic), 'dynamic')
      ]
    };

    const description =
      'Use Rename Columns to rename one or more columns, manually or dynamically.';

super("Rename Columns", "rename", description, "pandas_df_processor", [], "transforms", renameIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const mode = config.mode;
    const imports =
      mode === 'dynamic'
        ? new DynamicRenameColumns().provideImports({ config })
        : new ManualRenameColumns().provideImports({ config });

    const seen = new Set<string>();
    return imports.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public provideFunctions({ config }): string[] {
    if (config.mode === 'dynamic' && typeof (DynamicRenameColumns as any).prototype.provideFunctions === 'function') {
      return new DynamicRenameColumns().provideFunctions({ config });
    }
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    return config.mode === 'dynamic'
      ? new DynamicRenameColumns().generateComponentCode({ config, inputName, outputName })
      : new ManualRenameColumns().generateComponentCode({ config, inputName, outputName });
  }
}