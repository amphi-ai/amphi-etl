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
          aiPromptExamples: ["Apply lowercase to all column names.", "Add a new column 'total' as the sum of 'price' and 'tax'."],
          advanced: true,
        },
      ],
    };

    const description = "Use custom Python code to apply Pandas operations on the input DataFrame, transforming it to produce the desired output DataFrame. You can also use this component as either an input or an output.";

    super("Python Transforms", "customTransformations", description, "pandas_df_processor", [], "transforms", codeIcon, defaultConfig, form);
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
