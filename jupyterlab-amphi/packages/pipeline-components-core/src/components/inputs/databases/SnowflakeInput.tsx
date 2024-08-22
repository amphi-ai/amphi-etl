
import { snowflakeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class SnowflakeInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { schema: "public", tableName: "", queryMethod: "table" };
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
          advanced: true
        },
        {
          type: "input",
          label: "Schema",
          id: "schema",
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

    super("Snowflake Input", "snowflakeInput", "pandas_df_input", [], "inputs.Cloud Warehouses", snowflakeIcon, defaultConfig, form);
  }



  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('snowflake-sqlalchemy');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import urllib.parse", "from snowflake.sqlalchemy import URL"];
  }

  public generateComponentCode({ config, outputName }): string {
    const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName
    const tableReference = (config.schema && config.schema.toLowerCase() !== 'public')
      ? `${config.schema}.${config.tableName}`
      : config.tableName;

      const sqlQuery = config.queryMethod === 'query' && config.sqlQuery && config.sqlQuery.trim() 
      ? config.sqlQuery 
      : `SELECT * FROM ${tableReference}`;

    const code = `
# Connect to the Snowflake database
${uniqueEngineName} = sqlalchemy.create_engine(URL(
    account = '${config.account}',
    user = '${config.username}',
    password = urllib.parse.quote("${config.password}"),
    database = '${config.database}',
    schema = '${config.schema}',
    warehouse = '${config.warehouse}'
))

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
