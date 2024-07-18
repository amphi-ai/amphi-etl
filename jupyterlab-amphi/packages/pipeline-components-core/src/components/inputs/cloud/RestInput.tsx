import { apiIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; 

export class RestInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { method: "GET", headers: [] };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "URL",
          id: "url",
          placeholder: "Endpoint URL",
        },
        {
          type: "radio",
          label: "Method",
          id: "method",
          options: [
            { value: "GET", label: "GET" },
            { value: "PUT", label: "PUT" },
            { value: "POST", label: "POST" },
            { value: "DELETE", label: "DELETE" }
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "Headers",
          id: "headers",
          advanced: true
        },
        {
          type: "textarea",
          label: "Body",
          id: "body",
          placeholder: "Write body in JSON",
          advanced: true
        },
        {
          type: "input",
          label: "JSON Path",
          id: "jsonPath",
          placeholder: "JSON Path to retrieve from response",
          advanced: true
        }
      ],
    };

    super("REST Input", "restInput", "pandas_df_input", [], "inputs", apiIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import json", "import requests", "from jsonpath_ng import parse"];
  }

  public generateComponentCode({ config, outputName }): string {
    let bodyParam = '';
    if (config.body && config.body.trim() !== '') {
      // JSON body as a Python dictionary
      bodyParam = `json=${config.body.trim()}, `;
    }

    let headersParam = '';
    if (config.headers && config.headers.length > 0) {
      headersParam = 'headers={' + config.headers.map(header => `"${header.key}": "${header.value}"`).join(', ') + '}, ';
    }

    let jsonPathParam = '';
    if (config.jsonPath && config.jsonPath.trim() !== '') {
      jsonPathParam = `jsonpath_expr = parse('${config.jsonPath}')\nselected_data = [match.value for match in jsonpath_expr.find(data)] if jsonpath_expr.find(data) else []\n${outputName} = pd.DataFrame(selected_data).convert_dtypes() if selected_data else pd.DataFrame()\n`;
    } else {
      jsonPathParam = `${outputName} = pd.DataFrame([data]).convert_dtypes() if isinstance(data, dict) else pd.DataFrame(data).convert_dtypes()\n`;
    }

    const params = `${headersParam}${bodyParam}`;
    const trimmedParams = params.endsWith(', ') ? params.slice(0, -2) : params; // Remove trailing comma and space if present

    const code = `
import requests
from jsonpath_ng import parse
response = requests.request(
  method="${config.method}",
  url="${config.url}"${trimmedParams ? ', ' + trimmedParams : ''}
)
data = response.json()
${jsonPathParam}
`;
    return code;
  }
}
