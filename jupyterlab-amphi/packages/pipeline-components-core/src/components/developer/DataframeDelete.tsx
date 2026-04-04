import { DataframeDeleteIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class DataframeDelete extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
    tsCFbooleanRaiseError:true,
    tsCFbooleanOutputResult:false
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          id: "tsCFinfoDescription",
          text: "Delete listed dataframe",
          advanced: false
        },
        {
          type: "valuesList",
          label: "Dataframe(s) to delete",
          id: "tsCFvaluesListDataframe",
          placeholders: "Enter Dataframe names",
          advanced: true
        },
        {
          type: "boolean",
          label: "Raise an error if failure",
          id: "tsCFbooleanRaiseError",
          advanced: true
        },
        {
          type: "boolean",
          label: "Output the result (and not the input dataframe)",
          id: "tsCFbooleanOutputResult",
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
    const tsDeleteDataframeFunction = `
def py_fn_delete_dataframes(py_arg_df_to_delete_names: list, scope: dict, py_arg_raise_on_error: bool, py_arg_output_delete_result: bool, py_arg_default_input_df) -> pd.DataFrame:
    results = []
    df_deletion_failed = []

    for name in py_arg_df_to_delete_names:
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

    if py_arg_raise_on_error and len(df_deletion_failed) > 0:
        raise RuntimeError("One or more deletions failed:".join(df_deletion_failed))
    if py_arg_output_delete_result:
       return pd.DataFrame(results, columns=['DataFrame', 'Status']).astype({
        "DataFrame": "string",
        "Status": "string"
    })
    else:
        return py_arg_default_input_df
    `;
    return [tsDeleteDataframeFunction];
  }

  // Generate the Python execution script
public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
const tsConstRaiseError=config.tsCFbooleanRaiseError ? "True" : "False";
const tsConstOutputResult=config.tsCFbooleanOutputResult ? "True" : "False";
//create a typescript string coming from the typescript list
const tsConstDataframeToDelete = '[' + config.tsCFvaluesListDataframe.map(v => `'${v}'`).join(',') + ']';
console.log(config.tsCFvaluesListDataframe);
    return `
# Execute the function
${outputName} = py_fn_delete_dataframes(${tsConstDataframeToDelete}, globals(), ${tsConstRaiseError},${tsConstOutputResult},${inputName})
    `;
  }
}
