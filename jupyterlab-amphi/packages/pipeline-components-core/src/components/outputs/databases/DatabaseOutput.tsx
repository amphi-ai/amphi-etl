import { databaseIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { MySQLOutput } from './MySQLOutput';
import { PostgresOutput } from './PostgresOutput';
import { SqlServerOutput } from './SqlServerOutput';
import { SnowflakeOutput } from './SnowflakeOutput';
import { OracleOutput } from './OracleOutput';

export class DatabaseOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFselectProvider: "postgres",
        tsCFinputHost: "localhost",
        tsCFradioIfTableExists: "fail",
        tsCFradioMode: "insert"		
		};

    const mysql = new MySQLOutput();
    const pg = new PostgresOutput();
    const mssql = new SqlServerOutput();
    const snowflake = new SnowflakeOutput();
    const oracle = new OracleOutput();

    const getFields = (comp: BaseCoreComponent): any[] => {
      const form = (comp as any)._form as any;
      return Array.isArray(form?.fields) ? form.fields : [];
    };

    const wrapFields = (fields: any[], tsCFselectProvider: string) =>
      fields.map(f => ({ ...f, condition: { tsCFselectProvider: [tsCFselectProvider], ...(f.condition || {}) } }));

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Database Type",
          id: "tsCFselectProvider",
          options: [
            { value: "mysql", label: "MySQL" },
            { value: "postgres", label: "PostgreSQL" },
            { value: "sqlserver", label: "SQL Server" },
            { value: "snowflake", label: "Snowflake" },
            { value: "oracle", label: "Oracle" }
          ]
        },
        ...wrapFields(getFields(mysql), "mysql"),
        ...wrapFields(getFields(pg), "postgres"),
        ...wrapFields(getFields(mssql), "sqlserver"),
        ...wrapFields(getFields(snowflake), "snowflake"),
        ...wrapFields(getFields(oracle), "oracle"),
      ]
    };

    const description =
      "Database Output lets you choose a database and write a DataFrame using table or custom mapping.";

    super("Database Output", "databaseOutput", description, "pandas_df_output", [], "outputs", databaseIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    switch (config.tsCFselectProvider) {
      case "mysql": return new MySQLOutput().provideDependencies({ config });
      case "postgres": return new PostgresOutput().provideDependencies({ config });
      case "sqlserver": return new SqlServerOutput().provideDependencies({ config });
      case "snowflake": return new SnowflakeOutput().provideDependencies({ config });
      case "oracle": return new OracleOutput().provideDependencies({ config });
      default: return [];
    }
  }
  
  //why not all db?
  public generateDatabaseConnectionCode({ config, connectionName }): string {
    switch (config.tsCFselectProvider) {
      case "mysql": return new MySQLOutput().generateDatabaseConnectionCode({ config, connectionName });
      case "postgres": return new PostgresOutput().generateDatabaseConnectionCode({ config, connectionName });
      case "sqlserver": return new SqlServerOutput().generateDatabaseConnectionCode({ config, connectionName }); 
      case "snowflake": return new SnowflakeOutput().generateDatabaseConnectionCode({ config, connectionName });
      default: return "";
    }
  }
  public provideImports({ config }): string[] {
    const imports =
      config.tsCFselectProvider === "mysql" ? new MySQLOutput().provideImports({ config }) :
      config.tsCFselectProvider === "postgres" ? new PostgresOutput().provideImports({ config }) :
      config.tsCFselectProvider === "sqlserver" ? new SqlServerOutput().provideImports({ config }) :
      config.tsCFselectProvider === "snowflake" ? new SnowflakeOutput().provideImports({ config }) :
      config.tsCFselectProvider === "oracle" ? new OracleOutput().provideImports({ config }) :
      [];

    const seen = new Set<string>();
    return imports.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public generateComponentCode({ config, inputName }): string {
    switch (config.tsCFselectProvider) {
      case "mysql": return new MySQLOutput().generateComponentCode({ config, inputName });
      case "postgres": return new PostgresOutput().generateComponentCode({ config, inputName });
      case "sqlserver": return new SqlServerOutput().generateComponentCode({ config, inputName });
      case "snowflake": return new SnowflakeOutput().generateComponentCode({ config, inputName });
      case "oracle": return new OracleOutput().generateComponentCode({ config, inputName });
      default: return "";
    }
  }
}
