import { sqlServerIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class SqlServerInput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = { host: "localhost", port: "1433", databaseName: "", username: "", password: "", tableName: "", queryMethod: "table" };
        const form = {
            fields: [
                {
                    type: "input",
                    label: "Host",
                    id: "host",
                    placeholder: "Enter database host",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Port",
                    id: "port",
                    placeholder: "Enter database port",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Database Name",
                    id: "databaseName",
                    placeholder: "Enter database name",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Username",
                    id: "username",
                    placeholder: "Enter username",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Password",
                    id: "password",
                    placeholder: "Enter password",
                    connection: "SQL Server",
                    inputType: "password",
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
                    type: "table",
                    label: "Table Name",
                    query: `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE';`,
                    id: "tableName",
                    condition: { queryMethod: "table" },
                    placeholder: "Enter table name"
                },
                {
                    type: "codeTextarea",
                    label: "SQL Query",
                    height: '50px',
                    mode: "sql",
                    placeholder: 'SELECT * FROM table_name',
                    id: "sqlQuery",
                    tooltip: 'Optional. By default the SQL query is: SELECT * FROM table_name_provided. If specified, the SQL Query is used.',
                    condition: { queryMethod: "query" },
                    advanced: true
                },
                {
                    type: "info",
                    label: "Drivers installation",
                    id: "driversInstallation",
                    text: "You may need to install additional drivers on your machine for this component to function. /n For Mac you need to install 'brew install unixodbc'",
                    advanced: true
                },
            ],
        };
        const description = "Use SQL Server Input to retrieve data from SQL Server by specifying either a table name or a custom SQL query."

        super("SQL Server Input", "sqlServerInput", description, "pandas_df_input", [], "inputs.Databases", sqlServerIcon, defaultConfig, form);
    }

    public provideDependencies({ config }): string[] {
        let deps: string[] = [];
        deps.push('pyodbc');
        return deps;
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "import sqlalchemy", "import pyodbc"];
    }

    public generateDatabaseConnectionCode({ config, connectionName }): string {
        let connectionString = `mssql+pyodbc://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}?driver=ODBC+Driver+17+for+SQL+Server`;
        const connectionCode = `
# Connect to the SQL Server database
${connectionName} = sqlalchemy.create_engine("${connectionString}")
`;
        return connectionCode;
    }

    public generateComponentCode({ config, outputName }): string {
        const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName

        const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim()
            ? config.sqlQuery
            : `SELECT * FROM ${config.tableName.value}`;

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
            con=conn.connection
        ).convert_dtypes()
finally:
    ${uniqueEngineName}.dispose()
`;
        return code;
    }
}
