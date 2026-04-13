import { snowflakeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class SnowflakeOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputAccount: "",
      tsCFinputDatabase: "",
      tsCFinputSchema: "PUBLIC",
      tsCFtableTableName: "",
      tsCFinputUserName: "",
      tsCFinputPassword: "",
      tsCFinputWarehouse: "",
      tsCFinputRole: "",
      tsCFradioIfTableExists: "fail",
      tsCFradioMode: "insert"
    };
    const form = {
      idPrefix: "component__form",
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
          label: "Role (Optional)",
          id: "tsCFinputRole",
          placeholder: "Role name",
          advanced: true
        },
        {
          type: "table",
          label: "Table Name",
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = '{{tsCFinputSchema}}'`,
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
          imports: ["snowflake-sqlalchemy"],
          drivers: "snowflake",
          query: `DESCRIBE TABLE "{{tsCFinputSchema}}"."{{tsCFtableTableName.value}}"`,
          pythonExtraction: `columns_types = ', '.join(f"{row['name']} ({row['type']})" for _, row in schema.iterrows())\nprint(columns_types)`,
          typeOptions: [
            { value: "INTEGER", label: "INTEGER" },
            { value: "FLOAT", label: "FLOAT" },
            { value: "NUMBER", label: "NUMBER" },
            { value: "VARCHAR", label: "VARCHAR" },
            { value: "BOOLEAN", label: "BOOLEAN" },
            { value: "DATE", label: "DATE" },
            { value: "TIMESTAMP", label: "TIMESTAMP" },
            { value: "VARIANT", label: "VARIANT" },
            { value: "OBJECT", label: "OBJECT" },
            { value: "ARRAY", label: "ARRAY" }
          ],
          advanced: true
        }
      ]
    };
    const description = "Use Snowflake Output to insert data into a Snowflake table by specifying a data mapping between the incoming data and the existing table schema.";

    super("Snowflake Output", "snowflakeOutput", description, "pandas_df_output", [], "outputs.Databases", snowflakeIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    return ['snowflake-sqlalchemy'];
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "import sqlalchemy",
      "import urllib.parse",
      "from snowflake.sqlalchemy import URL"
    ];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    const rolePart = config.tsCFinputRole ? `, role='${config.tsCFinputRole}'` : '';
    return `
# Connect to the Snowflake database
${connectionName} = sqlalchemy.create_engine(URL(
    account='${config.tsCFinputAccount}',
    user='${config.tsCFinputUserName}',
    password=urllib.parse.quote("${config.tsCFinputPassword}"),
    database='${config.tsCFinputDatabase}',
    schema='${config.tsCFinputSchema}',
    warehouse='${config.tsCFinputWarehouse}'${rolePart}
))
`;
  }

  public generateComponentCode({ config, inputName }): string {
    const uniqueEngineName = `${inputName}Engine`;
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

    const schemaParam = (config.tsCFinputSchema && config.tsCFinputSchema.toUpperCase() !== 'PUBLIC')
      ? `,
    schema="${config.tsCFinputSchema}"`
      : '';

    const connectionCode = this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName });

    return `
${connectionCode}
${mappingsCode}${columnsCode}
# Write DataFrame to Snowflake
try:
    ${inputName}.to_sql(
        name="${config.tsCFtableTableName.value}",
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
