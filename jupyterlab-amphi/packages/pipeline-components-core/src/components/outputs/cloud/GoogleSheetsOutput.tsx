
import { googleSheetsIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';


export class GoogleSheetsOutput extends BaseCoreComponent {
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
          connection: "Google Sheet",
          advanced: true
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
          validationMessage: "Invalid Range.",
          advanced: true
        }
      ],
    };

    super("G. Sheets Output", "googleSheetsOutput", "no desc", "pandas_df_output", [], "outputs", googleSheetsIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import gspread", "from oauth2client.service_account import ServiceAccountCredentials"];
  }

  public generateComponentCode({ config, inputName }): string {
    // Initialize an object to modify without affecting the original config
    let sheetOptions = { ...config.sheetOptions };

    // Validate and set the service account file path
    const serviceAccountFilePath = config.filePath ? `"${config.filePath}"` : 'None';

    // Unique variables for each instance
    const uniqueClientVar = `${inputName}Client`;
    const uniqueSheetVar = `${inputName}Sheet`;

    // Generate the Python code for outputting data to Google Sheets
    const code = `
# Outputting data to Google Sheets
scope = ["https://spreadsheets.google.com/feeds","https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name(${serviceAccountFilePath}, scope)
${uniqueClientVar} = gspread.authorize(creds)

# Open the spreadsheet and select the right worksheet
${uniqueSheetVar} = ${uniqueClientVar}.open_by_key(${sheetOptions.spreadsheetId ? `"${sheetOptions.spreadsheetId}"` : 'None'}).worksheet(${sheetOptions.range ? `"${sheetOptions.range.split('!')[0]}"` : 'None'})

# Update the sheet with dataframe's data
${uniqueSheetVar}.update([${inputName}.columns.values.tolist()] + ${inputName}.values.tolist())
`;

    return code;
  }

}
