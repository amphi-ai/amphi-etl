import { ComponentItem, PipelineComponent } from '@amphi/pipeline-components-manager';
import { sampleIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Sample extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
    	tsCFradioSamplingType: "fixed_number",
		tsCFinputNumberRows: 1,
		tsCFinputNumberPercentage: 1,
		tsCFradioMode: "random",
        tsCFinputNumberRandomSeed : 42,
		tsCFcolumnsGroupByColumns: [] 
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Type",
          id: "tsCFradioSamplingType",
          options: [
            { value: "fixed_number", label: "Fixed Number" },
            { value: "percentage", label: "Percentage" }
          ],
          advanced: true
        },
        {
          type: "inputNumber",
          label: "Rows number",
          id: "tsCFinputNumberRows",
          placeholder: "0",
          min: 0,
          condition: { tsCFradioSamplingType: "fixed_number" }
        },
        {
          type: "inputNumber",
          label: "Percentage",
          id: "tsCFinputNumberPercentage",
          placeholder: "0",
          min: 0,
          max: 100,
          condition: { tsCFradioSamplingType: "percentage" }
        },
        {
          type: "radio",
          label: "Mode",
          id: "tsCFradioMode",
          options: [
            { value: "random", label: "Random" },
            { value: "first", label: "First" },
            { value: "last", label: "Last" }
          ],
          advanced: true
        },
	{
          type: "inputNumber",
          label: "Random Seed",
          id: "tsCFinputNumberRandomSeed",
          placeholder: "42",
          min: 0,
          advanced: true,
          condition: { tsCFradioMode: "random" }
        },
        {
          type: "columns",
          label: "Group By Columns",
          id: "tsCFcolumnsGroupByColumns",
          selectAll: true,
          advanced: true
        }
      ],
    };
    const description = "Use the Sample component to limit data by selecting a specified number of rows or percentage, either randomly, from the start, or from the end of the dataset. You can also group the sampling by one or more columns.";

    super("Sample Datasets", "sample", description, "pandas_df_processor", [], "transforms", sampleIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
	"import pandas as pd",
	"from typing import List, Optional"
	];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsSamplingDataframeFunction = `
def py_fn_sample_dataframe(
    py_arg_df: pd.DataFrame,
    py_arg_sampling_type: str,
    py_arg_fixed_number: Optional[int] = None,
    py_arg_percentage: Optional[float] = None,
    py_arg_mode: str = "random",
    py_arg_groupby_columns: Optional[List[str]] = None,
    py_arg_random_seed: int = 42
) -> pd.DataFrame:
    """
    Sample dataframe with modes: random / first / last.
    If group columns are provided:
      - first/last: vectorized with row_number + count per group
      - random: loop per group
      
      
       Parameters
    ----------
    py_arg_df : pd.DataFrame
        Input dataframe.
    py_arg_sampling_type : str
        Sampling type: "fixed_number" or "percentage".
    py_arg_fixed_number : Optional[int], default None
        Number of rows to sample when py_arg_sampling_type="fixed_number".
    py_arg_percentage : Optional[float], default None
        Sampling ratio in [0, 100] when py_arg_sampling_type="percentage".
    py_arg_mode : str, default "random"
        Sampling mode: "random", "first", "last".
    py_arg_groupby_columns : Optional[List[str]], default None
        Columns for grouped sampling.
    py_arg_random_seed : int, default 42
        Random seed for reproducibility in random mode.
 
    Returns
    -------
    pd.DataFrame
        Sampled dataframe.
    """

    #controls
    if py_arg_sampling_type not in {"fixed_number", "percentage"}:
        raise ValueError("py_arg_sampling_type must be 'fixed_number' or 'percentage'.")
    if py_arg_mode not in {"random", "first", "last"}:
        raise ValueError("py_arg_mode must be 'random', 'first', or 'last'.")
 
    if py_arg_sampling_type == "fixed_number":
        if py_arg_fixed_number is None or py_arg_fixed_number < 0:
            raise ValueError("py_arg_fixed_number must be >= 0 when fixed_number.")
    else:
        if py_arg_percentage is None or not (0 <= py_arg_percentage <= 100):
            raise ValueError("py_arg_percentage must be between 0 and 1 when percentage.")
 
    if py_arg_percentage is not None:
        py_var_percentage_value = py_arg_percentage/100

            
    # ---------- no group-by ----------
    if not py_arg_groupby_columns:
        py_var_size = len(py_arg_df)
        if py_arg_sampling_type == "fixed_number":
            py_var_n = min(py_arg_fixed_number, py_var_size)
        else:
            py_var_n = int(py_var_size * py_var_percentage_value)
 
        if py_var_n <= 0:
            return py_arg_df.iloc[0:0].copy()
 
        if py_arg_mode == "random":
            return py_arg_df.sample(n=py_var_n, random_state=py_arg_random_seed).reset_index(drop=True)
        if py_arg_mode == "first":
            return py_arg_df.head(py_var_n).reset_index(drop=True)
        return py_arg_df.tail(py_var_n).reset_index(drop=True)
 
    # ---------- group-by ----------
    # random => loop per group (as requested)
    if py_arg_mode == "random":
        py_var_idx = []
        for _, py_df_group in py_arg_df.groupby(py_arg_groupby_columns, sort=False, dropna=False):
            py_var_group_size = len(py_df_group)
            if py_arg_sampling_type == "fixed_number":
                py_var_n = min(py_arg_fixed_number, py_var_group_size)
            else:
                py_var_n = int(py_var_group_size * py_var_percentage_value)
 
            if py_var_n <= 0:
                continue
 
            py_var_idx.extend(
                py_df_group.sample(n=py_var_n, random_state=py_arg_random_seed).index.tolist()
            )
 
        return py_arg_df.loc[py_var_idx].reset_index(drop=True)
 
    # first/last => vectorized row_number + count
    py_df_work = py_arg_df.copy()
 
    py_df_work["py_var_group_count"] = (
        py_df_work.groupby(py_arg_groupby_columns, dropna=False)[py_arg_groupby_columns[0]]
        .transform("size")
    )
 
    if py_arg_mode == "first":
        py_df_work["py_var_row_number"] = (
            py_df_work.groupby(py_arg_groupby_columns, dropna=False).cumcount() + 1
        )
    else:  # last
        py_df_work["py_var_row_number"] = (
            py_df_work.iloc[::-1]
            .groupby(py_arg_groupby_columns, dropna=False)
            .cumcount()
            .iloc[::-1] + 1
        )
 
    if py_arg_sampling_type == "fixed_number":
        py_df_out = py_df_work.loc[
            py_df_work["py_var_row_number"] <= py_arg_fixed_number
        ]
    else:
        py_df_work["py_var_group_threshold"] = (
            py_df_work["py_var_group_count"] * py_var_percentage_value
        ).astype(int)
        py_df_out = py_df_work.loc[
            py_df_work["py_var_row_number"] <= py_df_work["py_var_group_threshold"]
        ]
 
    py_df_out = py_df_out.drop(
        columns=["py_var_group_count", "py_var_row_number"] + (
            ["py_var_group_threshold"] if "py_var_group_threshold" in py_df_out.columns else []
        )
    )
 
    return py_df_out.reset_index(drop=True)
	    `;
    return [tsSamplingDataframeFunction];
  }	

  public generateComponentCode({ config, inputName, outputName }): string {
		
   //for select, radio, input, date..
   //initialization to None
    let tsConstSamplingType = 'None';
    if (config.tsCFradioSamplingType && config.tsCFradioSamplingType.trim() !== '' 
	) {
      tsConstSamplingType = '"' + config.tsCFradioSamplingType+ '"';
    }			
    let tsConstMode = 'None';
    if (config.tsCFradioMode && config.tsCFradioMode.trim() !== '' 
	) {
      tsConstMode = '"' + config.tsCFradioMode+ '"';
    }	

	//for inputNumber
    const tsConstNumberRows=config.tsCFinputNumberRows;
    const tsConstPercentage=config.tsCFinputNumberPercentage;
    const tsConstRandomSeed=config.tsCFinputNumberRandomSeed;
	
    //for columns,
	let tsConstGroupByColumns = "None";
    if (config.tsCFcolumnsGroupByColumns?.length > 0) {
      tsConstGroupByColumns = `[${config.tsCFcolumnsGroupByColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }		
	
    return `
${outputName}=py_fn_sample_dataframe(
    py_arg_df=${inputName},
    py_arg_sampling_type= ${tsConstSamplingType},
    py_arg_fixed_number=${tsConstNumberRows},
    py_arg_percentage=${tsConstPercentage},
    py_arg_mode = ${tsConstMode},
    py_arg_groupby_columns = ${tsConstGroupByColumns},
    py_arg_random_seed = ${tsConstRandomSeed}
    )

`.trim();
  }
}
