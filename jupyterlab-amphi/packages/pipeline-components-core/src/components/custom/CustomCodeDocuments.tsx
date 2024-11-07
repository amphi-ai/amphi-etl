import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class CustomCodeDocuments extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { code: "output = input" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "Write Python code (LangChain) with 'input' as input document and 'output' as output document.",
        },
        {
          type: "codeTextarea",
          label: "Imports",
          id: "import",
          placeholder: "import langchain ...",
          height: '50px',
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "Code",
          id: "code",
          mode: "python",
          height: '300px',
          placeholder: "output = input",
          advanced: true
        }
      ],
    };

    super("Custom Code", "customCodeDocuments", "no desc", "documents_processor", [], "transforms.documents", codeIcon, defaultConfig, form);
  }

  public provideImports(config): string[] {
    let imports: string[] = [];

    // Check if config.imports exists and is a string
    if (config.imports && typeof config.imports === 'string') {
      // Split config.imports by lines, filter lines starting with 'import ' or 'from ' (allowing for leading whitespace)
      const importLines = config.imports.split('\n').filter(line => line.trim().startsWith('import') || line.trim().startsWith('from'));

      // Push each filtered import line to the imports array
      imports.push(...importLines);
    }

    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let code = `\n${config.code}`.replace(/input/g, inputName);
    code = code.replace(/output/g, outputName);
    return code;
  }
}