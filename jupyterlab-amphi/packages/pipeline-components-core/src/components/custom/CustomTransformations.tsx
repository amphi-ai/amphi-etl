import { pythonIcon } from '../../icons';
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

    super("Python Transforms", "customTransformations", description, "pandas_df_processor", [], "transforms", pythonIcon, defaultConfig, form);
  }

  private getEffectiveCode(config: any): string {
    const rawValue = config.code;
    if (!rawValue) return "";

    // If the framework already parsed the JSON into an object
    if (typeof rawValue === 'object') return rawValue.code || "";

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object' && 'code' in parsed) {
        return parsed.code;
      }
    } catch (e) {
      // BACKWARD COMPATIBILITY: It's a plain Python string from an older version
      return rawValue;
    }
    return rawValue;
  }

public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    if (Array.isArray(config.librariesToInstall)) {
      deps.push(...config.librariesToInstall);
    }
    return deps;
  }

  public provideImports({ config }): string[] {
    const imports: string[] = ["import pandas as pd"];
    
    // Extract real code to find additional user imports
    const effectiveCode = this.getEffectiveCode(config);

    if (config.imports) {
      const importLinesFromImports = config.imports
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('import ') || line.startsWith('from '));
      imports.push(...importLinesFromImports);
    }

    if (effectiveCode) {
      const importLinesFromCode = effectiveCode
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('import ') || line.startsWith('from '));
      imports.push(...importLinesFromCode);
    }

    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // 1. Unpack the actual Python logic from the config
    const effectiveCode = this.getEffectiveCode(config);

    // 2. Filter out import lines so they can be hoisted to the top of the file
    let userCode = effectiveCode
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !(trimmed.startsWith('import ') || trimmed.startsWith('from '));
      })
      .join('\n');

    // 3. Replace 'input' and 'output' placeholders with actual variable names
    // Using \b for word boundaries prevents replacing things like 'input_data'
    const inputRegex = new RegExp('\\binput\\b', 'g');
    userCode = userCode.replace(inputRegex, inputName);

    const outputRegex = new RegExp('\\boutput\\b', 'g');
    userCode = userCode.replace(outputRegex, outputName);

    return `\n${userCode}`;
  }
}
