import { BaseCoreComponent } from '../../BaseCoreComponent';
import { fileJsonIcon } from '../../../icons';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';

export class JsonFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileLocation: "local", connectionMethod: "env", jsonOptions: {} };
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
          id: "jsonOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        }
      ],
    };

    const description = "Use JSON File Input to access data from a JSON file locally or remotely (via HTTP or S3)."

    super("JSON File Input", "jsonFileInput", description, "pandas_df_input", ["json", "jsonl"], "inputs", fileJsonIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {
    // Generate the JSON options string using the separate function
    const optionsString = this.generateJsonOptionsCode({ config });

    // Generate the final Python code for reading JSON
    const code = `
${outputName} = pd.read_json("${config.filePath}"${optionsString}).convert_dtypes()
  `;

    return code.trim();
  }

  public generateJsonOptionsCode({ config }): string {
    let jsonOptions = { ...config.jsonOptions };
  
    // Initialize storage_options if not already present
    let storageOptions = jsonOptions.storage_options || {};
  
    // Transform storage_options array into the correct format
    if (Array.isArray(storageOptions)) {
      const transformedStorageOptions = storageOptions.reduce((acc, item: { key: string; value: any }) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      // Merge transformed options with the S3-specific options
      const s3Options = S3OptionsHandler.handleS3SpecificOptions(config, {});
      storageOptions = { ...transformedStorageOptions, ...s3Options };
    } else {
      // Ensure S3-specific options are handled when storageOptions is not an array
      storageOptions = S3OptionsHandler.handleS3SpecificOptions(config, storageOptions);
    }

    // Update the storage_options in csvOptions
    if (Object.keys(storageOptions).length > 0) {
      jsonOptions.storage_options = storageOptions;
    }
  
    // Helper function to convert JavaScript values to Python literals
    const toPythonLiteral = (value: any): string => {
      if (typeof value === 'boolean') {
        return value ? 'True' : 'False';
      } else if (typeof value === 'string') {
        return `"${value}"`; // Handle strings with quotes
      } else if (Array.isArray(value)) {
        return JSON.stringify(value); // Convert arrays to JSON strings
      } else if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value); // Convert objects to JSON strings
      } else {
        return String(value); // Handle numbers and other types
      }
    };
  
    // Process jsonOptions into a string
    let optionsEntries = Object.entries(jsonOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (key === 'storage_options') {
          return `${key}=${toPythonLiteral(value)}`;
        } else {
          return `${key}=${toPythonLiteral(value)}`;
        }
      });
  
      return optionsEntries.length > 0 ? `, ${optionsEntries.join(', ')}` : '';
  }
}
