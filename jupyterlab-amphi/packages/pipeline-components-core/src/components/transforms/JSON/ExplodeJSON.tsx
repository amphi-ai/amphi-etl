import { expandIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

//test : some tests can be played with both json files in test-assets. Use it as a whole and then play with different arrays and objects levels.

export class ExplodeJSON extends BaseCoreComponent {
  constructor() {
    const defaultConfig =
        {
        tsCFColumnToExplode:"",
		tsCFbooleanKeepColumns:true,
        tsCFInputnumberMaxLevel:"",
		tsCFselectCustomizableLevelSeparator:".",
        tsCFbooleanPrefixTopLevel:true,
        tsCFbooleanFlattenArraysAsRows:true,
        tsCFbooleanFlattenObjectsAsColumns:true,
		tsCFbooleanKeepRawJson:true,
        tsCFSelectoutputEngine:"pandas"		 
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          id: "tsCFinfo_json",
          text: "JSON offers nested fields. Array are like a list, Objects should not be mistaken for Python objects, it's a key value type. Also note there is no date type. It's recommanded to use a Convert Type tool after.",
          advanced: true
        },
        {
          type: "column",
          label: "Column to explode",
          id: "tsCFColumnToExplode",
          placeholder: "Select column",
		  advanced:false
        },
        {
          type: "boolean",
          label: "Keep Columns",
          id: "tsCFbooleanKeepColumns",
          advanced: true
        },
		{
          type: "inputNumber",
          tooltip: "Max Level to flatten",
          label: "Level (index 0, empty all)",
          id: "tsCFInputnumberMaxLevel",
          min: 0,
          advanced: true
        },
		{
          type: "selectCustomizable",
          label: "Level Separator",
          id: "tsCFselectCustomizableLevelSeparator",
          placeholder: "default: .",
          tooltip: "Select or provide a custom delimiter between levels.",
          options: [
            { value: ".", label: "point (.)" },
            { value: "/", label: "slash (/)" },
            { value: " ", label: "space" },
            { value: "_", label: "underscore(_)" }
          ],
          advanced: true
        },
       {
          type: "boolean",
          label: "Prefix Top Level",
          id: "tsCFbooleanPrefixTopLevel",
          advanced: true
        },
        {
          type: "boolean",
          label: "Flatten Arrays as Rows",
          id: "tsCFbooleanFlattenArraysAsRows",
          advanced: true
        },
        {
          type: "boolean",
          label: "Flatten Objects as Columns",
          id: "tsCFbooleanFlattenObjectsAsColumns",
          advanced: true
        },
        {
          type: "boolean",
          label: "Keep Raw JSON",
          id: "tsCFbooleanKeepRawJson",
          advanced: true
        },
		{
          type: "select",
          label: "Output Engine",
          id: "tsCFSelectoutputEngine",
		  options: [
            { value: "pandas", label: "Pandas", tooltip: "Mature, easy-to-use, great for small-to-medium datasets." }//,
//            { value: "polars", label: "Polars", tooltip: "Fast, memory-efficient, great for large-scale in-memory analytics." },
//            { value: "duckdb", label: "DuckDB", tooltip: "SQL-based, excellent for large datasets" }
          ],
          advanced: true
        },
      ]
    };
    const description = "Explode JSON data to column and rows";

    super("Explode JSON", "ExplodeJSON", description, "pandas_df_processor", [], "transforms.JSON", expandIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
	   "import json",
       "import pandas as pd",
       "import polars as pl",
       "import duckdb"
    ];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsExplodeJSONFunction = `
def py_fn_explode_json_column(
    df:pd.DataFrame,
    py_arg_json_col: str,
    py_arg_output_engine: str = "pandas",
    py_arg_keep_columns: bool = True,
    py_arg_max_level: int | None = None,
    py_arg_prefix_top_level: bool = False,
    py_arg_sep: str = ".",
    py_arg_flatten_arrays_as_rows: bool = True,
    py_arg_flatten_objects_as_columns: bool = True,
    py_arg_keep_raw_json: bool = False
) -> pd.DataFrame | pl.DataFrame | duckdb.DuckDBPyRelation:
    """
    Explode a column containing JSON objects or arrays into a normalized DataFrame.
    Supports arbitrarily nested arrays (array → object → array).
    
    Args :
        df (pd.DataFrame) : the input dataframe
        py_arg_json_col (str) : the json col you want to explode
        py_arg_output_engine (str) : the output engine (default = "pandas")
        py_arg_keep_columns (bool) : if you want to keep the columns (default = True)
        py_arg_max_level (int | None) :  the max nesting level(default = None)
        py_arg_prefix_top_level (bool) : if you want to prefix the top level(default = False)
        py_arg_sep (str) : the separator between levels(default = ".")
        py_arg_flatten_arrays_as_rows (bool) : if you want to flatten arrays as rows(default = True)
        py_arg_flatten_objects_as_columns (bool) : if you want to flatten objects as columns(default = True)
        py_arg_keep_raw_json (bool) : if you want to keep the raw json(default = False)
    """

    def _py_fn_flatten_object(py_arg_obj, py_arg_parent_key="", py_arg_level=1):
        items = {}

        if isinstance(py_arg_obj, dict) and py_arg_flatten_objects_as_columns:
            for key, value in py_arg_obj.items():
                new_key = (
                    f"{py_arg_parent_key}{py_arg_sep}{key}"
                    if py_arg_parent_key and py_arg_keep_columns
                    else key
                )

                if py_arg_level == 1 and py_arg_prefix_top_level:
                    new_key = f"{py_arg_json_col}{py_arg_sep}{new_key}"

                if (
                    isinstance(value, dict)
                    and (py_arg_max_level is None or py_arg_level < py_arg_max_level)
                ):
                    items.update(
                        _py_fn_flatten_object(value, new_key, py_arg_level + 1)
                    )
                else:
                    items[new_key] = value

        else:
            # SAFE: never produce empty keys
            if py_arg_parent_key:
                items[py_arg_parent_key] = py_arg_obj

        return items

    def _py_fin_expand_all_arrays(py_arg_rows: list[dict], py_arg_level: int = 1) -> list[dict]:
        expanded = py_arg_rows

        while True:
            new_expanded = []
            array_found = False

            for row in expanded:
                array_keys = [
                    key for key, value in row.items() if isinstance(value, list)
                ]

                if not array_keys:
                    new_expanded.append(row)
                    continue

                array_found = True

                for key in array_keys:
                    values = row[key] or [None]

                    for value in values:
                        new_row = row.copy()
                        del new_row[key]

                        if isinstance(value, dict):
                            flattened = _py_fn_flatten_object(value, key, py_arg_level + 1)
                            new_row.update(flattened)
                        else:
                            new_row[key] = value

                        new_expanded.append(new_row)

            expanded = new_expanded

            if not array_found or (
                py_arg_max_level is not None and py_arg_level >= py_arg_max_level
            ):
                break

            py_arg_level += 1

        return expanded

    all_rows = []

    for _, row in df.iterrows():
        raw_value = row[py_arg_json_col]

        if isinstance(raw_value, str):
            try:
                parsed_json = json.loads(raw_value)
            except json.JSONDecodeError:
                continue
        else:
            parsed_json = raw_value

        # ---- ROOT NORMALIZATION ----
        if isinstance(parsed_json, list):
            json_items = parsed_json if parsed_json else [None]
            is_root_array_of_scalars = all(
                not isinstance(x, dict) for x in json_items
            )
        else:
            json_items = [parsed_json]
            is_root_array_of_scalars = False
        # ----------------------------

        for item in json_items:
            # 👉 ONLY place where _flatten is decided
            if is_root_array_of_scalars:
                base_row = {f"{py_arg_json_col}_flatten": item}
            else:
                base_row = _py_fn_flatten_object(item)

            rows = [base_row]

            if py_arg_flatten_arrays_as_rows:
                rows = _py_fin_expand_all_arrays(rows)

            for r in rows:
                output_row = row.drop(labels=[py_arg_json_col]).to_dict()

                if py_arg_keep_raw_json:
                    output_row[py_arg_json_col] = raw_value

                output_row.update(r)
                all_rows.append(output_row)

    if py_arg_output_engine == "pandas":
        return pd.DataFrame(all_rows)
    elif py_arg_output_engine == "polars":
        return pl.DataFrame(all_rows)
    elif py_arg_output_engine == "duckdb":
        return duckdb.from_df(pd.DataFrame(all_rows))
    else:
        raise ValueError("Invalid output engine. Choose 'pandas', 'polars', or 'duckdb'.")

	    `;
    return [tsExplodeJSONFunction];
  }
  
  public generateComponentCode({ config, inputName, outputName }): string {
	let tsConstJSONColumnToExplode = 'None';
	if (config.tsCFColumnToExplode && config.tsCFColumnToExplode.value.trim() !== '' 
	) {
      tsConstJSONColumnToExplode = '"' + config.tsCFColumnToExplode.value+ '"';
    }
	
    let tsConstKeepColumns = config.tsCFbooleanKeepColumns ? 'True' : 'False';
    let tsConstPrefixTopLevel = config.tsCFbooleanPrefixTopLevel ? 'True' : 'False';
    let tsConstFlattenArraysAsRows = config.tsCFbooleanFlattenArraysAsRows ? 'True' : 'False';
    let tsConstFlattenObjectsAsColumns = config.tsCFbooleanFlattenObjectsAsColumns ? 'True' : 'False';
    let tsConstKeepRawJson = config.tsCFbooleanKeepRawJson ? 'True' : 'False';
	
	let tsConstMaxLevel = 'None';
    if (config.tsCFInputnumberMaxLevel && config.tsCFInputnumberMaxLevel.toString().trim() !== ''
	) {
      tsConstMaxLevel =  config.tsCFInputnumberMaxLevel;
    }	
   let tsConstLevelSeparator = 'None';
    if (config.tsCFselectCustomizableLevelSeparator && config.tsCFselectCustomizableLevelSeparator.trim() !== '' 
	) {
      tsConstLevelSeparator = '"' + config.tsCFselectCustomizableLevelSeparator+ '"';
    }

    return `
${outputName}=py_fn_explode_json_column(
    df=${inputName},
    py_arg_json_col=${tsConstJSONColumnToExplode},
    py_arg_output_engine= '${config.tsCFSelectoutputEngine}',
    py_arg_keep_columns= ${tsConstKeepColumns},
    py_arg_max_level = ${tsConstMaxLevel},
    py_arg_sep= ${tsConstLevelSeparator},
    py_arg_prefix_top_level = ${tsConstPrefixTopLevel},
    py_arg_flatten_arrays_as_rows= ${tsConstFlattenArraysAsRows},
    py_arg_flatten_objects_as_columns = ${tsConstFlattenObjectsAsColumns},
    py_arg_keep_raw_json = ${tsConstKeepRawJson}
)
`;
  }
}
