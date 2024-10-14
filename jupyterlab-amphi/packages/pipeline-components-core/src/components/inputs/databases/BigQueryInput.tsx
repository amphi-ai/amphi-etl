import { bigQueryIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

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
                        { value: "service_account", label: "Service Account", tooltip: "Use a service account JSON key file for authentication." },
                        { value: "prompt", label: "Login via browser", tooltip: "You will be prompted to login via the browser." }
                    ],
                    connection: "Google Cloud Platform",
                    ignoreConnection: true,
                    advanced: true
                },
                {
                    type: "file",
                    label: "Service Account Key",
                    id: "filePath",
                    placeholder: "Type file name",
                    validation: "\\.(json)$",
                    validationMessage: "This field expects a file with a .json extension such as your-service-account-file.json.",
                    advanced: true,
                    connection: "Google Cloud Platform",
                    condition: { connectionMethod: "service_account" }
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
        deps.push('sqlalchemy-bigquery');
        deps.push('pandas');
        return deps;
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "from sqlalchemy.engine import create_engine"];
    }

    public generateDatabaseConnectionCode({ config, connectionName }): string {
        const connectionString = `bigquery://${config.projectId}`;
        let connectionCode = `
# Connect to the BigQuery database using SQLAlchemy
`;

        if (config.connectionMethod === 'application_default') {
            connectionCode += `
${connectionName} = sqlalchemy.create_engine("${connectionString}")
`;
        } else if (config.connectionMethod === 'service_account') {
            connectionCode += `
${connectionName} = sqlalchemy.create_engine("${connectionString}", credentials_path='${config.filePath}')
`;
        } else {
            throw new Error("Unsupported connection method: " + config.connectionMethod);
        }

        return connectionCode;
    }

    public generateComponentCode({ config, outputName }): string {
        const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName

        const tableReference = `${config.dataset}.${config.tableName}`;
        const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim()
            ? config.sqlQuery
            : `SELECT * FROM ${tableReference}`;

        const connectionCode = this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName });

        const code = `
${connectionCode}

# Execute SQL statement
try:
    with ${uniqueEngineName}.connect() as conn:
        ${outputName} = pd.read_sql(
            """
            ${sqlQuery}
            """,
            con=conn
        ).convert_dtypes()
finally:
    ${uniqueEngineName}.dispose()
`;
        return code;
    }
}
