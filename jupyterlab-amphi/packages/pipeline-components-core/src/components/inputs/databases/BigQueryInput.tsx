import { bigQueryIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class BigQueryInput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = { dataset: "", tableName: "", queryMethod: "table" };
        const form = {
            fields: [
                {
                    type: "select",
                    label: "Connection Method",
                    id: "connectionMethod",
                    options: [
                        { value: "service_account", label: "Service Account", tooltip: "Use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY variables, using an Env. Variable File is recommended." },
                        { value: "storage_options", label: "Pass directly (storage_options)", tooltip: "You can pass credentials using the storage_options parameter. Using Environment Variables for this method is also recommended." }
                    ],
                    condition: { fileLocation: "s3" },
                    connection: "AWS",
                    ignoreConnection: true,
                    advanced: true
                },
                {
                    type: "input",
                    label: "Project ID",
                    id: "projectId",
                    placeholder: "Enter Project ID",
                    connection: "BigQuery",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Dataset",
                    id: "dataset",
                    placeholder: "Enter Dataset",
                    connection: "BigQuery",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Table Name",
                    id: "tableName",
                    placeholder: "Enter Table Name",
                    condition: { queryMethod: "table" },
                    advanced: true
                },
                {
                    type: "radio",
                    label: "Query Method",
                    id: "queryMethod",
                    tooltip: "Select whether you want to specify the table name to retrieve data or use a custom SQL query for greater flexibility.",
                    options: [
                        { value: "table", label: "Table Name" },
                        { value: "query", label: "SQL Query" }
                    ],
                    advanced: true
                },
                {
                    type: "codeTextarea",
                    label: "SQL Query",
                    height: '50px',
                    mode: "sql",
                    placeholder: 'SELECT * FROM dataset.table_name',
                    id: "sqlQuery",
                    tooltip: 'Optional. By default, the SQL query is: SELECT * FROM dataset.table_name_provided. If specified, the SQL Query is used.',
                    condition: { queryMethod: "query" },
                    advanced: true
                }
            ]
        };
        const description = "Use BigQuery Input to retrieve data from Google BigQuery by specifying either a table name or a custom SQL query."

        super("BigQuery Input", "bigQueryInput", description, "pandas_df_input", [], "inputs.Databases", bigQueryIcon, defaultConfig, form);
    }

    public provideDependencies({ config }): string[] {
        let deps: string[] = [];
        deps.push('pandas-gbq');
        return deps;
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "import pandas_gbq"];
    }

    public generateComponentCode({ config, outputName }): string {
        const tableReference = `${config.dataset}.${config.tableName}`;
        const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim()
            ? config.sqlQuery
            : `SELECT * FROM ${tableReference}`;

        const code = `
# Connect to BigQuery and execute SQL statement
try:
    ${outputName} = pandas_gbq.read_gbq(
        """${sqlQuery}""",
        project_id="${config.projectId}"
    ).convert_dtypes()
except Exception as e:
    print(f"Error fetching data from BigQuery: {e}")
`;
        return code;
    }
}
