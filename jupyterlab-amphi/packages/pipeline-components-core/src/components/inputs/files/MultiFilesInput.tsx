import { BaseCoreComponent } from '../../BaseCoreComponent';
import { CsvFileInput } from './CsvFileInput';
import { JsonFileInput } from './JsonFileInput';
import { ExcelFileInput } from './ExcelFileInput';
import { ParquetFileInput } from './ParquetFileInput';
import { XmlFileInput } from './XmlFileInput';
import { fileTextIcon } from '../../../icons';

export class MultiFilesInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { fileType: "csv", selectionType: "select" };

    const csvComponent = new CsvFileInput();
    const jsonComponent = new JsonFileInput();
    const excelComponent = new ExcelFileInput();
    const parquetComponent = new ParquetFileInput();
    const xmlComponent = new XmlFileInput();

    const fieldsToRemove = ["fileLocation", "filePath"]; // Fields to remove from all components

    const filteredCsvFields = csvComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredJsonFields = jsonComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredExcelFields = excelComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));
    const filteredParquetFields = parquetComponent._form['fields'].filter(field => !fieldsToRemove.includes(field.id));

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
            { value: "xml", label: "XML" } // Added XML option
          ]
        },
        {
          type: "radio",
          label: "Selection Mode",
          id: "selectionType",
          options: [
            { value: "folder", label: "Folder" },
            { value: "select", label: "Select files" }
          ]
        },
        {
          type: "file",
          label: "Folder Path",
          id: "folderPath",
          placeholder: "Type folder path",
          condition: { selectionType: "folder" }
        },
        {
          type: "files",
          label: "File paths",
          id: "filePaths",
          placeholder: "Type file name",
          condition: { selectionType: "select" },
          advanced: true
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
        }))
      ]
    };

    const description = "Use File Input to read data from a local file or folder. Supports CSV, JSON, Excel, Parquet, and XML formats.";

    super("Multi File Input", "multiFileInput", description, "pandas_df_input", [], "inputs", fileTextIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = ["import pandas as pd", "import os", "import glob"];
    return deps;
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.selectionType === "folder") {
      imports.push("import os");
      imports.push("import glob");
    }
    return imports;
  }

  private generateLoopCode(config): string {
    let code = ''




    return code;
  }

public generateComponentCode({ config, outputName }): string {
  // Create an override of the config object to change `filePath` to "file"
  const overrideConfig = { ...config, filePath: "file" };

  let readerCode = '';

  // Generate specific code for each file type using `overrideConfig`
  if (config.fileType === "csv") {
    const csvComponent = new CsvFileInput();
    readerCode = csvComponent.generateComponentCode({ config: overrideConfig, outputName });
  } else if (config.fileType === "json") {
    const jsonComponent = new JsonFileInput();
    readerCode = jsonComponent.generateComponentCode({ config: overrideConfig, outputName });
  } else if (config.fileType === "excel") {
    const excelComponent = new ExcelFileInput();
    readerCode = excelComponent.generateComponentCode({ config: overrideConfig, outputName });
  } else if (config.fileType === "parquet") {
    const parquetComponent = new ParquetFileInput();
    readerCode = parquetComponent.generateComponentCode({ config: overrideConfig, outputName });
  } else if (config.fileType === "xml") {
    const xmlComponent = new XmlFileInput();
    readerCode = xmlComponent.generateComponentCode({ config: overrideConfig, outputName });
  }

  // Generate file selection logic
  let fileSelectionCode = '';
  if (config.selectionType === "folder") {
    fileSelectionCode = `
import os

folder_path = "${config.folderPath}"
selected_files = [os.path.join(folder_path, file) for file in os.listdir(folder_path) if file.endswith(".${config.fileType}")]
`.trim();
  } else {
    const fileList = config.filePaths.map(file => `"${file}"`).join(", ");
    fileSelectionCode = `
selected_files = [${fileList}]
`.trim();
  }

  // Construct the final Python code with proper indentation
  let code = `
${fileSelectionCode}

${outputName}_chunks = []
for file in selected_files:
    chunk = ${readerCode}
    ${outputName}_chunks.append(chunk)

${outputName} = pd.concat(${outputName}_chunks, ignore_index=True)
`.trim();

  return code;
}

  
}
