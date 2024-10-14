import { oracleIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class OracleOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      host: "localhost",
      port: "1521",
      databaseName: "",
      schema: "",
      username: "",
      password: "",
      tableName: "",
      ifTableExists: "fail",
      mode: "insert",
      dbapi: "oracledb",
      oracleClient: ""
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter database host",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter database port",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter database name",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Schema",
          id: "schema",
          placeholder: "Enter schema name",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "table",
          label: "Table Name",
          query: `SELECT table_name FROM user_tables;`,
          id: "tableName",
          placeholder: "Enter table name"
        },
        {
          type: "radio",
          label: "If Table Exists",
          id: "ifTableExists",
          options: [
            { value: "fail", label: "Fail" },
            { value: "replace", label: "Replace" },
            { value: "append", label: "Append" }
          ],
          advanced: true
        },
        {
          type: "radio",
          label: "Mode",
          id: "mode",
          options: [
            { value: "insert", label: "INSERT" }
          ],
          advanced: true
        },
        {
          type: "dataMapping",
          label: "Mapping",
          id: "mapping",
          tooltip: "By default, the mapping is inferred from the input data. By specifying a schema, you override the incoming schema.",
          outputType: "relationalDatabase",
          imports: ["cx_Oracle", "oracledb"],
          drivers: "oracle",
          query: "DESCRIBE {{table}}",
          typeOptions: [
            { value: "VARCHAR2", label: "VARCHAR2" },
            { value: "NUMBER", label: "NUMBER" },
            { value: "DATE", label: "DATE" },
            { value: "TIMESTAMP", label: "TIMESTAMP" },
            { value: "CHAR", label: "CHAR" },
            { value: "NCHAR", label: "NCHAR" },
            { value: "NVARCHAR2", label: "NVARCHAR2" },
            { value: "CLOB", label: "CLOB" },
            { value: "NCLOB", label: "NCLOB" },
            { value: "BLOB", label: "BLOB" },
            { value: "BFILE", label: "BFILE" },
            { value: "RAW", label: "RAW" },
            { value: "LONG RAW", label: "LONG RAW" },
            { value: "LONG", label: "LONG" },
            { value: "XMLTYPE", label: "XMLTYPE" },
            { value: "ROWID", label: "ROWID" },
            { value: "UROWID", label: "UROWID" },
            { value: "FLOAT", label: "FLOAT" },
            { value: "BINARY_FLOAT", label: "BINARY_FLOAT" },
            { value: "BINARY_DOUBLE", label: "BINARY_DOUBLE" }
          ],
          advanced: true
        },
        {
          type: "input",
          label: "Oracle Client Path (Optional)",
          tooltip: "Specify the directory of the desired Oracle client if needed.",
          id: "oracleClient",
          placeholder: "Specify oracle client path",
          advanced: true
        },
        {
          type: "select",
          label: "Database API (DBAPI)",
          id: "dbapi",
          options: [
            { value: "cx_oracle", label: "cx-Oracle" },
            { value: "oracledb", label: "python-oracledb" }
          ],
          advanced: true
        }
      ]
    };

    const description = "Use Oracle Output to insert data into an Oracle database table by specifying a data mapping between the incoming data and the existing table schema.";

    super("Oracle Output", "oracleOutput", description, "pandas_df_output", [], "outputs.Databases", oracleIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    if (config.dbapi === 'cx_oracle') {
      deps.push("cx_Oracle");
    } else if (config.dbapi === 'oracledb') {
      deps.push("oracledb");
    }
    return deps;
  }

  public provideImports({ config }): string[] {
    const imports = ["import pandas as pd", "import sqlalchemy"];
    if (config.dbapi === 'cx_oracle') {
      imports.push("import cx_Oracle");
    } else if (config.dbapi === 'oracledb') {
      imports.push("import oracledb");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    const dbapi = config.dbapi;
    const uniqueEngineName = `${inputName}_Engine`;

    // Build connection string
    let connectionString = `oracle+${dbapi}://${config.username}:${config.password}@${config.host}:${config.port}/?service_name=${config.databaseName}`;

    // Initialize the Oracle client if oracleClient is provided
    const oracleClientInitialization = config.oracleClient && config.oracleClient.trim()
      ? `${dbapi}.init_oracle_client(lib_dir="${config.oracleClient}")\n`
      : "";

    // Prepare mappings and columns code
    let mappingsCode = "";
    let columnsCode = "";

    if (config.mapping && config.mapping.length > 0) {
      const renameMap = config.mapping
        .filter(map => map.input && map.input.value !== undefined && map.input.value !== null)
        .map(map => {
          if (map.input.value != map.value) {
            return `"${map.input.value}": "${map.value}"`;
          }
          return undefined;
        })
        .filter(value => value !== undefined);

      if (renameMap.length > 0) {
        mappingsCode = `
# Rename columns based on the mapping
${inputName} = ${inputName}.rename(columns={${renameMap.join(", ")}})
`;
      }

      const selectedColumns = config.mapping
        .filter(map => map.value !== null && map.value !== undefined)
        .map(map => `"${map.value}"`)
        .join(', ');

      if (selectedColumns) {
        columnsCode = `
# Only keep relevant columns
${inputName} = ${inputName}[[${selectedColumns}]]
`;
      }
    }

    const ifExistsAction = config.ifTableExists;

    const schemaParam = config.schema && config.schema.trim()
      ? `,
        schema="${config.schema}"`
      : '';

    return `
# Connect to the Oracle database
${oracleClientInitialization}${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
${mappingsCode}${columnsCode}
# Write DataFrame to Oracle
try:
    ${inputName}.to_sql(
        name="${config.tableName}",
        schema="${config.schema}",
        con=${uniqueEngineName},
        if_exists="${ifExistsAction}",
        index=False${schemaParam}
    )
finally:
    ${uniqueEngineName}.dispose()
`;
  }
}
