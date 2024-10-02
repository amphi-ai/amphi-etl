import { filterIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class FileLogger extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { filePath: "pipeline.log", logLevel: "INFO", logMessage: "An error occurred in the script:\n\n{error_message}" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "Log File Path",
          id: "filePath",
          placeholder: "pipeline.log"
        },
        {
          type: "select",
          label: "Log Level",
          id: "logLevel",
          placeholder: "default: ,",
          options: [
            { value: "DEBUG", label: "DEBUG" },
            { value: "INFO", label: "INFO" },
            { value: "WARNING", label: "WARNING" },
            { value: "ERROR", label: "ERROR" },
            { value: "CRITICAL", label: "CRITICAL" }
          ],
          advanced: true
        },
        {
          type: "textarea",
          label: "Log Message",
          id: "logMessage",
          placeholder: "An error occurred in the script:\n\n{error_message}",
          advanced: true
        },
      ],
    };

    super("File Logger", "fileLogger", "no desc", "logger", [], "settings", filterIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["import logging"];
  }

  public provideFunctions({config}): string[] {
    let functions = [];
    const code = `
logger = logging.getLogger('PipelineLogger')
logging.basicConfig(filename="${config.filePath}", level=logging.${config.logLevel}, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
`;
    functions.push(code);
    return functions;
  }

  public generateComponentCode({config}): string {
    const code = `
logger.info(str(e))
`;
    return code;
  }

}
