
import { changeCircleIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class ConvertToDocuments extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Select main column",
          id: "pageContent",
          placeholder: "Select ..."
        }
      ],
    };

    super("Convert to docs", "convertToDocuments", "no desc", "pandas_df_to_documents_processor", [], "transforms.documents", changeCircleIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "from langchain_community.document_loaders import DataFrameLoader"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const code = `
# Convert dataframe to documents
${outputName}_loader = DataFrameLoader(${inputName}, page_content_column="${config.pageContent.value}")
${outputName} = ${outputName}_loader.load()
`;
    return code;
  }


}
