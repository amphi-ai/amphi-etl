import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ComponentManager } from "@amphi/pipeline-components-manager";
import { Annotation, Aggregate, Console, ExcelFileOutput, CsvFileInput, JsonFileInput, JsonFileOutput, ExcelFileInput, CsvFileOutput, CustomTransformations, Filter, RestInput,
SplitColumn, Deduplicate, ExpandList, Sample, Sort, RenameColumns, TypeConverter, Extract, FilterColumns, GoogleSheetsInput, GoogleSheetsOutput,
ParquetFileInput, ParquetFileOutput, MySQLInput, MySQLOutput, XmlFileInput, XmlFileOutput, HtmlFileInput, PdfFileInput, SQLQuery } from './components';

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
   componentService.addComponent(HtmlFileInput.getInstance())
   componentService.addComponent(PdfFileInput.getInstance())


   // Outputs
   componentService.addComponent(CsvFileOutput.getInstance())
   componentService.addComponent(JsonFileOutput.getInstance())
   componentService.addComponent(ExcelFileOutput.getInstance())
   componentService.addComponent(ParquetFileOutput.getInstance())
   componentService.addComponent(XmlFileOutput.getInstance())
   componentService.addComponent(GoogleSheetsOutput.getInstance())
   componentService.addComponent(MySQLOutput.getInstance())
   componentService.addComponent(Console.getInstance())

   // Processors
   componentService.addComponent(Filter.getInstance())
   componentService.addComponent(Aggregate.getInstance())
   componentService.addComponent(SQLQuery.getInstance())
   componentService.addComponent(CustomTransformations.getInstance())
   componentService.addComponent(SplitColumn.getInstance())
   componentService.addComponent(Deduplicate.getInstance())
   componentService.addComponent(ExpandList.getInstance())
   componentService.addComponent(Sample.getInstance())
   componentService.addComponent(Sort.getInstance())
   componentService.addComponent(RenameColumns.getInstance())
   componentService.addComponent(FilterColumns.getInstance())
   componentService.addComponent(TypeConverter.getInstance())
   componentService.addComponent(Extract.getInstance())

   // Other
   componentService.addComponent(Annotation.getInstance())
   
   
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