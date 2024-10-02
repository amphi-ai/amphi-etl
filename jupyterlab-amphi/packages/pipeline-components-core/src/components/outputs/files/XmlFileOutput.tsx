
import { filePlusIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class XmlFileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "File Location",
          id: "fileLocation",
          options: [
            { value: "local", label: "Local" },
            { value: "s3", label: "S3" }
          ],
          advanced: true
        },
        ...S3OptionsHandler.getAWSFields(),
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
          condition: { fileLocation: ["local"] },
          id: "createFoldersIfNotExist",
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "csvOptions.storage_options",
          condition: { fileLocation: [ "s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use XML File Output to write or append data to a XML file locally or remotely (S3)."

    super("XML File Output", "xmlFileOutput", "no desc", "pandas_df_output", [], "outputs", filePlusIcon, defaultConfig, form);
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
