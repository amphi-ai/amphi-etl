import { icebergIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';


export class IcebergInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { host: "localhost", port: "3306", databaseName: "", username: "", password: "", tableName: "" };
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

    super("Iceberg Input", "icebergInput", "pandas_df_input", [], "inputs", icebergIcon, defaultConfig, form);
  }
  
    public provideImports({config}): string[] {
      return ["import pandas as pd", "import sqlalchemy", "import pymysql"];
    }  

    public generateComponentCode({ config, outputName }): string {
      let connectionString = `mysql+pymysql://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}`;
      const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName
      const sqlQuery = config.sqlQuery && config.sqlQuery.trim() ? config.sqlQuery : `SELECT * FROM ${config.tableName}`;
      const code = `
# Connect to the MySQL database
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