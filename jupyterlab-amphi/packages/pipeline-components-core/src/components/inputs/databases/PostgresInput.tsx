
import { postgresIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; 

export class PostgresInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { dbOptions: { host: "localhost", port: "5432", databaseName: "", username: "", password: "", schema: "public", tableName: "" } };
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
          label: "Schema",
          id: "dbOptions.schema",
          placeholder: "Enter schema name",
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
        }
      ],
    };

    super("Postgres Input", "postgresInput", "pandas_df_input", [], "input", postgresIcon, defaultConfig, form);
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
    let connectionString = `postgresql://${config.dbOptions.username}:${config.dbOptions.password}@${config.dbOptions.host}:${config.dbOptions.port}/${config.dbOptions.databaseName}`;
    const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName

    const tableReference = (config.dbOptions.schema && config.dbOptions.schema.toLowerCase() !== 'public')
    ? `${config.dbOptions.schema}.${config.dbOptions.tableName}`
    : config.dbOptions.tableName;

    const sqlQuery = config.dbOptions.sqlQuery && config.dbOptions.sqlQuery.trim()
        ? config.dbOptions.sqlQuery
        : `SELECT * FROM ${tableReference}`;

    const code = `
# Connect to the PostgreSQL database
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
