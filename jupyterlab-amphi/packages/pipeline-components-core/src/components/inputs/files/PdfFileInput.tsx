
import { filePdfIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class PdfFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { library: "PyPDF" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "file",
          label: "File path",
          id: "filePath",
          placeholders: "Select or type file",
          validation: "\\.(pdf)$",
          validationMessage: "This field expects a file with a pdf extension such as file.pdf."
        },
        {
          type: "select",
          label: "Library",
          id: "library",
          options: [
            { value: "PyPDF", label: "PyPDF" },
            { value: "PyMuPDF", label: "PyMuPDF" }
          ],
          advanced: true
        }
      ],
    };

    super("PDF File Input", "pdfInput", "documents_input", "no desc", ["pdf"], "inputs.Unstructured", filePdfIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    switch (config.library) {
      case 'PyPDF':
        deps.push('pypdf');
        break;
      case 'PyMuPDF':
        deps.push('pymupdf');
        break;
      default:
        console.error('Unknown option');
    }

    return deps;
  }

  public provideImports({ config }): string[] {
    let imports: string[] = [];
    switch (config.library) {
      case 'PyPDF':
        imports.push('from langchain_community.document_loaders import PyPDFLoader');
        break;
      case 'PyMuPDF':
        imports.push('from langchain_community.document_loaders import PyMuPDFLoader');
        break;
      default:
        console.error('Unknown option');
    }

    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    let code = '';
  
    // Initial code for loading HTML
    code += `
# Read PDF and retrieve text from ${config.filePath}
`;
  
    switch (config.library) {
      case 'PyPDF':
        code += `${outputName}_loader = PyPDFLoader("${config.filePath}")\n`;
        break;
      case 'PyMuPDF':
        code += `${outputName}_loader = PyMuPDFLoader("${config.filePath}")\n`;
        break;
      default:
        console.error('Unknown option');
        code += `# Unknown library option\n`;
    }
  
  code += `${outputName} = ${outputName}_loader.load()\n`;
  
    return code;
  }



}
