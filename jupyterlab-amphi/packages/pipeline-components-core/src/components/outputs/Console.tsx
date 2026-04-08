import { consoleIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Console extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { 
	tsCFselectType: "Data",
	tsCFselectDataFormat: "text",
	tsCFtextareaMessage:""
	};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Type",
          id: "tsCFselectType",
          placeholder: "Select type",
          options: [
            { value: "Info", label: "Info", tooltip: "Display a regular message in console." },
            { value: "Warning", label: "Warning", tooltip: "Display a warning message in the console." },
            { value: "Error", label: "Error", tooltip: "Raise an error and display error message in console." },
            { value: "Data", label: "Data", tooltip: "Display data from input component." },
            // { value: "Markdown", label: "Markdown", tooltip: "Display Markdown in the console. The markdown might not be rendered outside Amphi console." },
            // { value: "HTML", label: "HTML", tooltip: "Display HTML in the console. The markdown might not be rendered outside HTML console." }
          ],
        },
        {
          type: "textarea",
          label: "Message",
          id: "tsCFtextareaMessage",
          placeholder: "Write text message",
          advanced: true,
          condition: { tsCFselectType: ["Info", "Error","Warning"] }
        },
        {
          type: "inputNumber",
          label: "Records limit",
          id: "tsCFinputNumberLimit",
          placeholder: "Number of records to print in console",
          min: 0,
          condition: { tsCFselectType: "Data" },
          advanced: true
        },
        {
          type: "select",
          label: "Data Format",
          id: "tsCFselectDataFormat",
          options: [
            { value: "text", label: "Text", tooltip: "Display data as text in console." },
            { value: "csv", label: "CSV", tooltip: "Display data as a csv in console." }
          ],
          condition: { tsCFselectType: "Data" },
          advanced: true
        },
      ],
    };
    const description = "Use Console Message to display a message (info, warning, error) or data into the Pipeline Console.";

    super("Console Message", "console", description, "pandas_df_output", [], "outputs", consoleIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];

    return deps;
  }

  public provideImports({ config }): string[] {
    const imports = ["import pandas as pd"];

    if (config.tsCFselectType === "Warning") {
      imports.push("import warnings");
    }

    if (config.tsCFselectType === "Markdown" || config.tsCFselectType === "HTML") {
      imports.push("from IPython.display import display, Markdown, HTML");
    }

    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    let code = "";

    switch (config.tsCFselectType) {
      case "Info":
        code += `print("Info: ${config.tsCFtextareaMessage || ''}")\n`;
        break;
      case "Warning":
        code += `warnings.warn("${config.tsCFtextareaMessage || ''}")\n`;
        break;
      case "Error":
        code += `raise Exception("Error: ${config.tsCFtextareaMessage || ''}")\n`;
        break;
      case "Data":
        if (config.tsCFinputNumberLimit) {
          inputName += `.head(${config.tsCFinputNumberLimit})`;
        }
        // Handle different data formats
        switch (config.tsCFselectDataFormat) {
          case "text":
            code += `print(${inputName}.to_string(index=False))\n`;
            break;
          case "csv":
            code += `print(${inputName}.to_csv(index=False))\n`;
            break;
          default:
            code += `print(${inputName}.to_string(index=False))\n`;  // Default to text output if format is not specified
        }
        break;
      case "Markdown":
        code += `display(Markdown("${config.tsCFtextareaMessage || ''}"))\n`;
        break;
      case "HTML":
        code += `display(HTML("${config.tsCFtextareaMessage || ''}"))\n`;
        break;
      default:
        code += `print(${inputName})\n`;
    }

    return code;
  }
}
