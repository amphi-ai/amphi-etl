
import { postgresIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class PostgresInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { host: "localhost", port: "5432", databaseName: "", username: "", password: "", schema: "public", tableName: "", queryMethod: "table" };
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
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = '{{schema}}';`,
          id: "tableName",
          placeholder: "Enter table name",
          condition: { queryMethod: "table" }
        },
        {
          type: "codeTextarea",
          label: "SQL Query",
          height: '450px',
          mode: "sql",
          placeholder: 'SELECT * FROM table_name',
          id: "sqlQuery",
          tooltip: 'Optional. By default the SQL query is: SELECT * FROM table_name_provided. If specified, the SQL Query is used.',
          condition: { queryMethod: "query" },
          advanced: true
        }
      ],
    };
    const description = "Use Postgres Input to retrieve data from Postgres by specifying either a table name or a custom SQL query."

    super("Postgres Input", "postgresInput", description, "pandas_df_input", [], "inputs.Databases", postgresIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('psycopg2-binary');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import psycopg2"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    let connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}`;
    const connectionCode = `
# Connect to the PostgreSQL database
${connectionName} = sqlalchemy.create_engine("${connectionString}")
`;
    return connectionCode;
  }

  public generateComponentCode({ config, outputName }): string {
    const uniqueEngineName = `${outputName}_Engine`;

    // Build table reference only if both schema and tableName exist
    const tableReference = config.schema && config.tableName?.value
      ? `"${config.schema}"."${config.tableName.value}"`
      : null;

    let sqlQuery: string;

    if (config.queryMethod === 'query' && config.sqlQuery) {
      try {
        const parsedQuery = JSON.parse(config.sqlQuery);
        sqlQuery = parsedQuery.code?.trim();

        // Only fall back to table reference if it exists
        if (!sqlQuery) {
          if (tableReference) {
            sqlQuery = `SELECT * FROM ${tableReference}`;
          } else {
            throw new Error('No SQL query provided and table reference is incomplete');
          }
        }
      } catch (e) {
        console.error("Failed to parse SQL query:", e);

        if (tableReference) {
          sqlQuery = `SELECT * FROM ${tableReference}`;
        } else {
          throw new Error('Invalid SQL query and no valid table reference available');
        }
      }
    } else {
      // Default to table query
      if (!tableReference) {
        throw new Error('Table reference is incomplete (missing schema or tableName)');
      }
      sqlQuery = `SELECT * FROM ${tableReference}`;
    }

    const connectionCode = this.generateDatabaseConnectionCode({
      config,
      connectionName: uniqueEngineName
    });

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
