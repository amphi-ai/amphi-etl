
import { markdownIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class HtmlToMarkdown extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { stripOrConvert: "strip", tags: ["<script>"] };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Tags processing",
          id: "stripOrConvert",
          options: [
            { value: "strip", label: "Strip" },
            { value: "convert", label: "Convert" }
          ]
        },
        {
          type: "selectMultipleCustomizable",
          label: "Tags",
          id: "tags",
          tooltip: "List of tags to strip or convert to Markdown equivalent.",
          options: [
            { value: "script", label: "script" },
            { value: "style", label: "style" },
            { value: "iframe", label: "iframe" },
            { value: "object", label: "object" },
            { value: "form", label: "form" },
            { value: "h1", label: "h1" },
            { value: "h2", label: "h2" },
            { value: "h3", label: "h3" },
            { value: "h4", label: "h4" },
            { value: "h5", label: "h5" },
            { value: "h6", label: "h6" },
            { value: "p", label: "p" },
            { value: "strong", label: "strong" },
            { value: "b", label: "b" },
            { value: "em", label: "em" },
            { value: "i", label: "i" },
            { value: "a", label: "a" },
            { value: "ul", label: "ul" },
            { value: "ol", label: "ol" },
            { value: "li", label: "li" },
            { value: "div", label: "div" },
            { value: "span", label: "span" },
            { value: "img", label: "img" },
            { value: "br", label: "br" },
            { value: "hr", label: "hr" },
            { value: "table", label: "table" },
            { value: "tr", label: "tr" },
            { value: "td", label: "td" },
            { value: "th", label: "th" },
            { value: "thead", label: "thead" },
            { value: "tbody", label: "tbody" },
            { value: "tfoot", label: "tfoot" }
          ]
        },
        {
          type: "boolean",
          label: "Autolinks",
          id: "autolinks",
          tooltip: "Indicating whether the “automatic link” style should be used when a tag's contents match its href. Defaults to True.",
          advanced: true
        }
      ],
    };

    super("HTML to Markdown", "htmlToMarkdown", "no desc", "documents_processor", [], "transforms.documents", markdownIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('markdownify');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["from langchain_community.document_transformers import MarkdownifyTransformer"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const lengthFunction = config.chunkLength === "word" ? ",\n  length_function=word_length_function" : "";
    const tags = config.tags.map(tag => `"${tag}"`).join(", ");
    const stripOrConvert = config.stripOrConvert === "strip" ? "strip_tags" : "convert_tags";
    const autolinks = config.autolinks ? ",\n  autolinks=True" : "";

    const code = `
# Convert HTML to Markdown  
${outputName}_md = MarkdownifyTransformer(
  ${stripOrConvert}=[${tags}]
  ${autolinks}
)
${outputName} = ${outputName}_md.transform_documents(${inputName})
`;
    return code;
  }


}
