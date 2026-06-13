import { filePdfIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class PdfTablesInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFinputNumberPageNumber: 0,
		tsCFinputNumberTableNumber: 0 
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "tsCFfilePath",
          placeholder: "Type file name",
          tooltip: "This field expects a file with a pdf extension such as file.pdf.",
          validation: "\\.(pdf)$",
          allowedExtensions: ["pdf"]
        },
        {
          type: "inputNumber",
          label: "Page number",
          id: "tsCFinputNumberPageNumber",
          tooltip: "Page number where table is located starting at 0.",
        },
        {
          type: "inputNumber",
          label: "Table number",
          id: "tsCFinputNumberTableNumber",
          tooltip: "If multiple tables are present on the page, specify the number starting at 0.",
        }
      ],
    };

    super("PDF Tables Input", "pdfTablesInput", "no desc", "pandas_df_input", ["pdf"], "inputs", filePdfIcon, defaultConfig, form);
  }


  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('PyMuPDF');
    return deps;
  }

  public provideImports({ config }): string[] {
    return [
	"import pandas as pd",
	"import fitz"];
  }

  public generateComponentCode({ config, outputName }): string {
  
    // Generate the Python code
    const code = `
# Extract tables from ${config.tsCFfilePath}
${outputName}_doc = fitz.open("${config.tsCFfilePath}")
${outputName}_tabs = ${outputName}_doc[${config.tsCFinputNumberPageNumber}].find_tables() # detect the tables
${outputName} = ${outputName}_tabs[${config.tsCFinputNumberTableNumber}].to_pandas().convert_dtypes()
`;
    return code;
}

}