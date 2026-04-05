import { trinoIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class TrinoInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
	tsCFinputHost: "localhost",
	tsCFinputPort: "8082",
	tsCFinputCatalogs : "",
	tsCFinputSchemaName: "",
	tsCFinputUserName: "",
	tsCFinputPassword: "",
	tsCFinputTableName: ""
	};
    const form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "tsCFinputHost",
          placeholder: "Enter Trino host",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "tsCFinputPort",
          placeholder: "Enter Trino port",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Catalogs",
          id: "tsCFinputCatalogs",
          placeholder: "Enter Trino Catalogs",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Schema Name",
          id: "tsCFinputSchemaName",
          placeholder: "Enter Trino schema name",
          connection: 'Trino',
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "tsCFinputUserName",
          placeholder: "Enter username",
          connection: "Trino",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "tsCFinputPassword",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Trino",
          advanced: true
        },
        {
          type: "input",
          label: "Table Name",
          id: "tsCFinputTableName",
          placeholder: "Enter table name",
        },
        {
          type: "codeTextarea",
          label: "SQL Query",
          height: '50px',
          mode: "sql",
          placeholder: 'SELECT * FROM table_name',
          id: "tsCFcodeTextareaSqlQuery",
          tooltip: 'Optional. By default the SQL query is: SELECT * FROM table_name_provided. If specified, the SQL Query is used.',
          advanced: true
        }
      ],
    };

    super("Trino Input", "trinoInput", "no desc", "pandas_df_input", [], "inputs.Lakehouse", trinoIcon, defaultConfig, form);
  }
  
    public provideImports({config}): string[] {
      return ["import pandas as pd",
	  "import sqlalchemy",
	  "import trino"];
    }  

    public generateComponentCode({ config, outputName }): string {
      let connectionString = `trino.dbapi.connect(
                                      host='${config.tsCFinputHost}',
                                      port=${config.tsCFinputPort},
                                      user='${config.tsCFinputUserName}',
                                      catalog='${config.tsCFinputCatalogs}',
                                      schema='${config.tsCFinputSchemaName}')`;
      const sqlQuery = config.tsCFcodeTextareaSqlQuery && config.tsCFcodeTextareaSqlQuery.trim() ? config.tsCFcodeTextareaSqlQuery : `SELECT * FROM ${config.tsCFinputTableName}`;
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