import { oracleIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class OracleInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { host: "localhost", port: "1521", databaseName: "", username: "", password: "", tableName: "", queryMethod: "table" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter database host",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter database port",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter database name",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Oracle DB",
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
          condition: { queryMethod: "table" },

          placeholder: "Enter table name",
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
          type: "input",
          label: "Oracle Client Path (Optional)",
          tooltip: "You might need to specify a different Oracle client path than the default one. To do this, use the option to point to the directory of the desired Oracle client.",
          id: "oracleClient",
          placeholder: "Specify oracle client path",
          advanced: true
        }
      ],
    };

    super("Oracle Input", "oracleInput", "pandas_df_input", [], "inputs.Databases", oracleIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import cx_Oracle"];
  }

  public generateComponentCode({ config, outputName }): string {
    let connectionString = `oracle+cx_oracle://${config.username}:${config.password}@${config.host}:${config.port}/?service_name=${config.databaseName}`;
    const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName
    
    const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim() 
    ? config.sqlQuery 
    : `SELECT * FROM ${config.tableName}`;

    // Initialize the Oracle client if oracleClient is provided
    const oracleClientInitialization = config.oracleClient && config.oracleClient.trim()
      ? `cx_Oracle.init_oracle_client(lib_dir="${config.oracleClient}")\n`
      : "";

    const code = `
# Connect to the Oracle database

${oracleClientInitialization}${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")

# Execute SQL statement
try:
    with ${uniqueEngineName}.connect() as conn:
        ${outputName} = pd.read_sql(
            """${sqlQuery}""",
            con=conn.connection
        ).convert_dtypes()
finally:
    ${uniqueEngineName}.dispose()
`;
    return code;
  }
}
