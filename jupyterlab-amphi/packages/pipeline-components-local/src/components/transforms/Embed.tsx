
import { sortIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Embed extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "cascader",
          label: "Embeddings Model",
          id: "model",
          placeholder: "Select ...",
          options: [
            {
              value: "openai",
              label: "OpenAI",
              children: [
                { value: "text-embedding-3-large", label: "text-embedding-3-large" }
              ]
            }
          ]
        }
      ],
    };

    super("Embed", "embed", "no desc", "documents_processor", [], "transforms.documents", sortIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "from langchain_openai import OpenAIEmbeddings"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const code = `
# Embed data into embedding using ${config.model}
${outputName}_embeddings = OpenAIEmbeddings(model="${config.model}")
${outputName} = ${outputName}_embeddings.embed_documents(${inputName})
`;
    return code;
  }


}
