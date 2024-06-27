import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ComponentManager } from "@amphi/pipeline-components-manager";
import { Aggregate, Console, ExcelFileOutput, CsvFileInput, JsonFileInput, JsonFileOutput, ExcelFileInput, CsvFileOutput, CustomTransformations, Filter, RestInput,
SplitColumn, Deduplicate, ExpandList, Sample, Sort, RenameColumns, TypeConverter, Extract, GoogleSheetsInput, GoogleSheetsOutput, FilterColumns, Join,
ParquetFileInput, ParquetFileOutput, PostgresInput, PostgresOutput, MySQLInput, MySQLOutput, XmlFileInput, XmlFileOutput, HtmlFileInput, PdfFileInput, SQLQuery, RedditInput, OpenAILookUp,
EnvVariables, EnvFile, ConvertToDocuments, PineconeOutput, FixedSizeChunking, SemanticChunking, WordFileInput, PdfTablesInput, Transpose,
RecursiveChunking, HtmlToMarkdown, ParseHTML, ChromaOutput, CustomCodeDocuments, Unite,
FillMissingValues} from './components';

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-core',
  description: 'Adds a step counter/button (1 of 3 related examples). This extension holds the UI/interface',
  autoStart: true,
  requires: [ComponentManager],

  activate: (app: JupyterFrontEnd, componentService: any) => {
    console.log('JupyterLab extension pipeline-components-core is activated!');

    // Input
   componentService.addComponent(CsvFileInput.getInstance())
   componentService.addComponent(JsonFileInput.getInstance())
   componentService.addComponent(ExcelFileInput.getInstance())
   componentService.addComponent(RestInput.getInstance())
   componentService.addComponent(ParquetFileInput.getInstance())
   componentService.addComponent(XmlFileInput.getInstance())
   componentService.addComponent(GoogleSheetsInput.getInstance())
   componentService.addComponent(MySQLInput.getInstance())
   componentService.addComponent(PostgresInput.getInstance())
   componentService.addComponent(HtmlFileInput.getInstance())
   componentService.addComponent(PdfFileInput.getInstance())
   componentService.addComponent(PdfTablesInput.getInstance())
   componentService.addComponent(WordFileInput.getInstance())
   componentService.addComponent(RedditInput.getInstance())

   // Processors
   componentService.addComponent(FilterColumns.getInstance())
   componentService.addComponent(RenameColumns.getInstance())
   componentService.addComponent(Filter.getInstance())
   componentService.addComponent(Aggregate.getInstance())
   componentService.addComponent(Join.getInstance())
   componentService.addComponent(TypeConverter.getInstance())
   componentService.addComponent(FillMissingValues.getInstance())
   componentService.addComponent(SplitColumn.getInstance())
   componentService.addComponent(Extract.getInstance())
   componentService.addComponent(Sort.getInstance())
   componentService.addComponent(Transpose.getInstance())
   componentService.addComponent(Deduplicate.getInstance())
   componentService.addComponent(ExpandList.getInstance())
   componentService.addComponent(Sample.getInstance())
   componentService.addComponent(SQLQuery.getInstance())
   componentService.addComponent(Unite.getInstance())
   componentService.addComponent(CustomTransformations.getInstance())
   componentService.addComponent(OpenAILookUp.getInstance())
   componentService.addComponent(ConvertToDocuments.getInstance())
   componentService.addComponent(FixedSizeChunking.getInstance())
   componentService.addComponent(SemanticChunking.getInstance())
   componentService.addComponent(RecursiveChunking.getInstance())
   componentService.addComponent(HtmlToMarkdown.getInstance())
   componentService.addComponent(ParseHTML.getInstance())
   componentService.addComponent(CustomCodeDocuments.getInstance())

  // Outputs
   componentService.addComponent(CsvFileOutput.getInstance())
   componentService.addComponent(JsonFileOutput.getInstance())
   componentService.addComponent(ExcelFileOutput.getInstance())
   componentService.addComponent(ParquetFileOutput.getInstance())
   componentService.addComponent(XmlFileOutput.getInstance())
   componentService.addComponent(GoogleSheetsOutput.getInstance())
   componentService.addComponent(MySQLOutput.getInstance())
   componentService.addComponent(PostgresOutput.getInstance())
   componentService.addComponent(Console.getInstance())
   componentService.addComponent(PineconeOutput.getInstance())
   componentService.addComponent(ChromaOutput.getInstance())



   // Other
   componentService.addComponent(EnvVariables.getInstance())
   componentService.addComponent(EnvFile.getInstance())
   //componentService.addComponent(Annotation.getInstance())
   // componentService.addComponent(EmailLogger.getInstance())
   // componentService.addComponent(FileLogger.getInstance())



   // componentService.addComponent(RestInput.getInstance())
      /*
   componentService.addComponent(FileOutput.getInstance())
   componentService.addComponent(Console.getInstance())
   componentService.addComponent(CustomTransformations.getInstance())
   componentService.addComponent(Filter.getInstance())
   componentService.addComponent(LookUp.getInstance())
   */
  }
};

export default plugin;