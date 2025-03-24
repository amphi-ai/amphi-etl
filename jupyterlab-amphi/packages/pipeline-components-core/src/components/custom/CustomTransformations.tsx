import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class CustomTransformations extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { code: "output = input" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "Write Python code with 'input' being the input dataframe, and 'output' the output dataframe.",
        },
        {
          type: "codeTextarea",
          label: "Code",
          tooltip: "Use the dataframe 'input' as input and 'output' as output. For example, output = input returns the same data.",
          id: "code",
          mode: "python",
          height: '300px',
          placeholder: "output = input",
          aiInstructions: "Generate a Pandas script that processes an input DataFrame named 'input' and outputs a DataFrame named 'output'.\nIMPORTANT: Ensure the code does not print or display anything. Include short comments for clarity. The data sample is provided for generating accurate code based on the user instructions.",
          aiGeneration: true,
          aiPromptExamples: [
            { label: "Lowercase column names", value: "Modify all column names to lower case." },
            { label: "Add 'total' column", value: "Add a new column 'total' as the sum of 'price' and 'tax'." },
            { label: "Extract date parts", value: "Extract year, month, and day from the order_date column." }
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

    const description = "Use custom Python code to apply Pandas operations on the input DataFrame, transforming it to produce the desired output DataFrame. You can also use this component as either an input or an output.";

    super("Python Transforms", "customTransformations", description, "pandas_df_processor", [], "transforms", codeIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    if (Array.isArray(config.librariesToInstall)) {
      deps.push(...config.librariesToInstall);
    }
    return deps;
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

    // Now parse any import lines in config.code
    if (config.code) {
      const importLinesFromCode = config.code
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('import ') || line.startsWith('from '));
      imports.push(...importLinesFromCode);
    }

    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // We only remove import lines from config.code, as config.imports is backward-compat
    let userCode = (config.code || '')
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !(trimmed.startsWith('import ') || trimmed.startsWith('from '));
      })
      .join('\n');

    // Replace 'input' and 'output' with provided names
    userCode = userCode
      .replace(/input/g, inputName)
      .replace(/output/g, outputName);

    return `\n${userCode}`;
  }
}
