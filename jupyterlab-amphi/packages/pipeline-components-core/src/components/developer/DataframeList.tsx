import { DataframeListIcon } from '../../icons';
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

    super("Dataframe List", "DataframeList", description, "pandas_df_processor", [], "developer", DataframeListIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd"
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
        if isinstance(obj, pd.DataFrame) and name not in exclude:
            dataframe_summary.append({
                "dataframe_name": name,
                "number_of_columns": obj.shape[1],
                "number_of_rows": obj.shape[0],
                "size_in_bytes": obj.memory_usage(deep=True).sum()
            })
    #convert to dataframe
    dataframe_summary_df=pd.DataFrame(dataframe_summary)
    del dataframe_summary
    dataframe_summary_df=dataframe_summary_df.astype({
        "dataframe_name": "string"
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
