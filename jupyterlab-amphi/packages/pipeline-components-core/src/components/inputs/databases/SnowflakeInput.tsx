import { snowflakeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class SnowflakeInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFinputSchema: "PUBLIC",
		tsCFtableTableName: "",
		tsCFradioQueryMethod: "table" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Account",
          id: "tsCFinputAccount",
          placeholder: "Enter Account",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "tsCFinputDatabase",
          connection: "Snowflake",
          placeholder: "Enter database name",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "tsCFinputUserName",
          placeholder: "Enter username",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "tsCFinputPassword",
          placeholder: "Enter password",
          connection: "Snowflake",
          inputType: "password",
          advanced: true
        },
        {
          type: "input",
          label: "Warehouse",
          id: "tsCFinputWarehouse",
          placeholder: "Enter warehouse name",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Schema",
          id: "tsCFinputSchema",
          connection: "Snowflake",
          placeholder: "Enter schema name",
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
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = '{{tsCFinputSchema}}'`,
          id: "tsCFtableTableName",
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
          condition: { tsCFradioQueryMethod: "query" },
          advanced: true
        },
		//not used??
        {
          type: "input",
          label: "Role (Optional)",
          id: "tsCFinputRole",
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
    return [
	"import pandas as pd",
	"import sqlalchemy",
	"import urllib.parse",
	"from snowflake.sqlalchemy import URL"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    const connectionCode = `
# Connect to the Snowflake database
${connectionName} = sqlalchemy.create_engine(URL(
    account = '${config.tsCFinputAccount}',
    user = '${config.tsCFinputUserName}',
    password = urllib.parse.quote("${config.tsCFinputPassword}"),
    database = '${config.tsCFinputDatabase}',
    schema = '${config.tsCFinputSchema}',
    warehouse = '${config.tsCFinputWarehouse}'
))
`;
    return connectionCode;
  }

  public generateComponentCode({ config, outputName }): string {
     const uniqueEngineName = `${outputName}_Engine`;

    // Build table reference with optional schema
    const tableReference = config.tsCFtableTableName?.value
      ? (config.tsCFinputSchema && config.tsCFinputSchema.toLowerCase() !== 'public')
        ? `"${config.tsCFinputSchema}"."${config.tsCFtableTableName.value}"`
        : `"${config.tsCFtableTableName.value}"`
      : null;

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
