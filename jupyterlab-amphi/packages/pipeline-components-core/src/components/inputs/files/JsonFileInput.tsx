import { BaseCoreComponent } from '../../BaseCoreComponent'; 
import { fileTextIcon } from '../../../icons';

export class JsonFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { jsonOptions: {} };
    const form = {
      idPrefix: "component__form",
      fields: [
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
      ],
    };

    super("JSON File Input", "jsonFileInput", "pandas_df_input", ["json", "jsonl"], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {
    // Assuming the JSON options are nested under a jsonOptions key in the config object
    let optionsString = Object.entries(config.jsonOptions || {})
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => `${key}="${value}"`)
      .join(', ');

    const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

    const code = `
${outputName} = pd.read_json("${config.filePath}"${optionsCode}).convert_dtypes()
`;
    return code;
  }
}
