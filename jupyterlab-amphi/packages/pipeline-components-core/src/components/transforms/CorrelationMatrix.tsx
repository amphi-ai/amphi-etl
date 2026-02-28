import { correlationMatrixIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class CorrelationMatrix extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
        tsCFselectMethod:"pearson",
        tsCFinputNumberMinPeriods:"",
        tsCFbooleanNumericOnly:false,
        tsCFbooleanResetIndex:true,
        tsCFcolumnsColumnsToAnalyze:""
	};
    const form = {
      idPrefix: 'component__form_name',
      fields: [
		{
          type: "columns",
          label: "Columns to Analyze",
          id: "tsCFcolumnsColumnsToAnalyze",
          placeholder: "Column name",
          advanced: false
        },
		{
          type: "select",
          label: "Method",
          id: "tsCFselectMethod",
		  options: [
            { value: "pearson", label: "Pearson", tooltip:"Linear correlation between 2 sets of data. It is the ratio between the covariance of 2 variables and the product of their standard deviations."},
            { value: "kendall", label: "Kendall", tooltip:"Measure of rank correlation: the similarity of the orderings of the data when ranked by each of the quantities"},
            { value: "spearman", label: "Spearman", tooltip:"Monotonic relationships, equal to the Pearson correlation between the rank values of those two variables" }
          ],
          advanced: false
        },  
        {
          type: "boolean",
          label: "Numeric Only",
          id: "tsCFbooleanNumericOnly",
          advanced: true
        },
        {
          type: "boolean",
          label: "Reset Index",
          id: "tsCFbooleanResetIndex",
          advanced: true
        },
		{
          type: "inputNumber",
          label: "Min Periods",
          id: "tsCFinputNumberMinPeriods",
          advanced: true
        }
      ],
    };

    const description = "Use Correlation Matrix to analyse the correlation between several variables";
    super('Correlation Matrix', 'CorrelationMatrix', description, 'pandas_df_processor', [], 'transforms', correlationMatrixIcon, defaultConfig, form);
  }

  provideImports() {
    return [
"import pandas as pd",
"from typing import Optional, Union, Dict, Tuple, List"
];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsCorrelationMatrixFunction = `
def py_fn_correlation_matrix(
    py_arg_df: pd.DataFrame,
    py_arg_method: str = "pearson",
    py_arg_min_periods: int | None = None,
    py_arg_numeric_only: bool | None = None,
    py_arg_reset_index: bool = True,
    py_arg_columns: list[str] | None = None,
) -> pd.DataFrame:
    """
    Compute the correlation matrix of a pandas DataFrame.
 
    Parameters
    ----------
    py_arg_df : pandas.DataFrame
        The input DataFrame.
    py_arg_method : str, default "pearson"
        Correlation method: "pearson", "kendall", or "spearman".
    py_arg_min_periods : int or None, default None
        Minimum number of observations required per pair of columns.
    py_arg_numeric_only : bool or None, default None
        Include only numeric columns.
    py_arg_reset_index : bool, default True
        Whether to reset the index of the resulting correlation matrix.
    py_arg_columns : list of str or None, default None
        List of column names to include in the correlation matrix. If None, all columns are used.
 
    Returns
    -------
    pandas.DataFrame
        The correlation matrix, optionally with reset index.
    """
    if py_arg_columns is not None:
        df_to_use = py_arg_df[py_arg_columns]
    else:
        df_to_use = py_arg_df
 
    corr_df = df_to_use.corr(
        method=py_arg_method,
        min_periods=py_arg_min_periods,
        numeric_only=py_arg_numeric_only,
    )
    if py_arg_reset_index:
        corr_df = corr_df.reset_index().convert_dtypes()
    return corr_df
	    `;
    return [tsCorrelationMatrixFunction];
  }
  
  generateComponentCode({ config, inputName, outputName }) {

   let tsConstMethod = 'None';
    if (config.tsCFselectMethod && config.tsCFselectMethod.trim() !== '' 
	) {
      tsConstMethod = '"' + config.tsCFselectMethod+ '"';
    }	
   let tsConstMinPeriods = "None";
    if (config.tsCFinputNumberMinPeriods
	) {
      tsConstMinPeriods = config.tsCFinputNumberMinPeriods;
    }		
	let tsConstNumericOnly = config.tsCFbooleanNumericOnly ? 'True' : 'False';
	let tsConstResetIndex = config.tsCFbooleanResetIndex ? 'True' : 'False';
	let tsConstColumnsToAnalyze = "None";
    if (config.tsCFcolumnsColumnsToAnalyze?.length > 0) {
      tsConstColumnsToAnalyze = `[${config.tsCFcolumnsColumnsToAnalyze
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
		
    return `
${outputName}=py_fn_correlation_matrix(
    py_arg_df =  ${inputName},
    py_arg_method =  ${tsConstMethod},
    py_arg_min_periods =  ${tsConstMinPeriods},
    py_arg_numeric_only =  ${tsConstNumericOnly},
    py_arg_reset_index =  ${tsConstResetIndex},
    py_arg_columns =  ${tsConstColumnsToAnalyze}
)

`.trim();
  }
}