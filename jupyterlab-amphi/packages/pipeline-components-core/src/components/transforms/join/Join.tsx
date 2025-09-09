import { mergeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { BasicJoin } from './BasicJoin';
import { AdvancedJoin } from './AdvancedJoin';

export class Join extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { mode: 'basic', select_join_type: 'left', select_action_if_cartesian_product: '0', select_same_name_strategy : "suffix_right" };

    const basic = new BasicJoin();
    const advanced = new AdvancedJoin();

    const getFields = (comp: BaseCoreComponent): any[] => {
      const form = (comp as any)._form as any;
      return Array.isArray(form?.fields) ? form.fields : [];
    };

    const wrapFields = (fields: any[], mode: 'basic' | 'advanced') =>
      fields.map(f => ({ ...f, condition: { mode: [mode], ...(f.condition || {}) } }));

    const form = {
      idPrefix: 'component__form',
      fields: [
        {
          type: 'radio',
          label: 'Type',
          id: 'mode',
          options: [
            { value: 'basic', label: 'Basic' },
            { value: 'advanced', label: 'Advanced' }
          ],
          advanced: true
        },
        ...wrapFields(getFields(basic), 'basic'),
        ...wrapFields(getFields(advanced), 'advanced')
      ]
    };

    const description =
      'Join Datasets with a single component. Pick Basic or Advanced via radio.';

    super(
      'Join Datasets',
      'join',
      description,
      'pandas_df_double_processor',
      [],
      'transforms',
      mergeIcon,
      defaultConfig,
      form
    );
  }

  public provideDependencies({ config }): string[] {
    // Delegate if Advanced ever exposes deps
    return [];
  }

  public provideImports({ config }): string[] {
    const mode = config.mode;
    const imports =
      mode === 'advanced'
        ? new AdvancedJoin().provideImports({ config })
        : new BasicJoin().provideImports({ config });

    const seen = new Set<string>();
    return imports.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public provideFunctions({ config }): string[] {
    if (config.mode === 'advanced' && typeof (AdvancedJoin as any).prototype.provideFunctions === 'function') {
      return new AdvancedJoin().provideFunctions({ config });
    }
    return [];
  }

  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {
    return config.mode === 'advanced'
      ? new AdvancedJoin().generateComponentCode({ config, inputName1, inputName2, outputName })
      : new BasicJoin().generateComponentCode({ config, inputName1, inputName2, outputName });
  }
}
