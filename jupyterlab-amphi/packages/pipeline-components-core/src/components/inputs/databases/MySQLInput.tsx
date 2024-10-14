
import { mySQLIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class MySQLInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { host: "localhost", port: "3306", databaseName: "", username: "", password: "", tableName: "", queryMethod: "table" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter database host",
          connection: 'Mysql',
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter database port",
          connection: 'Mysql',
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter database name",
          connection: 'Mysql',
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Mysql",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Mysql",
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
          query: `SHOW TABLES;`,
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
          advanced: true,
          condition: { queryMethod: "query" }
        }
      ],
    };
    const description = "Use MySQL Input to retrieve data from MySQL by specifying either a table name or a custom SQL query."

    super("MySQL Input", "mySQLInput", description, "pandas_df_input", [], "inputs.Databases", mySQLIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('pymysql');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import pymysql"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    let connectionString = `mysql+pymysql://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}`;
    const connectionCode = `
# Connect to the MySQL database
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
