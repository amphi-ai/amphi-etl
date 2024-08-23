import { boxIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class SQLQuery extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { query: "SELECT * FROM input_df1" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "codeTextarea",
          label: "SQL",
          mode: "sql",
          id: "query",
          placeholder: "Enter your SQL Query here. Table is named input_df1.",
          advanced: true
        }
      ],
    };

    super("SQL Query", "sqlQuery", "pandas_df_processor", [], "transforms", boxIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd", "import duckdb"];
  }

  public generateComponentCode({config, inputName, outputName}): string {
 
    // Template for the pandas query code, with backticks around column names
    const code = `
# Execute SQL Query using DuckDB
${outputName} = duckdb.query("${config.query.replace('input_df1', inputName)}").to_df().convert_dtypes()\n
`;
    return code;
}

}