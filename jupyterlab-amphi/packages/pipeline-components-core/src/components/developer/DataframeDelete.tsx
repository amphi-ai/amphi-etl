import { DataframeDeleteIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class DataframeDelete extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
    boolean_raise_error:true,
    boolean_output_result:false
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          id: "description",
          text: "Delete listed dataframe",
          advanced: false
        },
        {
          type: "valuesList",
          label: "Dataframe(s) to delete",
          id: "valuesList_dataframe",
          placeholders: "Enter Dataframe names",
          advanced: true
        },
        {
          type: "boolean",
          label: "Raise an error if failure",
          id: "boolean_raise_error",
          advanced: true
        },
        {
          type: "boolean",
          label: "Output the result (and not the input dataframe)",
          id: "boolean_output_result",
          advanced: true
        }
      ],
    };

    const description = "Delete intermediate or residual pandas dataframes";

    super("Dataframe Delete", "DataframeDelete", description, "pandas_df_processor", [], "developer", DataframeDeleteIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd"
      ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to list dataframes
    const DeleteDataframeFunction = `
def delete_dataframes(df_to_delete_names: list, scope: dict, raise_on_error: bool, output_delete_result: bool, default_input_df) -> pd.DataFrame:
    results = []
    df_deletion_failed = []

    for name in df_to_delete_names:
        try:
            if name in scope:
                del scope[name]
                results.append((name, 'success'))
            else:
                msg = 'failure: not found'
                results.append((name, msg))
                df_deletion_failed.append(f"{name}: not found")
        except Exception as e:
            err_msg = f'failure: {e}'
            results.append((name, err_msg))
            df_deletion_failed.append(f"{name}: {e}")

    if raise_on_error and len(df_deletion_failed) > 0:
        raise RuntimeError("One or more deletions failed:".join(df_deletion_failed))
    if output_delete_result:
       return pd.DataFrame(results, columns=['DataFrame', 'Status']).astype({
        "DataFrame": "string",
        "Status": "string"
    })
    else:
        return default_input_df
    `;
    return [DeleteDataframeFunction];
  }

  // Generate the Python execution script
public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
const raise_on_error=config.boolean_raise_error ? "True" : "False";
//console.log(config.boolean_raise_error);
const output_delete_result=config.boolean_output_result ? "True" : "False";
//console.log(config.boolean_output_result);
//create a typescript string coming from the typescript list
const dataframe_to_delete = '[' + config.valuesList_dataframe.map(v => `'${v}'`).join(',') + ']';
console.log(config.valuesList_dataframe);
    return `
# Execute the function
#boolean : False/True, list ['toto']

${outputName} = delete_dataframes(${dataframe_to_delete}, globals(), ${raise_on_error},${output_delete_result},${inputName})
    `;
  }
}
