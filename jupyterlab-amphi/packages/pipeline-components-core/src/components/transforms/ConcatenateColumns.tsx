import { concatenateColumnsIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class ConcatenateColumns extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
        tsCFinputNewColumnName: "new_column",
        tsCFcolumnsColumnsToConcatenate: [],
        tsCFbooleanUseAsciiSeparator: false,
        tsCFselectMultipleCustomizableColumnSeparatorString: [","],
        tsCFselectMultipleCustomizableColumnSeparatorAsciiCode: ["13","10"],
    };
    const form = {
      idPrefix: 'component__form_name',
      fields: [
        {
          type: "input",
          label: "New Column Name",
          id: "tsCFinputNewColumnName",
          tooltip: "New Column Name",
          advanced: true
        },
        {
          type: "columns",
          label: "Columns to Concatenate",
          id: "tsCFcolumnsColumnsToConcatenate",
          placeholder: "Column name",
          advanced: false
        },
        {
          type: "boolean",
          label: "Use Ascii Code",
          id: "tsCFbooleanUseAsciiSeparator",
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "Separator String",
          id: "tsCFselectMultipleCustomizableColumnSeparatorString",
          placeholder: "default: comma (,)",
          tooltip: "Select or provide a custom delimiter.",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" }
          ],
          condition: { tsCFbooleanUseAsciiSeparator: false},
          advanced: true
        }, 
        {
          type: "selectMultipleCustomizable",
          label: "Separator (selectCustomizable)",
          id: "tsCFselectMultipleCustomizableColumnSeparatorAsciiCode",
          placeholder: "default: ,",
          tooltip: "Select or provide a custom delimiter ascii code.",
          options: [
            { value: "13", label: "carriage return (13)" },
            { value: "10", label: "line feed (10)" },
            { value: "9", label: "tabulation (9)" }
          ],
          condition: { tsCFbooleanUseAsciiSeparator: true},
          advanced: true
        }
      ],
    };

    const description = "Concatenate several columns with a separator";
    super('Concatenate Columns', 'ConcatenateColumns', description, 'pandas_df_processor', [], 'transforms', concatenateColumnsIcon, defaultConfig, form);
  }

  provideImports() {
    return [
"import pandas as pd",
"from typing import Optional, Union, Dict, Tuple, List"
];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsConcatenateColumnsFunction = `
def py_fn_concatenate_columns(
    py_arg_dataframe: pd.DataFrame,
    py_arg_new_column_name: str,
    py_arg_columns_to_concatenate: list[str],
    py_arg_use_ascii_separator: bool,
    py_arg_column_separator_string: list[str] | None = None,
    py_arg_column_separator_ascii_code: list[int] | None = None,
) -> pd.DataFrame:
    """
    Concatenate multiple columns from a Pandas DataFrame into a new column.

    The separator is built from either a list of strings or a list of
    ASCII character codes and is applied between all concatenated columns.

    Examples
    --------
    String separator:

    py_arg_column_separator_string = ["toto", "¤"]

    Final separator:

    "toto¤"

    ASCII separator:

    py_arg_column_separator_ascii_code = [124, 45]

    Final separator:

    "|-"

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input DataFrame containing the columns to concatenate.
    py_arg_new_column_name : str
        Name of the new column to create.
    py_arg_columns_to_concatenate : list[str]
        List of column names to concatenate.
    py_arg_use_ascii_separator : bool
        If True, the separator is built from
        py_arg_column_separator_ascii_code.
        If False, the separator is built from
        py_arg_column_separator_string.
    py_arg_column_separator_string : list[str] | None, default=None
        List of string fragments used to build the separator.
    py_arg_column_separator_ascii_code : list[int] | None, default=None
        List of ASCII character codes used to build the separator.

    Returns
    -------
    pd.DataFrame
        The input DataFrame with the newly created column.

    Raises
    ------
    ValueError
        If the input arguments are invalid.
    KeyError
        If one or more columns do not exist in the DataFrame.
    """
    if not py_arg_columns_to_concatenate:
        raise ValueError(
            "py_arg_columns_to_concatenate cannot be empty."
        )

    py_missing_columns = [
        py_column
        for py_column in py_arg_columns_to_concatenate
        if py_column not in py_arg_dataframe.columns
    ]

    if py_missing_columns:
        raise KeyError(
            "The following columns do not exist in the DataFrame: "
            f"{py_missing_columns}"
        )

    if py_arg_use_ascii_separator:
        if not py_arg_column_separator_ascii_code:
            raise ValueError(
                "py_arg_column_separator_ascii_code cannot be empty."
            )

        for py_ascii_code in py_arg_column_separator_ascii_code:
            if not 0 <= py_ascii_code <= 127:
                raise ValueError(
                    f"Invalid ASCII code: {py_ascii_code}. "
                    "Valid range is 0 to 127."
                )

        py_separator = "".join(
            chr(py_ascii_code)
            for py_ascii_code in py_arg_column_separator_ascii_code
        )

    else:
        if not py_arg_column_separator_string:
            raise ValueError(
                "py_arg_column_separator_string cannot be empty."
            )

        py_separator = "".join(
            py_arg_column_separator_string
        )

    py_arg_dataframe[py_arg_new_column_name] = (
        py_arg_dataframe[py_arg_columns_to_concatenate]
        .fillna("")
        .astype("string")
        .agg(py_separator.join, axis=1)
        .astype("string")
    )

    return py_arg_dataframe
	    `;
    return [tsConcatenateColumnsFunction];
  }
  
  generateComponentCode({ config, inputName, outputName }) {

   let tsConstNewColumnName = 'None';
    if (config.tsCFinputNewColumnName && config.tsCFinputNewColumnName.trim() !== '' 
) {
      tsConstNewColumnName = '"' + config.tsCFinputNewColumnName+ '"';
    }

    let tsConstColumnsToConcatenate = "None";
    if (config.tsCFcolumnsColumnsToConcatenate?.length > 0) {
      tsConstColumnsToConcatenate = `[${config.tsCFcolumnsColumnsToConcatenate
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

	let tsConstUseAsciiSeparator = config.tsCFbooleanUseAsciiSeparator ? 'True' : 'False';


	let tsConstColumnSeparatorString = 'None';
    if (config.tsCFselectMultipleCustomizableColumnSeparatorString && config.tsCFselectMultipleCustomizableColumnSeparatorString.length > 0
	) {
      tsConstColumnSeparatorString = JSON.stringify(config.tsCFselectMultipleCustomizableColumnSeparatorString);
    }

	let tsConstColumnSeparatorAsciiCode = 'None';
	let tsConstColumnSeparatorAsciiCodeNumberArrayTmp = [];
	let tsConstColumnSeparatorAsciiCodeNumberArray = [];
    if (config.tsCFselectMultipleCustomizableColumnSeparatorAsciiCode && config.tsCFselectMultipleCustomizableColumnSeparatorAsciiCode.length > 0
	) {
      tsConstColumnSeparatorAsciiCodeNumberArrayTmp=config.tsCFselectMultipleCustomizableColumnSeparatorAsciiCode;
      tsConstColumnSeparatorAsciiCodeNumberArray=tsConstColumnSeparatorAsciiCodeNumberArrayTmp.map(Number);
      tsConstColumnSeparatorAsciiCode = JSON.stringify(tsConstColumnSeparatorAsciiCodeNumberArray);
    }	

    return `
${outputName}=py_fn_concatenate_columns(
    py_arg_dataframe = ${inputName},
    py_arg_new_column_name = ${tsConstNewColumnName},
    py_arg_columns_to_concatenate = ${tsConstColumnsToConcatenate},
    py_arg_use_ascii_separator = ${tsConstUseAsciiSeparator},
    py_arg_column_separator_string = ${tsConstColumnSeparatorString},
    py_arg_column_separator_ascii_code = ${tsConstColumnSeparatorAsciiCode}
)

`.trim();
  }
}