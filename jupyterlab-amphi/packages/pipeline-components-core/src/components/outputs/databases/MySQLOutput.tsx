import { mySQLIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';


export class MySQLOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      host: "localhost",
      port: "3306",
      databaseName: "",
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
          connection: "Mysql",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter database port",
          connection: "Mysql",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          connection: "Mysql",
          placeholder: "Enter database name"
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
          connection: "Mysql",
          placeholder: "Enter username",
          advanced: true
        },
        {
          type: "input",
          inputType: "password",
          label: "Password",
          id: "password",
          connection: "Mysql",
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
          imports: ["pymysql"],
          label: "Mapping",
          id: "mapping",
          tooltip: "By default the mapping is inferred from the input data. By specifying a schema you override the incoming schema.",
          outputType: "relationalDatabase",
          drivers: "mysql+pymysql",
          query: "DESCRIBE {{table}}",
          typeOptions: [
            { value: "INT", label: "INT" },
            { value: "VARCHAR", label: "VARCHAR" },
            { value: "TEXT", label: "TEXT" },
            { value: "DATE", label: "DATE" },
            { value: "DATETIME", label: "DATETIME" },
            { value: "TIMESTAMP", label: "TIMESTAMP" },
            { value: "TIME", label: "TIME" },
            { value: "YEAR", label: "YEAR" },
            { value: "BOOLEAN", label: "BOOLEAN" },
            { value: "DECIMAL", label: "DECIMAL" },
            { value: "FLOAT", label: "FLOAT" },
            { value: "DOUBLE", label: "DOUBLE" },
            { value: "BLOB", label: "BLOB" },
            { value: "BIT", label: "BIT" },
            { value: "ENUM", label: "ENUM" },
            { value: "SET", label: "SET" },
            { value: "JSON", label: "JSON" }
          ],
          advanced: true
        }
      ],
    };

    const description = "Use MySQL Output to insert data into a MySQL table by specifying a data mapping between the incoming data and the existing table schema."

    super("MySQL Output", "mySQLOutput", description, "pandas_df_output", [], "outputs.Databases", mySQLIcon, defaultConfig, form);
  }

  // https://stackoverflow.com/questions/63881687/how-to-upsert-pandas-dataframe-to-mysql-with-sqlalchemy

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('pymysql');
    return deps;
  }
  
  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import pymysql"];
  }

  public generateComponentCode({ config, inputName }): string {
    const connectionString = `mysql+pymysql://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}`;
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

    const code = `
# Connect to MySQL and output into table
${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
${mappingsCode}
${columnsCode}
${inputName}.to_sql(
  name="${config.tableName}",
  con=${uniqueEngineName},
  if_exists="${ifExistsAction}",
  index=False
)
`;
    return code;
  }


}
