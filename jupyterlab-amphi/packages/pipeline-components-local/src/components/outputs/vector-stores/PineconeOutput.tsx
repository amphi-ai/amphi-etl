import { pineconeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class PineconeOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { 
	tsCFbooleanCreateIndex: false,
	tsCFcascaderCloudAndRegion: ["aws", "us-east-1"],
	tsCFinputNumberIndexDimensions: 1536,
	tsCFradioSimilarityMetric: "cosine" 
	};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Index Name",
          id: "tsCFinputIndexName",
          placeholder: "Type index name"
        },
        {
          type: "boolean",
          label: "Create index if not exist",
          id: "tsCFbooleanCreateIndex",
          advanced: true
        },
        {
          type: "input",
          inputType: "password",
          label: "Pinecone API Key",
          id: "tsCFinputPineconeApiKey",
          connection: "Pinecone",
          advanced: true
        },
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
          type: "cascader",
          label: "Pinecone Cloud Region",
          id: "tsCFcascaderCloudAndRegion",
          placeholder: "Select ...",
          options: [
            {
              value: "aws",
              label: "AWS",
              children: [
                { value: "us-east-1", label: "us-east-1" }
              ]
            }
          ],
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Index Dimensions",
          id: "tsCFinputNumberIndexDimensions",
          advanced: true
        },
        {
          type: "radio",
          label: "Vector Similarity metric",
          id: "tsCFradioSimilarityMetric",
          options: [
            { value: "cosine", label: "Cosine" },
            { value: "euclidean", label: "Euclidean" },
            { value: "dotproduct", label: "Dot Product" }
          ],
          advanced: true
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

    super("Pinecone Output", "PineconeOutput", "no desc", "documents_output", [], "outputs.Vector Stores", pineconeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["from langchain_openai import OpenAIEmbeddings", "from pinecone import Pinecone, ServerlessSpec", "from langchain_pinecone import PineconeVectorStore"];
  }

  public generateComponentCode({ config, inputName }): string {
    
    const createIndexCode = config.tsCFbooleanCreateIndex ? `

# Check if index already exists
if (${inputName}_index_name not in ${inputName}_pc.list_indexes().names()):
    # If does not exist, create index
    ${inputName}_pc.create_index(
        ${inputName}_index_name,
        dimension=${config.tsCFinputNumberIndexDimensions},  # dimensionality of text-embed-3-small
        metric="${config.tsCFradioSimilarityMetric}", # cosinus recommended for OpenAI
        spec=ServerlessSpec(cloud="${config.tsCFcascaderCloudAndRegion[0]}", region="${config.tsCFcascaderCloudAndRegion[1]}")
    )
    # wait for index to be initialized
    while not ${inputName}_pc.describe_index(${inputName}_index_name).status['ready']:
        time.sleep(1)
` : '';

    const code = `
# Documents to Pinecone with on-the-fly embedding
${inputName}_pc = Pinecone(api_key="${config.tsCFinputPineconeApiKey}")
${inputName}_index_name = "${config.tsCFinputIndexName}"
${createIndexCode}
${inputName}_embeddings = OpenAIEmbeddings(api_key="${config.tsCFinputOpenaiApiKey}")
${inputName}_to_Pinecone = PineconeVectorStore.from_documents(${inputName}, ${inputName}_embeddings, index_name=${inputName}_index_name)
`;
    return code;
}


}
