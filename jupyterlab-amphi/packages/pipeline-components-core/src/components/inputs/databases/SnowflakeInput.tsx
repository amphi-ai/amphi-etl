
import { snowflakeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class SnowflakeInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { schema: "PUBLIC", tableName: "", queryMethod: "table" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Account",
          id: "account",
          placeholder: "Enter Account",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "database",
          connection: "Snowflake",
          placeholder: "Enter database name",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          connection: "Snowflake",
          inputType: "password",
          advanced: true
        },
        {
          type: "input",
          label: "Warehouse",
          id: "warehouse",
          placeholder: "Enter warehouse name",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Schema",
          id: "schema",
          connection: "Snowflake",
          placeholder: "Enter schema name",
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
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = '{{schema}}'`,
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
        },
        {
          type: "input",
          label: "Role (Optional)",
          id: "role",
          placeholder: "Role name",
          advanced: true
        }
      ],
    };
    const description = "Use Snowflake Input to retrieve data from Snowflake by specifying either a table name or a custom SQL query."

    super("Snowflake Input", "snowflakeInput", description, "pandas_df_input", [], "inputs.Databases", snowflakeIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('snowflake-sqlalchemy');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import urllib.parse", "from snowflake.sqlalchemy import URL"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    const connectionCode = `
# Connect to the Snowflake database
${connectionName} = sqlalchemy.create_engine(URL(
    account = '${config.account}',
    user = '${config.username}',
    password = urllib.parse.quote("${config.password}"),
    database = '${config.database}',
    schema = '${config.schema}',
    warehouse = '${config.warehouse}'
))
`;
    return connectionCode;
  }

  public generateComponentCode({ config, outputName }): string {
    const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName
    const tableReference = (config.schema && config.schema.toLowerCase() !== 'public')
      ? `"${config.schema}"."${config.tableName.value}"`
      : `"${config.tableName.value}"`;

    const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim()
      ? config.sqlQuery
      : `SELECT * FROM ${tableReference}`;

    const connectionCode = this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName })

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
