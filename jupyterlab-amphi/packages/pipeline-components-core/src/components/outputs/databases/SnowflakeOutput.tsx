import { snowflakeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class SnowflakeOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      account: "",
      database: "",
      schema: "PUBLIC",
      tableName: "",
      username: "",
      password: "",
      warehouse: "",
      role: "",
      ifTableExists: "fail",
      mode: "insert"
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Account",
          id: "account",
          placeholder: "Enter Account",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "database",
          connection: "Snowflake",
          placeholder: "Enter database name",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          connection: "Snowflake",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          connection: "Snowflake",
          inputType: "password",
          advanced: true
        },
        {
          type: "input",
          label: "Warehouse",
          id: "warehouse",
          placeholder: "Enter warehouse name",
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
          label: "Role (Optional)",
          id: "role",
          placeholder: "Role name",
          advanced: true
        },
        {
          type: "table",
          label: "Table Name",
          query: `SELECT table_name FROM information_schema.tables WHERE table_schema = '{{schema}}'`,
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
          imports: ["snowflake-sqlalchemy"],
          drivers: "snowflake",
          query: `DESCRIBE TABLE "{{schema}}"."{{table}}"`,
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
    const rolePart = config.role ? `, role='${config.role}'` : '';
    return `
# Connect to the Snowflake database
${connectionName} = sqlalchemy.create_engine(URL(
    account='${config.account}',
    user='${config.username}',
    password=urllib.parse.quote("${config.password}"),
    database='${config.database}',
    schema='${config.schema}',
    warehouse='${config.warehouse}'${rolePart}
))
`;
  }

  public generateComponentCode({ config, inputName }): string {
    const uniqueEngineName = `${inputName}Engine`;
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

    const schemaParam = (config.schema && config.schema.toUpperCase() !== 'PUBLIC')
      ? `,
    schema="${config.schema}"`
      : '';

    const connectionCode = this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName });

    return `
${connectionCode}
${mappingsCode}${columnsCode}
# Write DataFrame to Snowflake
try:
    ${inputName}.to_sql(
        name="${config.tableName.value}",
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
