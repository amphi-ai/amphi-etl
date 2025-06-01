import { mergeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Join extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		how: "left",
		select_action_if_cartesian_product : "0"
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Left Input Column(s)",
          id: "leftKeyColumn",
          placeholder: "Column name",
          tooltip: "If you're joining by multiple columns, make sure the column lists are ordered to match the corresponding columns in the right dataset.",
          inputNb: 1
        },
        {
          type: "columns",
          label: "Right Input Column(s)",
          id: "rightKeyColumn",
          placeholder: "Column name",
          tooltip: "If you're joining by multiple columns, make sure the column lists are ordered to match the corresponding columns in the left dataset.",
          inputNb: 2
        },
        {
          type: "select",
          label: "Join type",
          id: "how",
          placeholder: "Default: Inner",
          options: [
            { value: "inner", label: "Inner", tooltip: "Return only the rows with matching keys in both datasets (intersection)." },
            { value: "left", label: "Left", tooltip: "Return all rows from the left dataset and matched rows from the right dataset (including NaN for no match)." },
            { value: "right", label: "Right", tooltip: "Return all rows from the right dataset and matched rows from the left dataset (including NaN for no match)." },
            { value: "outer", label: "Outer", tooltip: "Return all rows from both datasets, with matches where available and NaN for no match (union)." },
            { value: "cross", label: "Cross", tooltip: "Creates the cartesian product from both datasets, preserves the order of the left keys." },
            { value: "anti-left", label: "Anti Left", tooltip: "Return rows from the left dataset that do not have matching rows in the right dataset." },
            { value: "anti-right", label: "Anti Right", tooltip: "Return rows from the right dataset that do not have matching rows in the left dataset." }
          ],
          advanced: true
        }
		,
        {
          type: "select",
          label: "Cartesian Product (duplicate keys)",
          id: "select_action_if_cartesian_product",
          //placeholder: "Default: Do nothing",
          options: [
            { value: "0", label: "Do nothing", tooltip: "Execution will continue." },
            { value: "2", label: "Raise error if Cartesian product is detected", tooltip: "Execution will be stopped." },
            { value: "3", label: "Raise warning if Cartesian product is detected", tooltip: "Execution will continue." }
          ],
		  condition: { how: ["inner","left","right","outer","anti-right","anti-left"]},
          advanced: true
        }
      ],
    };
    const description = "Use Join Datasets to combine two datasets by one or more columns."

    super("Join Datasets", "join", description, "pandas_df_double_processor", [], "transforms", mergeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd",
	"import warnings"
	];

  }

 public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to perform frequency analysis
    const JoinFunction = `
def check_cartesian_product(df1, df2, key_left, key_right):
    #Checks if a Cartesian product may result from the join based on key uniqueness.
	#
    #Parameters:
        #df1, df2 (pd.DataFrame): DataFrames to join
        #key_left, key_right (str or list of str): Join keys for each DataFrame

    #Returns:
        #bool: True if a Cartesian product is likely, False otherwise.
    num_rows_df1 = len(df1)
    num_rows_df2 = len(df2)

    num_duplicates_df1 = df1.duplicated(subset=key_left).sum()
    num_duplicates_df2 = df2.duplicated(subset=key_right).sum()

    print(f"df1: {num_rows_df1} rows, {num_duplicates_df1} duplicate key rows")
    print(f"df2: {num_rows_df2} rows, {num_duplicates_df2} duplicate key rows")
	
    is_df1_unique = not df1.duplicated(subset=key_left).any()
    is_df2_unique = not df2.duplicated(subset=key_right).any()
    return not (is_df1_unique or is_df2_unique)

def perform_join(df1, df2, key_left, key_right, join_type):
    #Performs the join operation based on the specified type.
    #Parameters:
        #df1, df2 (pd.DataFrame): DataFrames to join
        #key_left, key_right (str or list of str): Join keys for each DataFrame
        #join_type (str): Join type

    #Returns:
        #pd.DataFrame: Joined DataFrame

    if join_type in ['inner', 'left', 'right', 'outer']:
        return pd.merge(df1, df2, how=join_type, left_on=key_left, right_on=key_right)
    elif join_type == 'cross':
        return df1.merge(df2, how='cross')
    elif join_type == 'anti-left':
        merged = pd.merge(df1, df2, how='left', left_on=key_left, right_on=key_right, indicator=True)
        return merged[merged['_merge'] == 'left_only'].drop(columns=['_merge'])
    elif join_type == 'anti-right':
        merged = pd.merge(df2, df1, how='left', left_on=key_right, right_on=key_left, indicator=True)
        return merged[merged['_merge'] == 'left_only'].drop(columns=['_merge'])
    else:
        raise ValueError(f"Unsupported join type: {join_type}")

def main_join(df1, df2, key_left, key_right, join_type, action_if_cartesian_product=0):
    #Main function to handle join logic with optional Cartesian product check.

    #Parameters:
        #df1, df2 (pd.DataFrame): DataFrames to join
        #key_left, key_right (str or list of str): Join keys for each DataFrame
        #join_type (str): Join type (e.g. "inner", "left", "cross", etc.)
        #action_if_cartesian_product (int): 
            #0 - Do nothing
            #2 - Raise error if Cartesian product is detected
            #3 - Raise warning if Cartesian product is detected

    #Returns:
        #pd.DataFrame: Joined result

    # Normalize key inputs to lists
    if isinstance(key_left, str):
        key_left = [key_left]
    if isinstance(key_right, str):
        key_right = [key_right]

    if join_type != 'cross' and action_if_cartesian_product in [2, 3]:
        is_cartesian = check_cartesian_product(df1, df2, key_left, key_right)
        if is_cartesian:
            if action_if_cartesian_product == 2:
                raise ValueError("Cartesian product detected and not allowed.")
            elif action_if_cartesian_product == 3:
                warnings.warn("Cartesian product detected.")

    return perform_join(df1, df2, key_left, key_right, join_type)


    `;
    return [JoinFunction];
  }
  
  
  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {

    const prefix = config?.backend?.prefix ?? "pd";
    // Extract and map leftKeyColumn and rightKeyColumn arrays
    const leftKeys = config.leftKeyColumn.map(column => column.named ? `"${column.value}"` : column.value);
    const rightKeys = config.rightKeyColumn.map(column => column.named ? `"${column.value}"` : column.value);
	const joinType = config.how;
	const const_action_if_cartesian_product = config.select_action_if_cartesian_product;
    // Join the keys into a string for the Python code
    const leftKeysStr = `[${leftKeys.join(', ')}]`;
    const rightKeysStr = `[${rightKeys.join(', ')}]`;
    let code = `# Join ${inputName1} and ${inputName2}\n`;
	
	code += `${outputName}=main_join(${inputName1}, ${inputName2}, key_left=${leftKeysStr}, key_right=${rightKeysStr}, join_type='${joinType}', action_if_cartesian_product=${const_action_if_cartesian_product})`


    return code;
  }

}