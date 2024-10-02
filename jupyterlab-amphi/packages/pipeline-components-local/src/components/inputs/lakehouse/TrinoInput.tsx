import { trinoIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';




export class TrinoInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { host: "localhost", port: "8082",catalogs : "", schemaName: "", username: "", password: "", tableName: "" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter Trino host",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter Trino port",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Catalogs",
          id: "catalogs",
          placeholder: "Enter Trino Catalogs",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Schema Name",
          id: "schemaName",
          placeholder: "Enter Trino schema name",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Trino",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Trino",
          advanced: true
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

    super("Trino Input", "trinoInput", "no desc", "pandas_df_input", [], "inputs.Lakehouse", trinoIcon, defaultConfig, form);
  }
  
    public provideImports({config}): string[] {
      return ["import pandas as pd", "import sqlalchemy", "import trino"];
    }  

    public generateComponentCode({ config, outputName }): string {
      let connectionString = `trino.dbapi.connect(
                                      host='${config.host}',
                                      port=${config.port},
                                      user='${config.username}',
                                      catalog='${config.catalogs}',
                                      schema='${config.schemaName}')`;
      const sqlQuery = config.sqlQuery && config.sqlQuery.trim() ? config.sqlQuery : `SELECT * FROM ${config.tableName}`;
      const code = `

conn = ${connectionString}

# Execute SQL statement
try:
    cursor = conn.cursor() # Connect to the Trino database
    cursor.execute('${sqlQuery}')
    ${outputName} = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])
finally:
    cursor.close()
`;
      return code;
    }
  }