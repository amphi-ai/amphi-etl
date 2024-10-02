import { bracesIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Expressions extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {};

    super("Expressions", "expressions", "no desc", "pandas_df_processor", [], "transforms", bracesIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import os"];
  }

  public generateComponentCode({ config }): string {

    let code = ``;

    config.variables.forEach(variable => {
      // Initialize all environment variables to an empty string or the default value if provided
      if (variable.value) {
        code += `os.environ["${variable.name}"] = "${variable.value}"\n`;
      }
    });

    code += "\n";

    return code;
  }



}