import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class CustomInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { code: "output = pd.DataFrame({'A': [1, 2, 3]})" };
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
          label: "Code",
          tooltip: "Use the dataframe 'output' as output. For example, output = pd.DataFrame({'A': [1, 2, 3]})",
          id: "code",
          mode: "python",
          height: '300px',
          placeholder: "output = pd.DataFrame({'A': [1, 2, 3]})",
          aiInstructions: "Generate a Pandas script that creates or loads data into a DataFrame named 'output'. IMPORTANT: Ensure the code does not print or display anything. Include short comments for clarity.",
          aiGeneration: true,
          aiDataSample: false,
          aiPromptExamples: [
            { label: "Create input with dummy data", value: "Create a simple input with columns A,B,C and fill them with dummy data." },
            { label: "Load CSV file", value: "Load a CSV file located at /path/myfile.csv" }
          ],
          advanced: true,
        },
        {
          type: "selectMultipleCustomizable",
          label: "Install Libraries",
          id: "librariesToInstall",
          tooltip: "Amphi can use libraries installed in the same Python environment natively. If a library is not installed already, select or provide the library name.",
          placeholder: "Select or add libs",
          options: [
            { value: "scikit-learn", label: "scikit-learn" },
            { value: "scipy", label: "scipy" },
            { value: "Faker", label: "Faker" },
            { value: "statsmodels", label: "statsmodels" },
            { value: "pyjanitor", label: "pyjanitor" }
          ],
          advanced: true
        }
      ],
    };

    const description = "Use custom Python code to create or load a DataFrame into 'output'.";

    super("Python Input", "customInput", description, "pandas_df_input", [], "inputs", codeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    const imports: string[] = [];
    // Always include 'import pandas as pd'
    imports.push("import pandas as pd");

    // Backward compatibility: if config.imports exists, parse it too
    if (config.imports) {
      const importLinesFromImports = config.imports
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('import ') || line.startsWith('from '));
      imports.push(...importLinesFromImports);
    }

    // Extract any import lines from the user's code
    if (config.code) {
      const importLinesFromCode = config.code
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('import ') || line.startsWith('from '));
      imports.push(...importLinesFromCode);
    }

    return imports;
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    if (Array.isArray(config.librariesToInstall)) {
      deps.push(...config.librariesToInstall);
    }
    return deps;
  }

  public generateComponentCode({ config, outputName }): string {
    // Remove import lines from user code
    let userCode = (config.code || '')
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !(trimmed.startsWith('import ') || trimmed.startsWith('from '));
      })
      .join('\n');

    // Replace 'output' with the provided outputName
    userCode = userCode.replace(/output/g, outputName);

    return `\n${userCode}`;
  }
}
