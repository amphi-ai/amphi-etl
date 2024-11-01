import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class CustomInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { imports: "import pandas as pd", code: "output = pd.DataFrame({'A': [1, 2, 3]})" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "Write Python code with 'output', the output pandas dataframe of this component.",
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
          tooltip: "Use the dataframe 'output' as output. For example, output = read_csv('myfile.csv').",
          id: "code",
          mode: "python",
          height: '300px',
          placeholder: "output = pd.DataFrame({'A': [1, 2, 3]})",
          advanced: true
        }
      ],
    };
    const description = "Use custom Python code to apply Pandas operations on the input DataFrame, transforming it to produce the desired output DataFrame. You can also use this component as either an input or an output.";

    super("Python Input", "customInput", description, "pandas_df_input", [], "inputs", codeIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    let imports: string[] = [];
    
    // Check if config.imports exists and is a string
    if (config.imports && typeof config.imports === 'string') {
      // Split config.imports by lines, filter lines starting with 'import '
      const importLines = config.imports.split('\n').filter((line: string) => line.startsWith('import '));
  
      // Push each filtered import line to the imports array
      imports.push(...importLines);
    }
  
    return imports;
  }
  

  public generateComponentCode({ config, outputName }): string {
    let code = `\n${config.code}`.replace(/output/g, outputName);
    return code;
  }
}