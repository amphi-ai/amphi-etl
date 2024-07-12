
import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class XmlFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { xmlOptions: { xpath: '' } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name",
          validation: "\\.xml$",
          validationMessage: "This field expects a file with an xml extension such as input.xml."
        },
        {
          type: "text",
          label: "XPath Expression",
          id: "xmlOptions.xpath",
          placeholder: "/root/child"
        }
      ],
    };

    super("XML File Input", "xmlFileInput", "pandas_df_input", ["xml"], "input", fileTextIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["import xml.etree.ElementTree as ET"]; // Adjust import based on XML parsing library
  }

  public generateComponentCode({config, outputName}): string {
    // Ensure unique variable names based on the outputName for tree and root
    const treeVar = `${outputName}_tree`;
    const rootVar = `${outputName}_root`;

    let xpathOption = config.xmlOptions.xpath ? `"${config.xmlOptions.xpath}"` : "'.'"; // Use the provided XPath or default to root

    const code = `
${treeVar} = ET.parse("${config.filePath}")
${rootVar} = ${treeVar}.getroot()
${outputName} = ${rootVar}.findall(${xpathOption})
    `;
    return code;
  }
}
