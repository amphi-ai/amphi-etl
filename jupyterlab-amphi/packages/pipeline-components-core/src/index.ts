import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ComponentManager } from "@amphi/pipeline-components-manager";
import {
  Aggregate, Console, ExcelFileOutput, CsvFileInput, JsonFileInput, JsonFileOutput, ExcelFileInput, CsvFileOutput, CustomTransformations, Filter, RestInput,
  SplitColumn, Deduplicate, ExpandList, Sample, Sort, RenameColumns, TypeConverter, Extract, GoogleSheetsInput, GoogleSheetsOutput, FilterColumns, Join,
  ParquetFileInput, ParquetFileOutput, PostgresInput, PostgresOutput, MySQLInput, MySQLOutput, XmlFileInput, XmlFileOutput, SQLQuery, OpenAILookUp,
  EnvVariables, EnvFile, Transpose, Unite, Pivot, Annotation, BigQueryInput, ODBCInput, PdfTablesInput,
  DataCleansing, GenerateIDColumn, SqlServerInput, OracleInput, Connection, SnowflakeInput, FormulaRow, InlineInput, S3FileOutput, S3FileInput
} from './components';

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-core',
  description: 'Adds a step counter/button (1 of 3 related examples). This extension holds the UI/interface',
  autoStart: true,
  requires: [ComponentManager],

  activate: (app: JupyterFrontEnd, componentService: any) => {
    console.log('JupyterLab extension pipeline-components-core is activated!');

    // Settings
    componentService.addComponent(EnvVariables.getInstance())
    componentService.addComponent(EnvFile.getInstance())
    componentService.addComponent(Connection.getInstance())

    // Input
    componentService.addComponent(InlineInput.getInstance())
    componentService.addComponent(CsvFileInput.getInstance())
    componentService.addComponent(ExcelFileInput.getInstance())
    componentService.addComponent(ParquetFileInput.getInstance())
    componentService.addComponent(JsonFileInput.getInstance())
    componentService.addComponent(XmlFileInput.getInstance())
    componentService.addComponent(PdfTablesInput.getInstance())
    componentService.addComponent(S3FileInput.getInstance())

    componentService.addComponent(RestInput.getInstance())
    componentService.addComponent(GoogleSheetsInput.getInstance())
    componentService.addComponent(MySQLInput.getInstance())
    componentService.addComponent(PostgresInput.getInstance())
    componentService.addComponent(OracleInput.getInstance())
    componentService.addComponent(SqlServerInput.getInstance())
    componentService.addComponent(SnowflakeInput.getInstance())
    componentService.addComponent(ODBCInput.getInstance())

    // componentService.addComponent(BigQueryInput.getInstance())

    // Processors
    componentService.addComponent(RenameColumns.getInstance());
    componentService.addComponent(FilterColumns.getInstance());
    componentService.addComponent(Filter.getInstance());
    componentService.addComponent(Sort.getInstance());
    componentService.addComponent(SplitColumn.getInstance());
    componentService.addComponent(Extract.getInstance());
    componentService.addComponent(ExpandList.getInstance());
    componentService.addComponent(FormulaRow.getInstance());
    componentService.addComponent(Join.getInstance());
    componentService.addComponent(Unite.getInstance());
    componentService.addComponent(Aggregate.getInstance());
    componentService.addComponent(Pivot.getInstance());
    componentService.addComponent(Transpose.getInstance());
    componentService.addComponent(Deduplicate.getInstance());
    componentService.addComponent(TypeConverter.getInstance());
    componentService.addComponent(DataCleansing.getInstance());
    componentService.addComponent(Sample.getInstance());
    componentService.addComponent(CustomTransformations.getInstance());
    componentService.addComponent(SQLQuery.getInstance());
    componentService.addComponent(OpenAILookUp.getInstance());
    componentService.addComponent(GenerateIDColumn.getInstance());

    // Outputs
    componentService.addComponent(CsvFileOutput.getInstance())
    componentService.addComponent(JsonFileOutput.getInstance())
    componentService.addComponent(ExcelFileOutput.getInstance())
    componentService.addComponent(ParquetFileOutput.getInstance())
    componentService.addComponent(XmlFileOutput.getInstance())
    componentService.addComponent(GoogleSheetsOutput.getInstance())
    componentService.addComponent(S3FileOutput.getInstance())
    componentService.addComponent(MySQLOutput.getInstance())
    componentService.addComponent(PostgresOutput.getInstance())
    componentService.addComponent(Console.getInstance())

    // Documentation
    componentService.addComponent(Annotation.getInstance())
  }
};

export default plugin;