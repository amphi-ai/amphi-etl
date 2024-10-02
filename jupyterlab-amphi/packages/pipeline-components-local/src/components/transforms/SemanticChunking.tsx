
import { splitIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class SemanticChunking extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { type: "nltk", chunkSize: 1000, chunkOverlap: 100 };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Type",
          id: "type",
          options: [
            { value: "nltk", label: "NLTK" },
            { value: "spacy", label: "spaCy" }
          ]
        },
        {
          type: "inputNumber",
          label: "Chunk Size",
          id: "chunkSize",
        },
        {
          type: "inputNumber",
          label: "Chunk Overlap",
          id: "chunkOverlap",
        }
      ],
    };

    super("Semantic chunking", "semanticChunking", "no desc", "documents_processor", [], "transforms.documents", splitIcon, defaultConfig, form);
  }

  public provideDependencies({config}): string[] {
    let deps: string[] = [];
    switch (config.type) {
      case 'nltk':
        deps.push('nltk');
        break;
      case 'spacy':
        break;
      default:
        console.error('Unknown option');
    }
    deps.push('nltk');
    return deps;
  }

  public provideImports({config}): string[] {

    let imports: string[] = [];
    switch (config.type) {
      case 'nltk':
        imports.push('from langchain_text_splitters import NLTKTextSplitter');
        break;
      case 'spacy':
        imports.push('from langchain_text_splitters import SpacyTextSplitter');
        break;
      default:
        console.error('Unknown option');
    }

    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
  
    let splitter: string;
    switch (config.type) {
      case 'nltk':
        splitter = `${outputName}_text_splitter = NLTKTextSplitter(chunk_size=${config.chunkSize}, chunk_overlap=${config.chunkOverlap})`;
        break;
      case 'spacy':
        splitter = `${outputName}_text_splitter = SpacyTextSplitter(chunk_size=${config.chunkSize}, chunk_overlap=${config.chunkOverlap})`;
        break;
      default:
        console.error('Unknown option');
    }

    const code = `
# Sentence chunking
${splitter}
${outputName} = ${outputName}_text_splitter.split_documents(${inputName})
`;
    return code;
  }
  

}
