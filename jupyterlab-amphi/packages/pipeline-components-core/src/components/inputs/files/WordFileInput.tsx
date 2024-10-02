
import { fileTextIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class WordFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholders: "Select or type file",
          validation: "\\.(docx)$",
          validationMessage: "This field expects a file with a pdf extension such as file.docx."
        }
      ],
    };

    super("Word File Input", "wordInput", "no desc", "documents_input", ["docx"], "inputs.Unstructured", fileTextIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('docx2txt');
    return deps;
  }

  public provideImports({ config }): string[] {
    let imports: string[] = [];
    imports.push('from langchain_community.document_loaders import Docx2txtLoader');
    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    let code = '';

    // Initial code for loading HTML
    code += `
# Read Word file and retrieve text from ${config.filePath}
${outputName}_loader = Docx2txtLoader("${config.filePath}")
${outputName} = ${outputName}_loader.load()
`;
    return code;
  }



}
