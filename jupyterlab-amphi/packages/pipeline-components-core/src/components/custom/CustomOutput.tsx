import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

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
          label: "Code",
          tooltip: "Use the dataframe 'input' as input. For example, input.to_csv('output.csv', index=False).",
          id: "code",
          mode: "python",
          height: '300px',
          placeholder: "input.to_csv('output.csv', index=False)",
          aiInstructions: "Generate a Pandas script that consumes the DataFrame named 'input' and outputs a DataFrame named 'output'. IMPORTANT: The code must not print or display anything. Include short comments for clarity. The data sample is provided for generating accurate code based on user instructions.",
          aiGeneration: true,
          aiPromptExamples: [
            { label: "Write to Excel file", value: "Write data to an Excel file, the header should be in red color and can be sorted" },
            { label: "Send data to API", value: "Write code to send my data as JSON object to a dummy API" },
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
            { value: "statsmodels", label: "statsmodels" },
            { value: "pyjanitor", label: "pyjanitor" }
          ],
          advanced: true
        }
      ],
    };

    const description = "Use custom Python code to process or consume the input DataFrame named 'input'.";

    super("Python Output", "customOutput", description, "pandas_df_output", [], "outputs", codeIcon, defaultConfig, form);
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

  public generateComponentCode({ config, inputName }): string {
    // Remove import lines from user code
    let userCode = (config.code || '')
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !(trimmed.startsWith('import ') || trimmed.startsWith('from '));
      })
      .join('\n');

    // Replace 'input' with provided inputName
    userCode = userCode.replace(/input/g, inputName);

    return `\n${userCode}`;
  }
}
