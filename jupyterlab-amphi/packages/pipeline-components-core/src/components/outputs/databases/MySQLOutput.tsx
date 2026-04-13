import { mySQLIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class MySQLOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFinputHost: "localhost",
      tsCFinputPort: "3306",
      tsCFinputDatabaseName: "",
      tsCFtableTableName: "",
      tsCFinputUserName: "",
      tsCFinputPassword: "",
      tsCFradioIfTableExists: "fail",
      tsCFradioMode: "insert"
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Host",
          id: "tsCFinputHost",
          placeholder: "Enter database host",
          connection: "Mysql",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "tsCFinputPort",
          placeholder: "Enter database port",
          connection: "Mysql",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "tsCFinputDatabaseName",
          connection: "Mysql",
          placeholder: "Enter database name"
        },
        {
          type: "table",
          label: "Table Name",
          query: `SHOW TABLES;`,
          id: "tsCFtableTableName",
          placeholder: "Enter table name"
        },
        {
          type: "input",
          label: "Username",
          id: "tsCFinputUserName",
          connection: "Mysql",
          placeholder: "Enter username",
          advanced: true
        },
        {
          type: "input",
          inputType: "password",
          label: "Password",
          id: "tsCFinputPassword",
          connection: "Mysql",
          placeholder: "Enter password",
          advanced: true
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
          imports: ["pymysql"],
          label: "Mapping",
          id: "tsCFdataMappingCustomMapping",
          tooltip: "By default the mapping is inferred from the input data. By specifying a schema you override the incoming schema.",
          outputType: "relationalDatabase",
          drivers: "mysql+pymysql",
          query: "DESCRIBE {{tsCFtableTableName.value}}",
          pythonExtraction: "column_info = schema[[\"Field\", \"Type\"]]\nformatted_output = \", \".join([f\"{row['Field']} ({row['Type']})\" for _, row in column_info.iterrows()])\nprint(formatted_output)",
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
    return [
	"import pandas as pd",
	"import sqlalchemy",
	"import pymysql"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string {
    return `
# Connect to the MySQL database
${connectionName} = sqlalchemy.create_engine(
  "mysql+pymysql://${config.tsCFinputUserName}:${config.tsCFinputPassword}@${config.tsCFinputHost}:${config.tsCFinputPort}/${config.tsCFinputDatabaseName}"
)
`;
  }

  public generateComponentCode({ config, inputName }): string {
    const uniqueEngineName = `${inputName}Engine`;
    let mappingsCode = "";
    let columnsCode = "";

    if (config.tsCFdataMappingCustomMapping && config.tsCFdataMappingCustomMapping.length > 0) {
      const renameMap = config.tsCFdataMappingCustomMapping
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

    const connectionCode = this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName });

    return `
${connectionCode}
${mappingsCode}${columnsCode}
# Write DataFrame to MySQL
try:
    ${inputName}.to_sql(
        name="${config.tsCFtableTableName.value}",
        con=${uniqueEngineName},
        if_exists="${ifExistsAction}",
        index=False
    )
finally:
    ${uniqueEngineName}.dispose()
`;
  }
}