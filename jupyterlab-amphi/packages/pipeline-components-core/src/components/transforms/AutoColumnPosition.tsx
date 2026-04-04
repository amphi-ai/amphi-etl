// Import necessary icons and the BaseCoreComponent class.
// Ensure the correct folder hierarchy is used (e.g., input/xx/yy...). Built-in component only.
import { autoColumnPositionIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class AutoColumnPosition extends BaseCoreComponent {
  constructor() {
    const description = 'Auto Column Position';
    const defaultConfig = {
        tsCFselectMultipleSortType:["by_name"]
	};
    const form = {
      idPrefix: 'component__form',
      fields: [
		{
          type: "selectMultiple",
          label: "Sort Type (applied in order, no multilevel)",
          id: "tsCFselectMultipleSortType",
          options: [
            { value: "by_name", label: "By Name", tooltip : "Sort columns alphabetically by column name."  },
            { value: "by_name_natural", label: "By Name Natural", tooltip :"Sort columns using natural ordering so that numeric substrings"  },
            { value: "by_type", label: "By Type", tooltip :"Sort columns by their dtype string representation."  },
			{ value: "by_type_family", label: "By Type Family", tooltip :"Sort columns by logical dtype family."  },
            { value: "reverse_position", label: "Reverse Position", tooltip :"Reverse Position" },
          ],
          advanced: false
        }	
      ]
          
    };

    super('Auto Column Position', 'AutoColumnPosition', description, 'pandas_df_processor', [], 'transforms', autoColumnPositionIcon, defaultConfig, form);
  }

  provideImports() {
    return [
"import pandas as pd",
"import re",
"from typing import List,Any"
];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsAutoColumnPositionFunction = `
def py_fn_sort_dataframe_columns(
    py_arg_dataframe: pd.DataFrame,
    py_arg_sort_types: List[str],
) -> pd.DataFrame:
    """
    Sort the columns of a pandas DataFrame according to a sequence of sorting rules.

    Sorting rules are applied sequentially in the order provided.

    Supported sort types
    --------------------
    by_name
        Sort columns alphabetically by column name.

    by_name_natural
        Sort columns using natural ordering so that numeric substrings
        are ordered numerically (e.g., col1, col2, col10).

    by_type
        Sort columns by their dtype string representation. This supports
        pandas native dtypes, pyarrow-backed dtypes, and extension dtypes.

    by_type_family
        Sort columns by logical dtype family. Families are determined
        dynamically based on dtype properties.

        Families order:
            boolean
            numeric
            datetime
            timedelta
            categorical
            string
            other

    reverse_position
        Reverse the current column order.

    Parameters
    ----------
    py_arg_dataframe : pandas.DataFrame
        Input DataFrame whose columns must be reordered.

    py_arg_sort_types : list[str]
        List of sorting rules applied sequentially.

    Returns
    -------
    pandas.DataFrame
        A new DataFrame with reordered columns.

    Raises
    ------
    ValueError
        If an unsupported sort type is provided.
    """

    py_local_columns = list(py_arg_dataframe.columns)

    def _py_fn_get_dtype_string(py_arg_dataframe: pd.DataFrame, py_arg_column: str) -> str:
        """Return the dtype string representation of a column."""
        return str(py_arg_dataframe[py_arg_column].dtype)

    def _py_fn_get_type_family(py_arg_dataframe: pd.DataFrame, py_arg_column: str) -> str:
        """Return the logical dtype family for a column."""
        py_local_dtype = py_arg_dataframe[py_arg_column].dtype

        if pd.api.types.is_bool_dtype(py_local_dtype):
            return "boolean"

        if pd.api.types.is_numeric_dtype(py_local_dtype):
            return "numeric"

        if pd.api.types.is_datetime64_any_dtype(py_local_dtype):
            return "datetime"

        if pd.api.types.is_timedelta64_dtype(py_local_dtype):
            return "timedelta"

        if pd.api.types.is_categorical_dtype(py_local_dtype):
            return "categorical"

        if pd.api.types.is_string_dtype(py_local_dtype) or pd.api.types.is_object_dtype(
            py_local_dtype
        ):
            return "string"

        return "other"

    def _py_fn_natural_sort_key(py_arg_value: Any) -> List[Any]:
        """Return a natural sorting key for strings containing numbers."""
        py_local_parts = re.split(r"(\d+)", str(py_arg_value))
        return [
            int(py_local_part) if py_local_part.isdigit() else py_local_part.lower()
            for py_local_part in py_local_parts
        ]

    py_local_family_order = {
        "boolean": 0,
        "numeric": 1,
        "datetime": 2,
        "timedelta": 3,
        "categorical": 4,
        "string": 5,
        "other": 6,
    }

    for py_local_sort_type in py_arg_sort_types:

        if py_local_sort_type == "by_name":
            py_local_columns = sorted(py_local_columns)

        elif py_local_sort_type == "by_name_natural":
            py_local_columns = sorted(
                py_local_columns,
                key=_py_fn_natural_sort_key,
            )

        elif py_local_sort_type == "by_type":
            py_local_columns = sorted(
                py_local_columns,
                key=lambda py_local_col: _py_fn_get_dtype_string(
                    py_arg_dataframe, py_local_col
                ),
            )

        elif py_local_sort_type == "by_type_family":
            py_local_columns = sorted(
                py_local_columns,
                key=lambda py_local_col: py_local_family_order[
                    _py_fn_get_type_family(py_arg_dataframe, py_local_col)
                ],
            )

        elif py_local_sort_type == "reverse_position":
            py_local_columns = list(reversed(py_local_columns))

        else:
            raise ValueError(f"Unsupported sort type: {py_local_sort_type}")

    return py_arg_dataframe.loc[:, py_local_columns]
	    `;
    return [tsAutoColumnPositionFunction];
  }
  
  generateComponentCode({ config, inputName, outputName }) {

	let tsConstSortTypes = 'None';
    if (config.tsCFselectMultipleSortType && config.tsCFselectMultipleSortType.length > 0
	) {
      tsConstSortTypes = JSON.stringify(config.tsCFselectMultipleSortType);
    }
		
    return `
${outputName}=py_fn_sort_dataframe_columns(
    py_arg_dataframe =  ${inputName},
    py_arg_sort_types =  ${tsConstSortTypes}
)

`.trim();
  }
}
