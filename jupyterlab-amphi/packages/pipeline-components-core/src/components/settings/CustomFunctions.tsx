import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class CustomFunctions extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      code: `def example_function(param1, param2):
      """
      Description: This function serves as a generic template for performing a basic operation.
      
      Parameters:
      param1 (Type): Description of param1.
      param2 (Type): Description of param2.
      
      Returns:
      result (Type): Description of the return value.
      """
      
      # Your code here
      result = param1 + param2  # Example operation
      
      return result`
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "textarea",
          label: "Code",
          id: "code",
          placeholder: "",
        },
        {
          type: "textarea",
          label: "Imports",
          id: "imports",
          placeholder: "import library",
          advanced: true
        }
      ],
    };

    super("Custom Functions", "customFunctions", "no desc", "python_standalone", [], "other", codeIcon, defaultConfig, form);
  }

  public provideImports(config): string[] {
    return config.imports ? config.imports.split('\n').filter(line => line.startsWith('import ')) : [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let code = config.code.replace(/input/g, inputName);
    code = code.replace(/output/g, outputName);
    return code;
  }
}