import { sqlServerIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class SqlServerInput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = { dbOptions: { host: "localhost", port: "1433", databaseName: "", username: "", password: "", tableName: "" } };
        const form = {
            fields: [
                {
                    type: "input",
                    label: "Host",
                    id: "dbOptions.host",
                    placeholder: "Enter database host",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Port",
                    id: "dbOptions.port",
                    placeholder: "Enter database port",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Database Name",
                    id: "dbOptions.databaseName",
                    placeholder: "Enter database name",
                },
                {
                    type: "input",
                    label: "Username",
                    id: "dbOptions.username",
                    placeholder: "Enter username",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Password",
                    id: "dbOptions.password",
                    placeholder: "Enter password",
                    inputType: "password",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Table Name",
                    id: "dbOptions.tableName",
                    placeholder: "Enter table name",
                },
                {
                    type: "codeTextarea",
                    label: "SQL Query",
                    height: '50px',
                    mode: "sql",
                    placeholder: 'SELECT * FROM table_name',
                    id: "dbOptions.sqlQuery",
                    tooltip: 'Optional. By default the SQL query is: SELECT * FROM table_name_provided. If specified, the SQL Query is used.',
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

        super("SQL Server Input", "sqlServerInput", "pandas_df_input", [], "input", sqlServerIcon, defaultConfig, form);
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "import sqlalchemy", "import pyodbc"];
    }

    public generateComponentCode({ config, outputName }): string {
        let connectionString = `mssql+pyodbc://${config.dbOptions.username}:${config.dbOptions.password}@${config.dbOptions.host}:${config.dbOptions.port}/${config.dbOptions.databaseName}?driver=ODBC+Driver+17+for+SQL+Server`;
        const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName
        const sqlQuery = config.dbOptions.sqlQuery && config.dbOptions.sqlQuery.trim() ? config.dbOptions.sqlQuery : `SELECT * FROM ${config.dbOptions.tableName}`;
        const code = `
# Connect to the SQL Server database
${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
with ${uniqueEngineName}.connect() as conn:
    ${outputName} = pd.read_sql(
        """${sqlQuery}""",
        con=conn.connection
    ).convert_dtypes()
`;
        return code;
    }
}
