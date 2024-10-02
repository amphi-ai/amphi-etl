import { BaseCoreComponent } from '../../BaseCoreComponent';
import { htmlIcon } from '../../../icons';

export class HtmlFileInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "valuesList",
          label: "URLs",
          id: "urls",
          placeholders: "Enter URLs"
        }
      ],
    };

    super("HTML Input", "htmlInput", "no desc", "documents_input", ["html", "htm"], "inputs.Unstructured", htmlIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    let imports: string[] = [];
    imports.push('from langchain_community.document_loaders import AsyncHtmlLoader');

    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    let code = '';
  
    // Initial code for loading HTML
    code += `
# Retrieve HTML from provided URLs
${outputName}_loader = AsyncHtmlLoader([${config.urls.map(url => `"${url}"`).join(', ')}])
${outputName} = ${outputName}_loader.load()
`
    return code;
  }

}
