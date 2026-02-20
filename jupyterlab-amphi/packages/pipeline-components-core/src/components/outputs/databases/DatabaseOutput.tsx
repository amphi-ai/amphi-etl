import { databaseIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { MySQLOutput } from './MySQLOutput';
import { PostgresOutput } from './PostgresOutput';
import { SqlServerOutput } from './SqlServerOutput';
import { SnowflakeOutput } from './SnowflakeOutput';
import { OracleOutput } from './OracleOutput';
import { ClickhouseOutput } from './ClickhouseOutput';

export class DatabaseOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { provider: "mysql" };

    const mysql = new MySQLOutput();
    const pg = new PostgresOutput();
    const mssql = new SqlServerOutput();
    const snowflake = new SnowflakeOutput();
    const oracle = new OracleOutput();
    const clickhouse = new ClickhouseOutput();

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
            { value: "mysql", label: "MySQL" },
            { value: "postgres", label: "PostgreSQL" },
            { value: "sqlserver", label: "SQL Server" },
            { value: "snowflake", label: "Snowflake" },
            { value: "oracle", label: "Oracle" },
            { value: "clickhouse", label: "Clickhouse" }
          ]
        },
        ...wrapFields(getFields(mysql), "mysql"),
        ...wrapFields(getFields(pg), "postgres"),
        ...wrapFields(getFields(mssql), "sqlserver"),
        ...wrapFields(getFields(snowflake), "snowflake"),
        ...wrapFields(getFields(oracle), "oracle"),
        ...wrapFields(getFields(clickhouse), "clickhouse"),
      ]
    };

    const description =
      "Database Output lets you choose a database and write a DataFrame using table or custom mapping.";

    super("Database Output", "databaseOutput", description, "pandas_df_output", [], "outputs", databaseIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    switch (config.provider) {
      case "mysql": return new MySQLOutput().provideDependencies({ config });
      case "postgres": return new PostgresOutput().provideDependencies({ config });
      case "sqlserver": return new SqlServerOutput().provideDependencies({ config });
      case "snowflake": return new SnowflakeOutput().provideDependencies({ config });
      case "oracle": return new OracleOutput().provideDependencies({ config });
      case "clickhouse": return new ClickhouseOutput().provideDependencies({ config });
      default: return [];
    }
  }

  public provideImports({ config }): string[] {
    const imports =
      config.provider === "mysql" ? new MySQLOutput().provideImports({ config }) :
      config.provider === "postgres" ? new PostgresOutput().provideImports({ config }) :
      config.provider === "sqlserver" ? new SqlServerOutput().provideImports({ config }) :
      config.provider === "snowflake" ? new SnowflakeOutput().provideImports({ config }) :
      config.provider === "oracle" ? new OracleOutput().provideImports({ config }) :
      config.provider === "clickhouse" ? new ClickhouseOutput().provideImports({ config }) :
      [];

    const seen = new Set<string>();
    return imports.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public generateComponentCode({ config, inputName }): string {
    switch (config.provider) {
      case "mysql": return new MySQLOutput().generateComponentCode({ config, inputName });
      case "postgres": return new PostgresOutput().generateComponentCode({ config, inputName });
      case "sqlserver": return new SqlServerOutput().generateComponentCode({ config, inputName });
      case "snowflake": return new SnowflakeOutput().generateComponentCode({ config, inputName });
      case "oracle": return new OracleOutput().generateComponentCode({ config, inputName });
      case "clickhouse": return new ClickhouseOutput().generateComponentCode({ config, inputName });
      default: return "";
    }
  }
}
