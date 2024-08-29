import { apiIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class RestOutput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = { method: "POST", recordStructure: "records", headers: [] };
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
                        { value: "POST", label: "POST" },
                        { value: "PUT", label: "PUT" }
                    ]
                },
                {
                    type: "keyvalue",
                    label: "Headers",
                    id: "headers",
                    advanced: true
                },
                {
                    type: "select",
                    label: "Body Structure",
                    id: "recordStructure",
                    options: [
                        { value: "records", label: "Each row is converted to a JSON record as body (multiple requests)." },
                        { value: "list", label: "Each row is added to a JSON list as body (single request)." },
                        { value: "document", label: "Each row is added to a JSON document as body (single request)." }
                    ],
                    advanced: true
                },
                {
                    type: "codeTextarea",
                    label: "Record Template",
                    height: '250px',
                    mode: "json",
                    id: "recordTemplate",
                    tooltip: "Use {{column_name}} for dynamic values from the input dataframe.",
                    advanced: true
                }
            ],
        };

        super("REST Output", "restOutput", "no desc", "pandas_df_output", [], "outputs", apiIcon, defaultConfig, form);
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "import json", "import requests"];
    }

    public generateComponentCode({ config, inputName }): string {
        const headersParam = config.headers && config.headers.length > 0
            ? 'headers={' + config.headers.map(header => `"${header.key}": "${header.value}"`).join(', ') + '}, '
            : '';

        const recordTemplate = config.recordTemplate ? config.recordTemplate : '{}';

        const replaceVariables = (template: string, inputName: string) => {
            return template.replace(/{{(\w+)}}/g, (_, columnName) => `\${row['${columnName}']}`);
        };

        const generatePythonCode = () => {
            let bodyCode: string;
            switch (config.recordStructure) {
                case 'records':
                    bodyCode = `
for index, row in ${inputName}.iterrows():
    data = ${replaceVariables(recordTemplate, 'row')}
    response = requests.${config.method.toLowerCase()}("${config.url}", json=data, ${headersParam})
    print(response.json())
`;
                    break;
                case 'list':
                    bodyCode = `
data = [${replaceVariables(recordTemplate, inputName)} for index, row in ${inputName}.iterrows()]
response = requests.${config.method.toLowerCase()}("${config.url}", json=data, ${headersParam})
print(response.json())
`;
                    break;
                case 'document':
                    bodyCode = `
data = ${inputName}.to_dict(orient='records')
response = requests.${config.method.toLowerCase()}("${config.url}", json=data, ${headersParam})
print(response.json())
`;
                    break;
                default:
                    throw new Error('Invalid record structure');
            }

            return `
${bodyCode}
        `;
        };

        return generatePythonCode();
    }
}