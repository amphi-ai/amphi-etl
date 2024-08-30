import { s3Icon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';
import { CsvFileOutput } from './CsvFileOutput';
import { JsonFileOutput } from './JsonFileOutput';
import { ExcelFileOutput } from './ExcelFileOutput';
import { ParquetFileOutput } from './ParquetFileOutput';
import { XmlFileOutput } from './XmlFileOutput';

export class S3FileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileType: "csv", fileLocation: "s3", connectionMethod: "env" };

    const csvComponent = new CsvFileOutput();
    const jsonComponent = new JsonFileOutput();
    const excelComponent = new ExcelFileOutput();
    const parquetComponent = new ParquetFileOutput();
    const xmlComponent = new XmlFileOutput();

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
          condition: { fileType: ["csv"], ...(field.condition || {}) }
        })),
        ...filteredJsonFields.map(field => ({
          ...field,
          condition: { fileType: ["json"], ...(field.condition || {}) }
        })),
        ...filteredExcelFields.map(field => ({
          ...field,
          condition: { fileType: ["excel"], ...(field.condition || {}) }
        })),
        ...filteredParquetFields.map(field => ({
          ...field,
          condition: { fileType: ["parquet"], ...(field.condition || {}) }
        })),
        ...filteredXmlFields.map(field => ({
          ...field,
          condition: { fileType: ["xml"], ...(field.condition || {}) }
        }))
      ]
    };

    const description = "Use File Output to write or append data to a file remotely (S3). Supports CSV, JSON, Excel, Parquet, and XML formats.";

    super("S3 File Output", "fileOutput", description, "pandas_df_output", [], "outputs.AWS", s3Icon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    if (config.fileType === "csv") {
      const csvComponent = new CsvFileOutput();
      return csvComponent.generateComponentCode({ config, inputName });
    } else if (config.fileType === "json") {
      const jsonComponent = new JsonFileOutput();
      return jsonComponent.generateComponentCode({ config, inputName });
    } else if (config.fileType === "excel") {
      const excelComponent = new ExcelFileOutput();
      return excelComponent.generateComponentCode({ config, inputName });
    } else if (config.fileType === "parquet") {
      const parquetComponent = new ParquetFileOutput();
      return parquetComponent.generateComponentCode({ config, inputName });
    } else if (config.fileType === "xml") {
      const xmlComponent = new XmlFileOutput();
      return xmlComponent.generateComponentCode({ config, inputName });
    }
    return '';
  }
}
