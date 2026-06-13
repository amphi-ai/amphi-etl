import { apiIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class RestLookup extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { 
	tsCFradioMethod: "GET",
	tsCFkeyvalueHeaders: [] 
	};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "URL",
          id: "tsCFinputUrl",
          placeholder: "Endpoint URL",
        },
        {
          type: "radio",
          label: "Method",
          id: "tsCFradioMethod",
          options: [
            { key: "GET", value: "GET", text: "GET" },
            { key: "PUT", value: "PUT", text: "PUT" },
            { key: "POST", value: "POST", text: "POST" },
            { key: "DELETE", value: "DELETE", text: "DELETE" }
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Headers",
          id: "tsCFkeyvalueHeaders",
          advanced: true
        },
        {
          type: "textarea",
          label: "Body",
          id: "tsCFtextareaBody",
          placeholder: "Write body in JSON",
          advanced: true
        },
        {
          type: "input",
          label: "JSON Path",
          id: "tsCFinputJsonPath",
          placeholder: "JSON Path to retrieve from response",
          advanced: true
        }
      ],
    };

    super("REST Lookup", "restLookup", "no desc", "pandas_df_lookup", [], "transforms", apiIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
	"import pandas as pd",
	"import requests",
	"from jsonpath_ng import parse"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const headersParam = config.tsCFkeyvalueHeaders && config.tsCFkeyvalueHeaders.length > 0
      ? 'headers={' + config.tsCFkeyvalueHeaders.map(header => `"${header.key}": "${header.value}"`).join(', ') + '}, '
      : '';

    const jsonPathParam = config.tsCFinputJsonPath && config.tsCFinputJsonPath.trim() !== ''
      ? `jsonpath_expr = parse('${config.tsCFinputJsonPath}')\n    return [match.value for match in jsonpath_expr.find(response.json())] if jsonpath_expr.find(response.json()) else []`
      : 'return response.json()';

    const code = `
def lookup_value(row):
    response = requests.request(
        method="${config.tsCFradioMethod}",
        url="${config.tsCFinputUrl}".replace('{${config.inputColumnName}}', str(row['${config.inputColumnName}']))${headersParam ? ', ' + headersParam : ''}
    )
    ${jsonPathParam}

${inputName}['${config.resultColumnName}'] = ${inputName}.apply(lookup_value, axis=1)
${outputName} = ${inputName}
`;
    return code;
  }
}
