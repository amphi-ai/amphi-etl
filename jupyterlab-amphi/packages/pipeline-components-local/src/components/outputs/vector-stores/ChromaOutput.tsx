import { chromaIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class ChromaOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Collection name",
          id: "tsCFinputCollection",
          placeholder: "Type collection name"
        },
        {
          type: "input",
          label: "Directory to persist",
          id: "tsCFinputPersistDirectory",
          placeholder: "./chroma_db",
          advanced: true
        },
		//to do : is it used somewhere??
        {
          type: "cascader",
          label: "Embeddings Model",
          id: "tsCFcascaderModel",
          placeholder: "Select ...",
          options: [
            {
              value: "openai",
              label: "OpenAI",
              children: [
                { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
                { value: "text-embedding-3-small", label: "text-embedding-3-small" },
                { value: "text-embedding-3-large", label: "text-embedding-3-large" }
              ]
            }
          ]
        },
        {
          type: "input",
          inputType: "password",
          label: "OpenAI API Key",
          id: "tsCFinputOpenaiApiKey",
          connection: "OpenAI",
          advanced: true
        }
      ],
    };

    super("Chroma Output", "chromaOutput", "no desc", "documents_output", [], "outputs.Vector Stores", chromaIcon, defaultConfig, form);
  }


  public provideImports({ config }): string[] {
    return ["from langchain_openai import OpenAIEmbeddings", "from langchain_chroma import Chroma"];
  }

  public generateComponentCode({ config, inputName }): string {
    const persistDirectory = config.tsCFinputPersistDirectory ? `persist_directory="${config.tsCFinputPersistDirectory}", ` : '';

    const code = `
# Documents to Chroma with on-the-fly embedding
${inputName}_collection_name = "${config.tsCFinputCollection}"
${inputName}_embeddings = OpenAIEmbeddings(api_key="${config.tsCFinputOpenaiApiKey}")
${inputName}_to_Chroma = Chroma.from_documents(${inputName}, ${inputName}_embeddings, ${persistDirectory}collection_name=${inputName}_collection_name)
`;
    return code;
  }

}
