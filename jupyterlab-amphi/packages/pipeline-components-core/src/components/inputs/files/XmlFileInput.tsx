
import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class XmlFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env",  xmlOptions: { xpath: '', parser: 'lxml' } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "File Location",
          id: "fileLocation",
          options: [
            { value: "local", label: "Local" },
            { value: "http", label: "HTTP" },
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
          validationMessage: "This field expects a file with an xml extension such as input.xml."
        },
        {
          type: "text",
          label: "XPath Expression",
          id: "xmlOptions.xpath",
          placeholder: "/root/child"
        },
        {
          type: "select",
          label: "Parser",
          id: "xmlOptions.parser",
          placeholder: "Select Parser",
          options: [
            { value: 'lxml', label: 'lxml' },
            { value: 'etree', label: 'etree' },
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "xmlOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };
    const description = "Use XML File Input to access data from a XML file locally or remotely (via HTTP or S3)."

    super("XML File Input", "xmlFileInput", description, "pandas_df_input", ["xml"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    switch (config.parser) {
      case 'lxml':
        deps.push('lxml');
        break;
      default:
    }

    return deps;
  }
  public provideImports({config}): string[] {
    return ["import pandas as pd"]; // Adjust import based on XML parsing library
  }

  public generateComponentCode({config, outputName}): string {

    let xmlOptions = { ...config.xmlOptions };

    // Initialize storage_options if not already present
    let storageOptions = xmlOptions.storage_options || {};

    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    // Only add storage_options to csvOptions if it's not empty
    if (Object.keys(storageOptions).length > 0) {
      xmlOptions.storage_options = storageOptions;
    }

    let optionsString = Object.entries(xmlOptions || {})
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (key === 'storage_options') {
          return `${key}=${JSON.stringify(value)}`; 
        } else {
          return `${key}="${value}"`; // Handle numbers and Python's None without quotes
        }
      })      
      .join(', ');

      const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

    const code = `
${outputName} = pd.read_xml("${config.filePath}"${optionsCode}).convert_dtypes()
`;
    return code;
  }
}
