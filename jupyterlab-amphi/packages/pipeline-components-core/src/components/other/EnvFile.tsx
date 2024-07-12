import { bracesIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class EnvFile extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { filePath: ".env" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "Import an environment file and use the environment variable in components by typing {.",
        },
        {
          type: "file",
          label: "Environment File",
          id: "filePath",
          placeholder: ".env"
        }
      ],
    };

    super("Env. File", "envFile", "env_file", [], "other", bracesIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["from python-dotenv import load_dotenv"];
  }

  public generateComponentCode({config}): string {

    let code = `
# Load environment variables from ${config.filePath}
load_dotenv(dotenv_path="${config.filePath}")
`;

    code += "\n";
    
    return code;
}



}