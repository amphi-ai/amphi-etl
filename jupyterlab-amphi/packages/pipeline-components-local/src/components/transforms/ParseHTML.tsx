import { htmlLineIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class ParseHTML extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "selectMultipleCustomizable",
          label: "Tags to extract",
          id: "tsCFselectMultipleCustomizableTagsToExtract",
          tooltip: "A list of tags whose content will be extracted.",
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
          type: "selectMultipleCustomizable",
          label: "Unwanted tags",
          id: "tsCFselectMultipleCustomizableUnwantedTags",
          tooltip: "A list of tags to be removed from the HTML.",
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
          type: "valuesList",
          label: "Remove class names",
          id: "tsCFvaluesListRemoveClassnames",
          tooltip: "A list of class names to be removed from the HTML.",
          advanced: true
        },
        {
          type: "boolean",
          label: "Remove unnecessary lines",
          id: "tsCFbooleanRemoveLines",
          tooltip: "If set to True, unnecessary lines will be removed.",
          advanced: true
        },
        {
          type: "boolean",
          label: "Remove comments",
          id: "tsCFbooleanRemoveComments",
          tooltip: "If set to True, comments will be removed.",
          advanced: true
        }
      ],
    };

    super("Parse HTML", "parseHtml", "no desc", "documents_processor", [], "transforms.documents", htmlLineIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["from langchain_community.document_transformers import BeautifulSoupTransformer"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const formatList = (list: string[]): string => {
      return list && list.length > 0 ? `[${list.map(item => `'${item}'`).join(', ')}]` : '[]';
    };

    const formatBoolean = (value: boolean): string => {
      return typeof value === 'boolean' ? `${value ? 'True' : 'False'}` : 'None';
    };

    const options = [
      config.tsCFselectMultipleCustomizableTagsToExtract && config.tsCFselectMultipleCustomizableTagsToExtract.length > 0 ? `tags_to_extract=${formatList(config.tsCFselectMultipleCustomizableTagsToExtract)}` : '',
      config.tsCFselectMultipleCustomizableUnwantedTags && config.tsCFselectMultipleCustomizableUnwantedTags.length > 0 ? `unwanted_tags=${formatList(config.tsCFselectMultipleCustomizableUnwantedTags)}` : '',
      config.tsCFvaluesListRemoveClassnames && config.tsCFvaluesListRemoveClassnames.length > 0 ? `remove_classnames=${formatList(config.tsCFvaluesListRemoveClassnames)}` : '',
      config.tsCFbooleanRemoveLines !== undefined && config.tsCFbooleanRemoveLines !== false ? `remove_lines=${formatBoolean(config.tsCFbooleanRemoveLines)}` : '',
      config.tsCFbooleanRemoveComments !== undefined && config.tsCFbooleanRemoveComments !== false ? `remove_comments=${formatBoolean(config.tsCFbooleanRemoveComments)}` : ''
    ].filter(option => option).join(',\n  ');

    const code = `
# Parse HTML
${outputName}_transformer = BeautifulSoupTransformer()
${outputName} = ${outputName}_transformer.transform_documents(${inputName},
${options}
)
`;
    return code;
  }


}
