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
        }
      ],
    };

    super("For (Loop)", "forLoop", "orchestrator", [], "Orchestration", codeIcon, defaultConfig, form);
  }

  public provideImports(config): string[] {
    let imports: string[] = [];
    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let code = ''
    return code;
  }
}