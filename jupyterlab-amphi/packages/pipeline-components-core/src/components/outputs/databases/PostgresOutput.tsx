import { postgresIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class PostgresOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      host: "localhost",
      port: "5432",
      databaseName: "",
      schema: "public",
      tableName: "",
      username: "",
      password: "",
      ifTableExists: "fail",
      mode: "insert"
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter database host",
          connection: "Postgres",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter database port",
          connection: "Postgres",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          connection: "Postgres",
          placeholder: "Enter database name"
        },
        {
          type: "input",
          label: "Schema",
          id: "schema",
          connection: "Postgres",
          placeholder: "Enter schema name",
        },
        {
          type: "input",
          label: "Table Name",
          id: "tableName",
          placeholder: "Enter table name",
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username",
          advanced: true
        },
        {
          type: "input",
          inputType: "password",
          label: "Password",
          id: "password",
          placeholder: "Enter password",
          advanced: true
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
          tooltip: "By default the mapping is inferred from the input data. By specifying a schema you override the incoming schema.",
          outputType: "relationalDatabase",
          imports: ["psycopg2-binary"],
          drivers: "postgresql",
          query: `
SELECT 
    column_name AS "Field",
    data_type AS "Type",
    is_nullable AS "Null",
    column_default AS "Default",
    CASE 
        WHEN character_maximum_length IS NOT NULL THEN character_maximum_length::text
        ELSE ''
    END AS "Extra"
FROM 
    information_schema.columns
WHERE 
    table_schema = '{{schema}}' AND
    table_name = '{{table}}';`,
          typeOptions: [
            { value: "SMALLINT", label: "SMALLINT" },
            { value: "INTEGER", label: "INTEGER" },
            { value: "BIGINT", label: "BIGINT" },
            { value: "SERIAL", label: "SERIAL" },
            { value: "BIGSERIAL", label: "BIGSERIAL" },
            { value: "DECIMAL", label: "DECIMAL" },
            { value: "NUMERIC", label: "NUMERIC" },
            { value: "REAL", label: "REAL" },
            { value: "DOUBLE PRECISION", label: "DOUBLE PRECISION" },
            { value: "SMALLSERIAL", label: "SMALLSERIAL" },
            { value: "MONEY", label: "MONEY" },
            { value: "CHAR", label: "CHAR" },
            { value: "VARCHAR", label: "VARCHAR" },
            { value: "TEXT", label: "TEXT" },
            { value: "BYTEA", label: "BYTEA" },
            { value: "TIMESTAMP", label: "TIMESTAMP" },
            { value: "DATE", label: "DATE" },
            { value: "TIME", label: "TIME" },
            { value: "INTERVAL", label: "INTERVAL" },
            { value: "BOOLEAN", label: "BOOLEAN" },
            { value: "UUID", label: "UUID" },
            { value: "XML", label: "XML" },
            { value: "JSON", label: "JSON" },
            { value: "JSONB", label: "JSONB" },
            { value: "ARRAY", label: "ARRAY" },
            { value: "CIDR", label: "CIDR" },
            { value: "INET", label: "INET" },
            { value: "MACADDR", label: "MACADDR" },
            { value: "BIT", label: "BIT" },
            { value: "TSVECTOR", label: "TSVECTOR" },
            { value: "TSQUERY", label: "TSQUERY" }
          ],
          advanced: true
        }
      ],
    };
    const description = "Use Postgres Output to insert data into a Postgres table by specifying a data mapping between the incoming data and the existing table schema."

    super("Postgres Output", "postgresOutput", description, "pandas_df_output", [], "outputs.Databases", postgresIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('psycopg2-binary');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import psycopg2"];
  }

  public generateComponentCode({ config, inputName }): string {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}`;
    const uniqueEngineName = `${inputName}Engine`;
    let mappingsCode = "";
    let columnsCode = "";

    const selectedColumns = config.mapping
      .filter(map => map.value !== null && map.value !== undefined && map.input?.value !== null && map.input?.value !== undefined)
      .map(map => `"${map.value}"`)
      .join(', ');

    if (config.mapping && config.mapping.length > 0) {
      const renameMap = config.mapping
        .filter(map => map.input && (map.input.value || typeof map.input.value === 'number'))
        .map(map => {
          if (map.input.value != map.value) {
            if (map.input.named) {
              return `"${map.input.value}": "${map.value}"`; // Handles named columns
            } else {
              return `${map.input.value}: "${map.value}"`; // Handles numeric index
            }
          }
          return undefined; // Explicitly return undefined for clarity
        })
        .filter(value => value !== undefined); // Remove undefined values

      if (renameMap.length > 0) {
        mappingsCode = `
# Rename columns based on the mapping
${inputName} = ${inputName}.rename(columns={${renameMap.join(", ")}})
`;
      }

      if (selectedColumns !== '' && selectedColumns !== undefined) {
        columnsCode = `
# Only keep relevant columns
${inputName} = ${inputName}[[${selectedColumns}]]
`;
      }
    }

    const ifExistsAction = config.ifTableExists;

    const schemaParam = (config.schema && config.schema.toLowerCase() !== 'public')
      ? `,
  schema="${config.schema}"`
      : '';

    const code = `
# Connect to Postgres and output into table
${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
${mappingsCode}${columnsCode}
${inputName}.to_sql(
  name="${config.tableName}",
  con=${uniqueEngineName},
  if_exists="${ifExistsAction}",
  index=False${schemaParam}
)
`;
    return code;
  }


}
