
import { splitIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class RecursiveChunking extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { separators: ["\n\n", "\n", " ", ""], regex: false, chunkSize: 1000, chunkOverlap: 100, chunkLength: "character" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "selectMultipleCustomizable",
          label: "Separators",
          id: "separators",
          tooltip: "The chunking strategy is parameterized by a list of separators. It tries to split on them in order until the chunks are small enough.",
          options: [
            { value: "\n\n", label: "Double newline (paragraph)" },
            { value: "\n", label: "Single newline" },
            { value: " ", label: "Space" },
            { value: "", label: "Empty (character-based splitting)" },
            { value: ",", label: "Comma (,)" },
            { value: ".", label: "Period (.)" },
            { value: "!", label: "Exclamation mark (!)" },
            { value: "?", label: "Question mark (?)" }
          ],
          advanced: true
        },
        {
          type: "boolean",
          label: "Separator is a regex",
          id: "regex",
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Chunk Size",
          id: "chunkSize"
        },
        {
          type: "inputNumber",
          label: "Chunk Overlap",
          id: "chunkOverlap"
        },
        {
          type: "select",
          label: "Chunk length",
          tooltip: "Determine how the length of the chunks are measured. By default, the length of a chunk is measured in characters",
          id: "chunkLength",
          options: [
            { value: "character", label: "Character" },
            { value: "word", label: "Word" }
          ],
          advanced: true
        }
      ],
    };

    super("Recursive chunking", "recursiveChunking", "no desc", "documents_processor", [], "transforms.documents", splitIcon, defaultConfig, form);
  }

  public provideFunctions({ config }): string[] {
    let functions: string[] = [];
    if (config.chunkLength === "word") {
      const code = `
def word_length_function(text):
    return len(text.split())
`;
      functions.push(code);
    }
    return functions;
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('tiktoken');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["from langchain_text_splitters import RecursiveCharacterTextSplitter"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const lengthFunction = config.chunkLength === "word" ? ",\n  length_function=word_length_function" : "";
    const separatorsList = config.separators.map(separator => `"${separator.replace(/\n/g, '\\n').replace(/\n\n/g, '\\n\\n')}"`).join(", ");

    const code = `
# Recursive chunking (character split)
${outputName}_text_splitter = RecursiveCharacterTextSplitter(
  separators=[${separatorsList}],
  chunk_size = ${config.chunkSize},
  chunk_overlap  = ${config.chunkOverlap},
  is_separator_regex = ${config.regex ? "True" : "False"}${lengthFunction}
)
${outputName} = ${outputName}_text_splitter.split_documents(${inputName})
`;
    return code;
  }


}
