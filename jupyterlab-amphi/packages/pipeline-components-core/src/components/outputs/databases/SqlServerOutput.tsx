import { sqlServerIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent'; // Adjust the import path

export class SqlServerOutput extends BaseCoreComponent {
    constructor() {
        const defaultConfig = {
            host: "localhost",
            port: "1433",
            databaseName: "",
            username: "",
            password: "",
            tableName: "",
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
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Port",
                    id: "port",
                    placeholder: "Enter database port",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Database Name",
                    id: "databaseName",
                    placeholder: "Enter database name",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Username",
                    id: "username",
                    placeholder: "Enter username",
                    connection: "SQL Server",
                    advanced: true
                },
                {
                    type: "input",
                    label: "Password",
                    id: "password",
                    placeholder: "Enter password",
                    connection: "SQL Server",
                    inputType: "password",
                    advanced: true
                },
                {
                    type: "table",
                    label: "Table Name",
                    query: `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE';`,
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
                    imports: ["pyodbc"],
                    drivers: "mssql",
                    query: `
SELECT 
    COLUMN_NAME AS "Field",
    DATA_TYPE AS "Type",
    IS_NULLABLE AS "Null",
    COLUMN_DEFAULT AS "Default",
    '' AS "Extra"
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{{table}}' AND TABLE_SCHEMA = 'dbo';
`,
                    typeOptions: [
                        { value: "INT", label: "INT" },
                        { value: "VARCHAR", label: "VARCHAR" },
                        { value: "NVARCHAR", label: "NVARCHAR" },
                        { value: "TEXT", label: "TEXT" },
                        { value: "DATETIME", label: "DATETIME" },
                        { value: "DATE", label: "DATE" },
                        { value: "FLOAT", label: "FLOAT" },
                        { value: "DECIMAL", label: "DECIMAL" },
                        { value: "BIT", label: "BIT" },
                        { value: "BIGINT", label: "BIGINT" },
                        { value: "SMALLINT", label: "SMALLINT" },
                        { value: "TINYINT", label: "TINYINT" },
                        { value: "CHAR", label: "CHAR" },
                        { value: "NCHAR", label: "NCHAR" },
                        { value: "NTEXT", label: "NTEXT" },
                        { value: "BINARY", label: "BINARY" },
                        { value: "VARBINARY", label: "VARBINARY" },
                        { value: "IMAGE", label: "IMAGE" },
                        { value: "UNIQUEIDENTIFIER", label: "UNIQUEIDENTIFIER" },
                        { value: "XML", label: "XML" },
                        { value: "TIME", label: "TIME" },
                        { value: "DATETIME2", label: "DATETIME2" },
                        { value: "DATETIMEOFFSET", label: "DATETIMEOFFSET" },
                        { value: "SMALLDATETIME", label: "SMALLDATETIME" },
                        { value: "REAL", label: "REAL" },
                        { value: "MONEY", label: "MONEY" },
                        { value: "SMALLMONEY", label: "SMALLMONEY" },
                    ],
                    advanced: true
                },
                {
                    type: "info",
                    label: "Drivers installation",
                    id: "driversInstallation",
                    text: "You may need to install additional drivers on your machine for this component to function.\nFor Mac you need to install 'brew install unixodbc'",
                    advanced: true
                },
            ],
        };
        const description = "Use SQL Server Output to insert data into a SQL Server table by specifying a data mapping between the incoming data and the existing table schema.";

        super("SQL Server Output", "sqlServerOutput", description, "pandas_df_output", [], "outputs.Databases", sqlServerIcon, defaultConfig, form);
    }

    public provideDependencies({ config }): string[] {
        return ['pyodbc'];
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd", "import sqlalchemy", "import pyodbc"];
    }

    public generateDatabaseConnectionCode({ config, connectionName }): string {
        return `
# Connect to the SQL Server database
${connectionName} = sqlalchemy.create_engine(
  "mssql+pyodbc://${config.username}:${config.password}@${config.host}:${config.port}/${config.databaseName}?driver=ODBC+Driver+17+for+SQL+Server"
)
`;
    }

    public generateComponentCode({ config, inputName }): string {
        const uniqueEngineName = `${inputName}_Engine`;

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

        const connectionCode = this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName });

        return `
${connectionCode}
${mappingsCode}${columnsCode}
# Write DataFrame to SQL Server
try:
    ${inputName}.to_sql(
        name="${config.tableName}",
        con=${uniqueEngineName},
        if_exists="${ifExistsAction}",
        index=False,
        schema="dbo"
    )
finally:
    ${uniqueEngineName}.dispose()
`;
    }
}