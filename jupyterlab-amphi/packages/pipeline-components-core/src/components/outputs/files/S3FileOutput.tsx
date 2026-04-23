import { bucketIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { S3OptionsHandler } from '../../common/S3OptionsHandler';
import { CsvFileOutput } from './CsvFileOutput';
import { JsonFileOutput } from './JsonFileOutput';
import { ExcelFileOutput } from './ExcelFileOutput';
import { ParquetFileOutput } from './ParquetFileOutput';
import { XmlFileOutput } from './XmlFileOutput';

export class S3FileOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
	tsCFradioFileType: "csv",
	tsCFradioFileLocation: "s3",
	connectionMethod: "env" };

    const csvComponent = new CsvFileOutput();
    const jsonComponent = new JsonFileOutput();
    const excelComponent = new ExcelFileOutput();
    const parquetComponent = new ParquetFileOutput();
    const xmlComponent = new XmlFileOutput();

    const fieldsToRemove = ["tsCFradioFileLocation"]; // Fields to remove from all components

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
          id: "tsCFradioFileType",
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
          condition: { tsCFradioFileType: ["csv"], ...(field.condition || {}) }
        })),
        ...filteredJsonFields.map(field => ({
          ...field,
          condition: { tsCFradioFileType: ["json"], ...(field.condition || {}) }
        })),
        ...filteredExcelFields.map(field => ({
          ...field,
          condition: { tsCFradioFileType: ["excel"], ...(field.condition || {}) }
        })),
        ...filteredParquetFields.map(field => ({
          ...field,
          condition: { tsCFradioFileType: ["parquet"], ...(field.condition || {}) }
        })),
        ...filteredXmlFields.map(field => ({
          ...field,
          condition: { tsCFradioFileType: ["xml"], ...(field.condition || {}) }
        }))
      ]
    };

    const description = "Use File Output to write or append data to a file remotely (S3). Supports CSV, JSON, Excel, Parquet, and XML formats.";

    super("S3 File Output", "fileOutput", description, "pandas_df_output", [], "outputs", bucketIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    if (config.tsCFradioFileType === "csv") {
      const csvComponent = new CsvFileOutput();
      return csvComponent.generateComponentCode({ config, inputName });
    } else if (config.tsCFradioFileType === "json") {
      const jsonComponent = new JsonFileOutput();
      return jsonComponent.generateComponentCode({ config, inputName });
    } else if (config.tsCFradioFileType === "excel") {
      const excelComponent = new ExcelFileOutput();
      return excelComponent.generateComponentCode({ config, inputName });
    } else if (config.tsCFradioFileType === "parquet") {
      const parquetComponent = new ParquetFileOutput();
      return parquetComponent.generateComponentCode({ config, inputName });
    } else if (config.tsCFradioFileType === "xml") {
      const xmlComponent = new XmlFileOutput();
      return xmlComponent.generateComponentCode({ config, inputName });
    }
    return '';
  }
}
