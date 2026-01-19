import { sqlIcon } from '../../icons';
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
            { label: "Filter amount > 100", value: "Select/filter rows where the amount is more than 100." },
            { label: "Extract year from date", value: "Extract the year from the column 'date'." },
            { label: "Sort by order_date", value: "Sort rows based on column 'order_date' from the latest to the oldest and keep the first 10." }
          ],
          advanced: true
        }
      ],
    };
    const description = "Run a SQL query to select and update the dataset."

    super("SQL Query", "sqlQuery", description, "pandas_df_processor", [], "transforms", sqlIcon, defaultConfig, form);
  }

  private getEffectiveQuery(config: any): string {
    const rawValue = config.query;
    if (!rawValue) return "";

    // If already an object
    if (typeof rawValue === 'object') return rawValue.code || "";

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object' && 'code' in parsed) {
        return parsed.code;
      }
    } catch (e) {
      // Backward compatibility: value is a plain SQL string
      return rawValue;
    }
    return rawValue;
  }

  public provideDependencies({ config }): string[] {
    return ['duckdb'];
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import duckdb"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // 1. Extract the real SQL query from the metadata wrapper
    const effectiveQuery = this.getEffectiveQuery(config);

    // 2. Escape triple quotes to ensure the Python f-string/triple-quote block doesn't break
    const escapedQuery = effectiveQuery.replace(/"""/g, '\\"""');

    // 3. Replace the placeholder 'input_df1' with the actual variable name from the pipeline
    // We use a regex with word boundaries (\b) to be safe
    const tableRegex = new RegExp('\\binput_df1\\b', 'g');
    const finalQuery = escapedQuery.replace(tableRegex, inputName);

    // 4. Generate the DuckDB execution wrapper
    return `
# Execute SQL Query using DuckDB
${outputName} = duckdb.query("""${finalQuery}""").to_df().convert_dtypes()
`;
  }
}