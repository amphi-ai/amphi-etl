import { oracleIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class OracleOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputHost: "localhost",
      tsCFinputPort: "1521",
      tsCFinputDatabaseName: "",
      tsCFinputSchema: "",
      tsCFinputUserName: "",
      tsCFinputPassword: "",
      tsCFtableTableName: "",
      tsCFradioIfTableExists: "fail",
      tsCFradioMode: "insert",
      tsCFselectDbapi: "oracledb",
      tsCFinputOracleClient: ""
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Host",
          id: "tsCFinputHost",
          placeholder: "Enter database host",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "tsCFinputPort",
          placeholder: "Enter database port",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "tsCFinputDatabaseName",
          placeholder: "Enter database name",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Schema",
          id: "tsCFinputSchema",
          placeholder: "Enter schema name",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "tsCFinputUserName",
          placeholder: "Enter username",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "tsCFinputPassword",
          placeholder: "Enter password",
          inputType: "password",
          connection: "Oracle DB",
          advanced: true
        },
        {
          type: "table",
          label: "Table Name",
          query: `SELECT table_name FROM user_tables;`,
          id: "tsCFtableTableName",
          placeholder: "Enter table name"
        },
        {
          type: "radio",
          label: "If Table Exists",
          id: "tsCFradioIfTableExists",
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
          id: "tsCFradioMode",
          options: [
            { value: "insert", label: "INSERT" }
          ],
          advanced: true
        },
        {
          type: "dataMapping",
          label: "Mapping",
          id: "tsCFdataMappingCustomMapping",
          tooltip: "By default, the mapping is inferred from the input data. By specifying a schema, you override the incoming schema.",
          outputType: "relationalDatabase",
          imports: ["cx_Oracle", "oracledb"],
          drivers: "oracle",
          query: "DESCRIBE {{tsCFtableTableName.value}}",
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
          id: "tsCFinputOracleClient",
          placeholder: "Specify oracle client path",
          advanced: true
        },
        {
          type: "select",
          label: "Database API (DBAPI)",
          id: "tsCFselectDbapi",
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
    if (config.tsCFselectDbapi === 'cx_oracle') {
      deps.push("cx_Oracle");
    } else if (config.tsCFselectDbapi === 'oracledb') {
      deps.push("oracledb");
    }
    return deps;
  }

  public provideImports({ config }): string[] {
    const imports = [
	"import pandas as pd",
	"import sqlalchemy"];
    if (config.tsCFselectDbapi === 'cx_oracle') {
      imports.push("import cx_Oracle");
    } else if (config.tsCFselectDbapi === 'oracledb') {
      imports.push("import oracledb");
    }
    return imports;
  }

  public generateComponentCode({ config, inputName }): string {
    const dbapi = config.tsCFselectDbapi;
    const uniqueEngineName = `${inputName}_Engine`;

    // Build connection string
    let connectionString = `oracle+${dbapi}://${config.tsCFinputUserName}:${config.tsCFinputPassword}@${config.tsCFinputHost}:${config.tsCFinputPort}/?service_name=${config.tsCFinputDatabaseName}`;

    // Initialize the Oracle client if oracleClient is provided
    const oracleClientInitialization = config.tsCFinputOracleClient && config.tsCFinputOracleClient.trim()
      ? `${dbapi}.init_oracle_client(lib_dir="${config.tsCFinputOracleClient}")\n`
      : "";

    // Prepare mappings and columns code
    let mappingsCode = "";
    let columnsCode = "";

    if (config.tsCFdataMappingCustomMapping && config.tsCFdataMappingCustomMapping.length > 0) {
      const renameMap = config.tsCFdataMappingCustomMapping
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

      const selectedColumns = config.tsCFdataMappingCustomMapping
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

    const ifExistsAction = config.tsCFradioIfTableExists;

    const schemaParam = config.tsCFinputSchema && config.tsCFinputSchema.trim()
      ? `,
        schema="${config.tsCFinputSchema}"`
      : '';

    return `
# Connect to the Oracle database
${oracleClientInitialization}${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
${mappingsCode}${columnsCode}
# Write DataFrame to Oracle
try:
    ${inputName}.to_sql(
        name="${config.tsCFtableTableName}",
        schema="${config.tsCFinputSchema}",
        con=${uniqueEngineName},
        if_exists="${ifExistsAction}",
        index=False${schemaParam}
    )
finally:
    ${uniqueEngineName}.dispose()
`;
  }
}
