import { BaseCoreComponent } from '../../BaseCoreComponent'; 
import { fileTextIcon } from '../../../icons';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class JsonFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", jsonOptions: {} };
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
          validation: "\.(json|jsonl)$",
          validationMessage: "This field expects a file with a json extension such as input.json."
        },
        {
          type: "select",
          label: "Orientation",
          id: "jsonOptions.orient",
          placeholder: "default: columns",
          options: [
            { value: 'columns', label: 'Columns - JSON object with column labels as keys' },
            { value: 'records', label: 'Records - List of rows as JSON objects' },
            { value: 'index', label: 'Index - Dict with index labels as keys' },
            { value: 'split', label: 'Split - Dict with "index", "columns", and "data" keys' },
            { value: 'table', label: 'Table - Dict with "schema" and "data" keys, following the Table Schema' }
          ],
        },
        /*
        {
          type: "input",
          label: "JSON Path (Optional)",
          id: "jsonPath",
          placeholder: "Enter JSON path to extract specific data",
          advanced: true
        },
        */
        {
          type: "boolean",
          label: "Infer Data Types",
          id: "jsonOptions.dtype",
          advanced: true
        },
        {
          type: "boolean",
          label: "Line-delimited",
          id: "jsonOptions.lines",
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Storage Options",
          id: "excelOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };

    super("JSON File Input", "jsonFileInput", "pandas_df_input", ["json", "jsonl"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {
    // Assuming the JSON options are nested under a jsonOptions key in the config object

    let jsonOptions = { ...config.jsonOptions };

    // Initialize storage_options if not already present
    let storageOptions = jsonOptions.storage_options || {};

    storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);

    // Only add storage_options to csvOptions if it's not empty
    if (Object.keys(storageOptions).length > 0) {
      jsonOptions.storage_options = storageOptions;
    }

    let optionsString = Object.entries(jsonOptions || {})
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
    // const jsonPathCode = config.jsonPath ? `${outputName} = ${outputName}["${config.jsonPath}"]\n` : '';


    const code = `
${outputName} = pd.read_json("${config.filePath}"${optionsCode}).convert_dtypes()
`;
    return code;
  }
}
