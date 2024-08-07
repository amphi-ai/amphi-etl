
import { postgresIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class PostgresInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { host: "localhost", port: "5432", databaseName: "", username: "", password: "", schema: "public", tableName: "" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter database host",
          connection: "Postgres",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter database port",
          connection: "Postgres",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter database name",
          connection: "Postgres",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Postgres",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          connection: "Postgres",
          inputType: "password",
          advanced: true
        },
        {
          type: "input",
          label: "Schema",
          id: "schema",
          placeholder: "Enter schema name",
        },
        {
          type: "input",
          label: "Table Name",
          id: "tableName",
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
          advanced: true
        }
      ],
    };

    super("Postgres Input", "postgresInput", "pandas_df_input", [], "inputs.Databases", postgresIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('psycopg2-binary');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import psycopg2"];
  }

  public generateComponentCode({ config, outputName }): string {
    let connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}`;
    const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName

    const tableReference = (config.schema && config.schema.toLowerCase() !== 'public')
    ? `${config.schema}.${config.tableName}`
    : config.tableName;

    const sqlQuery = config.sqlQuery && config.sqlQuery.trim()
      ? config.sqlQuery
      : `SELECT * FROM ${tableReference}`;

    const code = `
# Connect to the PostgreSQL database
${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")

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
