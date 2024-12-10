import { BaseCoreComponent } from '../../BaseCoreComponent';
import { CsvFileInput } from './CsvFileInput';
import { JsonFileInput } from './JsonFileInput';
import { ExcelFileInput } from './ExcelFileInput';
import { ParquetFileInput } from './ParquetFileInput';
import { XmlFileInput } from './XmlFileInput';
import { fileTextIcon } from '../../../icons';

export class LocalFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileType: "csv", fileLocation: "local" };

    const csvComponent = new CsvFileInput();
    const jsonComponent = new JsonFileInput();
    const excelComponent = new ExcelFileInput();
    const parquetComponent = new ParquetFileInput();
    const xmlComponent = new XmlFileInput();

    const fieldsToRemove = ["fileLocation"]; // Fields to remove from all components

    const filteredCsvFields = csvComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredJsonFields = jsonComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredExcelFields = excelComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredParquetFields = parquetComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredXmlFields = xmlComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "File Type",
          id: "fileType",
          options: [
            { value: "csv", label: "CSV" },
            { value: "json", label: "JSON" },
            { value: "excel", label: "Excel" },
            { value: "parquet", label: "Parquet" },
            { value: "xml", label: "XML" }
          ]
        },
        // Conditionally display filtered fields based on selected file type
        ...filteredCsvFields.map(field => ({
          ...field,
          condition: { fileType: "csv", ...(field.condition || {}) }
        })),
        ...filteredJsonFields.map(field => ({
          ...field,
          condition: { fileType: "json", ...(field.condition || {}) }
        })),
        ...filteredExcelFields.map(field => ({
          ...field,
          condition: { fileType: "excel", ...(field.condition || {}) }
        })),
        ...filteredParquetFields.map(field => ({
          ...field,
          condition: { fileType: "parquet", ...(field.condition || {}) }
        })),
        ...filteredXmlFields.map(field => ({
          ...field,
          condition: { fileType: "xml", ...(field.condition || {}) }
        }))
      ]
    };

    const description = "Use File Input to read data from a local file. Supports CSV, JSON, Excel, Parquet, and XML formats.";

    super("File Input", "localFileInput", description, "pandas_df_input", [], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    return deps;
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    if (config.fileType === "csv") {
      const csvComponent = new CsvFileInput();
      return csvComponent.generateComponentCode({ config, outputName });
    } else if (config.fileType === "json") {
      const jsonComponent = new JsonFileInput();
      return jsonComponent.generateComponentCode({ config, outputName });
    } else if (config.fileType === "excel") {
      const excelComponent = new ExcelFileInput();
      return excelComponent.generateComponentCode({ config, outputName });
    } else if (config.fileType === "parquet") {
      const parquetComponent = new ParquetFileInput();
      return parquetComponent.generateComponentCode({ config, outputName });
    } else if (config.fileType === "xml") {
      const xmlComponent = new XmlFileInput();
      return xmlComponent.generateComponentCode({ config, outputName });
    }
    return '';
  }
}
