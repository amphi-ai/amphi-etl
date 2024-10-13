import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class ForLoop extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { code: "output = input" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "For Loop / Todo.",
        },
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter Trino host",
          connection: 'Trino',
          advanced: true
        },
      ],
    };

    super("For Loop", "forLoop", "no desc", "orchestrator_to_data", [], "Orchestration", codeIcon, defaultConfig, form);
  }

  public provideImports(config): string[] {
    let imports: string[] = [];
    return imports;
  }

  public generateComponentCode({ config, dependency }): string {
    let code = ''
    return code;
  }
}