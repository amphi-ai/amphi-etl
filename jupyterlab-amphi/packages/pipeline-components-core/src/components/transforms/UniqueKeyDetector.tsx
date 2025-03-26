import { UniquekeyIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class UniqueKeyDetector extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      columns: [],
      combination_nfield : 1
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Select Columns",
          id: "combination_columns",
          placeholder: "Default: all columns",
        },
        {
          type: "inputNumber",
          tooltip: "Maximum Number of Fields in Combination",
          label: "Maximum Number of Fields in Combination",
          id: "combination_nfield",
          placeholder: "Default: 1",
          min: 1,
          advanced: false
        }
      ],
    };

    const description = "Find combination of fields for unique key";

    super("Unique Key Detector", "UniqueKeyDetector", description, "pandas_df_processor", [], "Data Exploration", UniquekeyIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from itertools import combinations"
      ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to perform frequency analysis
    const UniqueKeyDetectorFunction = `
def detect_unique_key(df, fields=None, max_combination=0):
    #Detect unique keys in a DataFrame based on field combinations.
    #Parameters:
    #df (pd.DataFrame): The DataFrame to analyze.
    #fields (list): List of fields to test for uniqueness.
    #max_combination (int): Maximum number of fields to combine (0 = no limit).
    #Returns:
    #result: A DataFrame with columns ['number_of_fields', 'field_combination'].
    if fields is None or len(fields) == 0:
        fields = list(df.columns)

    total_rows = len(df)
    max_combination = max_combination if max_combination > 0 else len(fields)

    result = []
    found_minimum = None

    for r in range(1, max_combination + 1):
        for combo in combinations(fields, r):
            combo = list(combo)
            unique_count = len(df.drop_duplicates(subset=combo))

            if unique_count == total_rows:
                if found_minimum is None:
                    found_minimum = r


                result.append({
                    "number_of_fields": r,
                    "field_combination": combo
                })
    #dataframe (no list) even if empty, and well typed
    result = pd.DataFrame(result, columns=["number_of_fields", "field_combination"])
    result = result.astype({
        "number_of_fields": "int",  # Integer type
        "field_combination": "object"  # Object (tuples)
    })

    return result

    `;
    return [UniqueKeyDetectorFunction];
  }

  // Generate the Python execution script
public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    console.log("Generated outputName:", outputName);  // Debugging output
    const combination_nfield = config.combination_nfield ?? 1;
    const combination_columns_step1=[];
     // If no columns are selected, pass None so that the Python function uses all columns(default).
    let combination_columns = "None";
    if (config.combination_columns?.length > 0) {
      combination_columns = `[${config.combination_columns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
    return `
# Execute the detect unique key function
${outputName} = []
${outputName} = detect_unique_key(${inputName},${combination_columns},${combination_nfield})
    `;
  }
}
