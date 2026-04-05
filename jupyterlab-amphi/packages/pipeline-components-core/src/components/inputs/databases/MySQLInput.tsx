import { mySQLIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class MySQLInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFinputHost: "localhost",
		tsCFinputPort: "3306",
		tsCFinputDatabaseName: "",
		tsCFinputUserName: "",
		tsCFinputPassword: "",
		tsCFinputTableName: "",
		tsCFradioQueryMethod: "table"
		};
    const form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "tsCFinputHost",
          placeholder: "Enter database host",
          connection: 'Mysql',
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "tsCFinputPort",
          placeholder: "Enter database port",
          connection: 'Mysql',
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "tsCFinputDatabaseName",
          placeholder: "Enter database name",
          connection: 'Mysql',
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "tsCFinputUserName",
          placeholder: "Enter username",
          connection: "Mysql",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "tsCFinputPassword",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Mysql",
          advanced: true
        },
        {
          type: "radio",
          label: "Query Method",
          id: "tsCFradioQueryMethod",
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
          id: "tsCFinputTableName",
          placeholder: "Enter table name",
          condition: { tsCFradioQueryMethod: "table" }
        },
        {
          type: "codeTextarea",
          label: "SQL Query",
          height: '50px',
          mode: "sql",
          placeholder: 'SELECT * FROM table_name',
          id: "tsCFcodeTextareaSqlQuery",
          tooltip: 'Optional. By default the SQL query is: SELECT * FROM table_name_provided. If specified, the SQL Query is used.',
          advanced: true,
          condition: { tsCFradioQueryMethod: "query" }
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
    return ["import pandas as pd",
	"import sqlalchemy",
	"import pymysql"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    let connectionString = `mysql+pymysql://${config.tsCFinputUserName}:${config.tsCFinputPassword}@${config.tsCFinputHost}:${config.tsCFinputPort}/${config.tsCFinputDatabaseName}`;
    const connectionCode = `
# Connect to the MySQL database
${connectionName} = sqlalchemy.create_engine("${connectionString}")
`;
    return connectionCode;
  }

  public generateComponentCode({ config, outputName }): string {
    const uniqueEngineName = `${outputName}_Engine`;

    // Build table reference if tableName exists
    const tableReference = config.tsCFinputTableName?.value || null;

    let sqlQuery: string;

    if (config.tsCFradioQueryMethod === 'query' && config.tsCFcodeTextareaSqlQuery) {
      try {
        const parsedQuery = JSON.parse(config.tsCFcodeTextareaSqlQuery);
        sqlQuery = parsedQuery.code?.trim();

        // Only fall back to table reference if it exists
        if (!sqlQuery) {
          if (tableReference) {
            sqlQuery = `SELECT * FROM ${tableReference}`;
          } else {
            throw new Error('No SQL query provided and table name is missing');
          }
        }
      } catch (e) {
        console.error("Failed to parse SQL query:", e);

        if (tableReference) {
          sqlQuery = `SELECT * FROM ${tableReference}`;
        } else {
          throw new Error('Invalid SQL query and no valid table name available');
        }
      }
    } else {
      // Default to table query
      if (!tableReference) {
        throw new Error('Table name is missing');
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
