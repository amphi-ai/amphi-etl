
import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class XmlFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name",
          validation: "\\.xml$",
          validationMessage: "This field expects a file with an xml extension such as output.xml."
        },
        {
          type: "boolean",
          label: "Create folders if don't exist",
          id: "createFoldersIfNotExist",
          advanced: true
        }
      ],
    };

    super("XML File Output", "xmlFileOutput", "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('lxml');
    return deps;
  }

  public provideImports({ config }): string[] {
    // Adjust this based on the XML library you choose to use for output
    let imports = ["import xml.etree.ElementTree as ET", "import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports; // Adjust if pandas isn't required
  }

  public generateComponentCode({ config, inputName }): string {
    // Create unique variable names based on the inputName for the XML output
    const xmlOutputVar = `${inputName}_xml_output`;
    const fileVar = `${inputName}_file`;

    const createFoldersCode = config.createFoldersIfNotExist ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n` : '';

    const code = `
# Export to XML file
${createFoldersCode}${xmlOutputVar} = ${inputName}.to_xml()
with open("${config.filePath}", "w") as ${fileVar}:
    ${fileVar}.write(${xmlOutputVar})
`;
    return code;
  }
}
