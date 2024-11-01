import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class CustomOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { code: "input.to_csv('output.csv', index=False)" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "Write Python code with 'input', the input pandas dataframe of this component.",
        },
        {
          type: "codeTextarea",
          label: "Imports",
          id: "imports",
          placeholder: "import pandas as pd",
          height: '50px',
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "Code",
          tooltip: "Use the dataframe 'input' as input. For example, input.to_csv('myfile.csv').",
          id: "code",
          mode: "python",
          height: '300px',
          placeholder: "input.to_csv('output.csv', index=False)",
          advanced: true
        }
      ],
    };
    const description = "Use custom Python code to apply Pandas operations on the input DataFrame, transforming it to produce the desired output DataFrame. You can also use this component as either an input or an output.";

    super("Python Output", "customOutput", description, "pandas_df_output", [], "outputs", codeIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    let imports: string[] = [];

    // Always add 'import pandas as pd'
    // imports.push("import pandas as pd");

    // Check if config.imports exists and is a string
    if (config.imports) {
      // Split config.imports by lines, filter lines starting with 'import '
      const importLines = config.imports.split('\n').filter(line => line.trim().startsWith('import ') || line.trim().startsWith('from '));

      // Push each filtered import line to the imports array
      imports.push(...importLines);
    }

    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    let code = `\n${config.code}`.replace(/input/g, inputName);
    return code;
  }
}