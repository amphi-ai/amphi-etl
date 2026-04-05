import { databaseIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class ODBCInput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = {
            tsCFselectODBCConnectionMethod : "dsn",			
            tsCFinputODBCConnectionString: "",
            tsCFinputDSN: "",
            tsCFradioQueryMethod: "table",
            tsCFinputTableName: "",
            tsCFcodeTextareaSqlQuery: "",
            tsCFinputUserName : "",
            tsCFinputPassword :"",			
            tsCFbooleanAutoCommit: true
        };
        const form = {
            fields: [
		{
          type: "select",
          label: "Connection Method",
          id: "tsCFselectODBCConnectionMethod",
		  options: [
            { value: "dsn", label: "DSN", tooltip:"Data Source Name"},
            { value: "conn_str", label: "Connexion String", tooltip:"Connexion String"}
          ],
          advanced: true
        },  
        {
          type: "input",
          label: "Connection String",
          id: "tsCFinputODBCConnectionString",
          placeholder: "Driver={PostgreSQL ODBC Driver(UNICODE)};Server=localhost;Port=5432;Database=test_dataviz;Uid=postgres;Pwd=MyAmazingPW123!;",
          tooltip: "Provide the full ODBC connection string for your database. Reference: https://github.com/mkleehammer/pyodbc/wiki/Connecting-to-databases",
          connection: "ODBC",
          condition: { tsCFselectODBCConnectionMethod : "conn_str" },
          advanced: true
        },
        {
          type: "input",
          label: "DSN",
          id: "tsCFinputDSN",
          placeholder: "Enter DSN",
          condition: { tsCFselectODBCConnectionMethod : "dsn" },
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "tsCFinputUserName",
          placeholder: "Enter username",
          condition: { tsCFselectODBCConnectionMethod : "dsn" },
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "tsCFinputPassword",
          placeholder: "Enter password",
          inputType: "password",
          condition: { tsCFselectODBCConnectionMethod : "dsn" },
          advanced: true
        },
        {
          type: "boolean",
          label: "Auto Commit",
          tooltip: "Setting autocommit True will cause the database to issue a commit after each SQL statement, otherwise database transactions will have to be explicity committed. As per the Python DB API, the default value is False (even though the ODBC default value is True). Typically, you will probably want to set autocommit True when creating a connection.",
          id: "tsCFbooleanAutoCommit",
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
          type: "input",
          label: "Table Name",
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
          condition: { tsCFradioQueryMethod: "query" },
          advanced: true
        },
        {
          type: "info",
          id: "tsCFinfoTyping",
          text: "⚠️Take into consideration types can be badly retrieved.",
          advanced: true
        },
            ],
        };
        const description = "Use ODBC Input to retrieve data from various databases using an ODBC connection string, along with either a table name or a custom SQL query."

        super("ODBC Input", "odbcInput", description, "pandas_df_input", [], "inputs.Databases", databaseIcon, defaultConfig, form);
    }

    public provideDependencies({ config }): string[] {
        return ['pyodbc'];
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd",
		"import pyodbc",
		"from typing import Optional"];
    }
	
public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsODBCInputQueryFunction = `
def py_fn_odbc_input_query(
    py_arg_connection_mode: str,
    py_arg_connection_string: Optional[str] = None,
    py_arg_dsn_name: Optional[str] = None,
    py_arg_user: Optional[str] = None,
    py_arg_password: Optional[str] = None,
    py_arg_autocommit: bool = True,
    py_arg_query_method: str = "query",
    py_arg_sql_query: Optional[str] = None,
    py_arg_table_name: Optional[str] = None
) -> pd.DataFrame:
    """
    Execute a SQL query or read a full table via ODBC and return a pandas DataFrame.
 
    Notes:
    - For Amphi, the connection string must be built with an f-string, for example:
      conn_str = f"Driver={{PostgreSQL ODBC Driver(UNICODE)}};Server=localhost;Port=5432;Database=test_dataviz;Uid=postgres;Pwd=MyAmazingPW123!;"
    - py_arg_connection_mode: "conn_str" or "dsn"
    - py_arg_query_method: "query" or "table"
    """
 
    # Build connection string
    if py_arg_connection_mode == "conn_str":
        if not py_arg_connection_string:
            raise ValueError("Connection String is required when Connection Mode='conn_str'")
        py_var_conn_str = py_arg_connection_string
 
    elif py_arg_connection_mode == "dsn":
        if not py_arg_dsn_name:
            raise ValueError("DSN is required when Connection Mode='dsn'")
        py_var_conn_parts = [f"DSN={py_arg_dsn_name}"]
        if py_arg_user:
            py_var_conn_parts.append(f"UID={py_arg_user}")
        if py_arg_password:
            py_var_conn_parts.append(f"PWD={py_arg_password}")
        py_var_conn_str = ";".join(py_var_conn_parts) + ";"
 
    else:
        raise ValueError("py_arg_connection_mode must be 'conn_str' or 'dsn'")
 
    # Build SQL
    if py_arg_query_method == "query":
        if not py_arg_sql_query:
            raise ValueError("SQL query is required when Query Method='query'")
        py_var_query = py_arg_sql_query
 
    elif py_arg_query_method == "table":
        if not py_arg_table_name:
            raise ValueError("Table Name is required when Query Method='table'")
        py_var_query = f"SELECT * FROM {py_arg_table_name}"
 
    else:
        raise ValueError("py_arg_query_method must be 'query' or 'table'")
 
    py_var_conn = None
    try:
        py_var_conn = pyodbc.connect(py_var_conn_str, autocommit=py_arg_autocommit)
        py_df_result = pd.read_sql(py_var_query, py_var_conn).convert_dtypes()
        return py_df_result
    finally:
        if py_var_conn is not None:
            py_var_conn.close()
	    `;
    return [tsODBCInputQueryFunction];
  }
  
  
    public generateComponentCode({ config, outputName }): string {
//input

    let tsConstDSN = 'None';
    if (config.tsCFinputDSN && config.tsCFinputDSN.trim() !== '' && config.tsCFselectODBCConnectionMethod =='dsn'
	) {
      tsConstDSN = '"' + config.tsCFinputDSN+ '"';
    }
	let tsConstPassword = 'None';
    if (config.tsCFinputUserName && config.tsCFinputPassword.trim() !== '' && config.tsCFselectODBCConnectionMethod =='dsn'
	) {
      tsConstPassword = '"' + config.tsCFinputPassword+ '"';
    }
	let tsConstUserName = 'None';
    if (config.tsCFinputUserName && config.tsCFinputUserName.trim() !== '' && config.tsCFselectODBCConnectionMethod =='dsn'
	) {
      tsConstUserName = '"' + config.tsCFinputUserName+ '"';
    }
	let tsConstTableName = 'None';
    if (config.tsCFinputTableName && config.tsCFinputTableName.trim() !== '' && config.tsCFradioQueryMethod =='table'
	) {
      tsConstTableName = '"' + config.tsCFinputTableName+ '"';
    }

	let tsConstConnectionString = 'None';
    if (config.tsCFinputODBCConnectionString && config.tsCFinputODBCConnectionString.trim() !== '' && config.tsCFselectODBCConnectionMethod =='conn_str'
	) {
		
      //f because of curly brace around the driver in connection string. we also need to escape it so double curly brace.
      tsConstConnectionString = 'f"' + config.tsCFinputODBCConnectionString.replace(/'/g, "\\'").replace("{", "{{").replace("}", "}}")+ '"';
    } 
		
			//radio
	let tsConstQueryMethod = 'None';
    if (config.tsCFradioQueryMethod && config.tsCFradioQueryMethod.trim() !== ''
	) {
      tsConstQueryMethod = '"' + config.tsCFradioQueryMethod+ '"';
    }
	
			//select
	let tsConstConnectionMethod = 'None';
    if (config.tsCFselectODBCConnectionMethod && config.tsCFselectODBCConnectionMethod.trim() !== ''
	) {
      tsConstConnectionMethod = '"' + config.tsCFselectODBCConnectionMethod+ '"';
    }

			//boolean
	let tsConstAutoCommit = config.tsCFbooleanAutoCommit ? 'True' : 'False';

			//codeTextarea

	let tsConstSqlQuery = 'None';
    if (config.tsCFcodeTextareaSqlQuery && config.tsCFcodeTextareaSqlQuery.trim() !== '' && config.tsCFradioQueryMethod =='query'
	) {
        const tsConstParsedQueryStep1 = JSON.parse(config.tsCFcodeTextareaSqlQuery );
        const tsConstParsedQuery = tsConstParsedQueryStep1.code?.trim();	
      tsConstSqlQuery = '"' + tsConstParsedQuery+ '"';
    }
	
    const code = `
${outputName} = py_fn_odbc_input_query(
    py_arg_connection_mode=${tsConstConnectionMethod},
    py_arg_connection_string = ${tsConstConnectionString},
    py_arg_dsn_name = ${tsConstDSN},
    py_arg_user = ${tsConstUserName},
    py_arg_password = ${tsConstPassword},
    py_arg_autocommit = ${tsConstAutoCommit},
    py_arg_query_method = ${tsConstQueryMethod},
    py_arg_sql_query = ${tsConstSqlQuery},
    py_arg_table_name = ${tsConstTableName}
    )
`;

        return code;
    }
}