import { DataframeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class DataframeList extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          id: "description",
          text: "List all existing pandas dataframes created before the tool",
          advanced: false
        },
      ],
    };

    const description = "List all existing pandas dataframes created before the tool";

    super("Dataframe List", "DataframeList", description, "pandas_df_processor", [], "developer", DataframeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
	  "import polars as pl",
	  "import duckdb" 
      ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to list dataframes
    const ListExistingDataframesFunction = `
def list_existing_dataframes(scope, exclude=None):
    if exclude is None:
        exclude = []

    dataframe_summary = []
    
    for name, obj in scope.items():
        if name in exclude:
            continue
        
        # --- Pandas ---
        if isinstance(obj, pd.DataFrame):
            dataframe_summary.append({
                "dataframe_name": name,
                "engine": "pandas",
                "number_of_columns": obj.shape[1],
                "number_of_rows": obj.shape[0],
                "size_in_bytes": obj.memory_usage(deep=True).sum()
            })

        # --- Polars ---
        elif pl is not None and isinstance(obj, pl.DataFrame):
            dataframe_summary.append({
                "dataframe_name": name,
                "engine": "polars",
                "number_of_columns": obj.width,
                "number_of_rows": obj.height,
                "size_in_bytes": obj.estimated_size()
            })

        # --- DuckDB Relation/Table ---
        elif duckdb is not None and isinstance(obj, (duckdb.DuckDBPyRelation)):
            try:
                rows = obj.count("*").fetchone()[0]
            except Exception:
                rows = None
            try:
                cols = len(obj.columns)
            except Exception:
                cols = None
            dataframe_summary.append({
                "dataframe_name": name,
                "engine": "duckdb",
                "number_of_columns": cols,
                "number_of_rows": rows,
                "size_in_bytes": None
            })

    dataframe_summary_df = pd.DataFrame(dataframe_summary)
    if not dataframe_summary_df.empty:
        dataframe_summary_df = dataframe_summary_df.astype({
            "dataframe_name": "string",
            "engine": "string"
        })

    return dataframe_summary_df
    `;
    return [ListExistingDataframesFunction];
  }

  // Generate the Python execution script
public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    return `
# Execute the function
${outputName} = list_existing_dataframes(globals(), exclude=['df_summary'])
    `;
  }
}
