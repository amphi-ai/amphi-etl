
import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class PdfTablesInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { pageNumber: 0, tableNumber: 0 };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholder: "Type file name",
          tooltip: "This field expects a file path with a csv, tsv or txt extension such as input.csv.",
          validation: "\\.(pdf)$",
        },
        {
          type: "inputNumber",
          label: "Page number",
          id: "pageNumber",
          tooltip: "Page number where table is located starting at 0.",
        },
        {
          type: "inputNumber",
          label: "Table number",
          id: "tableNumber",
          tooltip: "If multiple tables are present on the page, specify the number starting at 0.",
        }
      ],
    };

    super("PDF Tables Input", "pdfTablesInput", "no desc", "pandas_df_input", ["pdf"], "inputs", fileTextIcon, defaultConfig, form);
  }


  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('PyMuPDF');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import fitz"];
  }

  public generateComponentCode({ config, outputName }): string {
  
    // Generate the Python code
    const code = `
# Extract tables from ${config.filePath}
${outputName}_doc = fitz.open("${config.filePath}")
${outputName}_tabs = ${outputName}_doc[${config.pageNumber}].find_tables() # detect the tables
${outputName} = ${outputName}_tabs[${config.tableNumber}].to_pandas()
`;
    return code;
}

}
