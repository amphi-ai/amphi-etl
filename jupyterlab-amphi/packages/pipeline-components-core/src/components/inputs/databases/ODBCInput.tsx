import { databaseIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class ODBCInput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = {
            connectionString: "",
            queryMethod: "table",
            tableName: "",
            sqlQuery: "",
            autoCommit: true
        };
        const form = {
            fields: [
                {
                    type: "input",
                    label: "Connection String",
                    id: "connectionString",
                    placeholder: "Enter ODBC connection string",
                    tooltip: "Provide the full ODBC connection string for your database. Reference: https://github.com/mkleehammer/pyodbc/wiki/Connecting-to-databases",
                    connection: "ODBC",
                    advanced: true
                },
                {
                    type: "boolean",
                    label: "Auto Commit",
                    tooltip: "Setting autocommit True will cause the database to issue a commit after each SQL statement, otherwise database transactions will have to be explicity committed. As per the Python DB API, the default value is False (even though the ODBC default value is True). Typically, you will probably want to set autocommit True when creating a connection.",
                    id: "autoCommit",
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
                    type: "input",
                    label: "Table Name",
                    id: "tableName",
                    placeholder: "Enter table name",
                    condition: { queryMethod: "table" }
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
                }
            ],
        };
        const description = "Use ODBC Input to retrieve data from various databases using an ODBC connection string, along with either a table name or a custom SQL query."

        super("ODBC Input", "odbcInput", description, "pandas_df_input", [], "inputs.Databases", databaseIcon, defaultConfig, form);
    }

    public provideDependencies({ config }): string[] {
        return ['pyodbc'];
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "import pyodbc"];
    }

    public generateComponentCode({ config, outputName }): string {
        // Escape single quotes in the connection string
        const connectionString = config.connectionString.replace(/'/g, "\\'");
        const autoCommit = config.autoCommit;

        const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim()
            ? config.sqlQuery
            : `SELECT * FROM ${config.tableName}`;

        const code = `
# Connect to the database using ODBC
conn = pyodbc.connect(f"""${connectionString}""", autocommit=${autoCommit ? 'True' : 'False'})

# Execute SQL statement
try:
    ${outputName} = pd.read_sql(
        """
        ${sqlQuery}
        """,
        conn
    ).convert_dtypes()
finally:
    conn.close()
`;
        return code;
    }
}