import { joinIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { Join } from './BasicJoin';
import { AdvancedJoin } from './AdvancedJoin';

export class CombinedJoin extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { mode: 'basic', selectJoinType: 'left', selectActionIfCartesianProduct: '0', selectSameNameStrategy: "suffix_right" };

    const basic = new Join();
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
      joinIcon,
      defaultConfig,
      form
    );
  }

  public provideDependencies({ config }): string[] {
    // Only AdvancedJoin exposes deps; basic mode returns none
    if (config?.mode === "advanced") {
      return new AdvancedJoin().provideDependencies?.({ config }) ?? [];
    }
    return [];
  }

  public provideImports({ config }): string[] {
    const mode = config.mode;
    const imports =
      mode === 'advanced'
        ? new AdvancedJoin().provideImports({ config })
        : new Join().provideImports({ config });

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
      : new Join().generateComponentCode({ config, inputName1, inputName2, outputName });
  }
}
