
import { googleSheetsIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class GoogleSheetsInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { sheetOptions: { spreadsheetId: "", range: "Sheet1" } };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "Service Account Key",
          id: "filePath",
          placeholder: "Type file name",
          validation: "\\.(json)$",
          validationMessage: "This field expects a file with a .json extension such as your-service-account-file.json.",
          advanced: true,
          connection: "Google Sheet"
        },
        {
          type: "input",
          label: "Spreadsheet ID",
          id: "sheetOptions.spreadsheetId",
          placeholder: "Enter Google Sheets' name or ID",
          validation: "^[a-zA-Z0-9-_]+$",
          validationMessage: "Invalid Spreadsheet ID."
        },
        {
          type: "input",
          label: "Range",
          id: "sheetOptions.range",
          placeholder: "e.g., Sheet1 or Sheet1!A1:D5",
          validation: "^[a-zA-Z0-9-_!]+$",
          validationMessage: "Invalid Range."
        }
      ],
    };
    const description = "Use Google Sheet Input to retrieve spreadsheet data from a Google Sheet using its ID.";

    super("G. Sheets Input", "googleSheetsInput", description, "pandas_df_input", [], "inputs", googleSheetsIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('gspread');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import gspread", "from oauth2client.service_account import ServiceAccountCredentials"];
  }

  public generateComponentCode({ config, outputName }): string {
    // Initialize an object to modify without affecting the original config
    let sheetOptions = { ...config.sheetOptions };
  
    // Check if service account file path is provided and not empty
    const isServiceAccountProvided = !!config.filePath && config.filePath.trim() !== '';
  
    // Prepare options string for pd.read_gbq
    let optionsString = Object.entries(sheetOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => `${key}="${value}"`)
      .join(', ');
  
    // Unique variables for each instance
    const uniqueClientVar = `${outputName}Client`;
    const uniqueSheetVar = `${outputName}Sheet`;
  
    // Conditional code based on service account availability
    let authenticationCode = isServiceAccountProvided ? 
`# Authentication with service account
scope = ["https://spreadsheets.google.com/feeds","https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name("${config.filePath}", scope)
${uniqueClientVar} = gspread.authorize(creds)
` :
`# Accessing public sheet without authentication
${uniqueClientVar} = gspread.service_account()
`;
  
    // Generate the Python code for reading data from Google Sheets
    const code = `
# Reading data from Google Sheets
${authenticationCode}
# Open the spreadsheet
${uniqueSheetVar} = ${uniqueClientVar}.open_by_key(${sheetOptions.spreadsheetId ? `"${sheetOptions.spreadsheetId}"` : 'None'}).worksheet(${sheetOptions.range ? `"${sheetOptions.range.split('!')[0]}"` : 'None'})
  
# Convert to DataFrame
${outputName} = pd.DataFrame(${uniqueSheetVar}.get_all_records())
`;

    return code;
  }

}
