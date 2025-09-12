import { databaseIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { MySQLInput } from './MySQLInput';
import { PostgresInput } from './PostgresInput';
import { ODBCInput } from './ODBCInput';
import { SqlServerInput } from './SqlServerInput';
import { SnowflakeInput } from './SnowflakeInput';

export class DatabaseInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { provider: "postgres" };

    const mysql = new MySQLInput();
    const pg = new PostgresInput();
    const odbc = new ODBCInput();
    const mssql = new SqlServerInput();
    const snowflake = new SnowflakeInput();

    const getFields = (comp: BaseCoreComponent): any[] => {
      const form = (comp as any)._form as any;
      return Array.isArray(form?.fields) ? form.fields : [];
    };

    const wrapFields = (fields: any[], provider: string) =>
      fields.map(f => ({ ...f, condition: { provider: [provider], ...(f.condition || {}) } }));

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Database Type",
          id: "provider",
          options: [
            { value: "postgres", label: "PostgreSQL" },
            { value: "mysql", label: "MySQL" },
            { value: "sqlserver", label: "SQL Server" },
            { value: "snowflake", label: "Snowflake" },
            { value: "odbc", label: "ODBC" },
          ]
        },
        ...wrapFields(getFields(mysql), "mysql"),
        ...wrapFields(getFields(pg), "postgres"),
        ...wrapFields(getFields(mssql), "sqlserver"),
        ...wrapFields(getFields(odbc), "odbc"),
        ...wrapFields(getFields(snowflake), "snowflake"),
      ]
    };

    const description =
      "Database Input lets you choose a database and load a DataFrame via table or custom SQL.";

    super("Database Input", "databaseInput", description, "pandas_df_input", [], "inputs", databaseIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    switch (config.provider) {
      case "mysql": return new MySQLInput().provideDependencies({ config });
      case "postgres": return new PostgresInput().provideDependencies({ config });
      case "sqlserver": return new SqlServerInput().provideDependencies({ config });
      case "odbc": return new ODBCInput().provideDependencies({ config });
      case "snowflake": return new SnowflakeInput().provideDependencies({ config });
      default: return [];
    }
  }

  public provideImports({ config }): string[] {
    const imports =
      config.provider === "mysql" ? new MySQLInput().provideImports({ config }) :
      config.provider === "postgres" ? new PostgresInput().provideImports({ config }) :
      config.provider === "sqlserver" ? new SqlServerInput().provideImports({ config }) :
      config.provider === "odbc" ? new ODBCInput().provideImports({ config }) :
      config.provider === "snowflake" ? new SnowflakeInput().provideImports({ config }) :
      [];

    const seen = new Set<string>();
    return imports.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public generateComponentCode({ config, outputName }): string {
    switch (config.provider) {
      case "mysql": return new MySQLInput().generateComponentCode({ config, outputName });
      case "postgres": return new PostgresInput().generateComponentCode({ config, outputName });
      case "sqlserver": return new SqlServerInput().generateComponentCode({ config, outputName });
      case "odbc": return new ODBCInput().generateComponentCode({ config, outputName });
      case "snowflake": return new SnowflakeInput().generateComponentCode({ config, outputName });
      default: return "";
    }
  }
}
