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
          aiInstructions: "Generate a DuckDB SQL script that processes an input table named 'input_df1'.\nIMPORTANT: Ensure the SQL is valid for DuckDB and does not include any display or print statements. Include short comments for clarity.",
          aiGeneration: true,
          aiPromptExamples: [
            "Select all columns but filter rows where 'status' is 'active'.",
            "Create a new column 'total' as the sum of 'price' and 'tax'.",
            "Group by 'category' and calculate average 'sales'.",
            "Rename column 'user_id' to 'id'.",
            "Extract year from 'order_date' as 'order_year'."],
          advanced: true
        }
      ],
    };
    const description = "Run a SQL query to select and update the dataset."

    super("SQL Query", "sqlQuery", description, "pandas_df_processor", [], "transforms", boxIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('duckdb');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import duckdb"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Escape triple quotes in the query to prevent syntax errors
    const escapedQuery = config.query.replace(/"""/g, '\\"""');

    // Template for the pandas query code using triple quotes for multi-line SQL queries
    const code = `
# Execute SQL Query using DuckDB
${outputName} = duckdb.query("""${escapedQuery.replace('input_df1', inputName)}""").to_df().convert_dtypes()
`;
    return code;
  }

}