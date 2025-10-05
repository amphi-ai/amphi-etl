import { CompareDataframesIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class CompareDataframes extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		select_execution_engine : "pandas",
		select_comparison_mode : "data",
		select_column_mismatch : "intersect",
		boolean_index_data_for_compare : false,
		boolean_index_metadata_for_compare : true,
		boolean_check_forcount : true
		};
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Execution Engine",
          id: "select_execution_engine",
          //placeholder: "Default: Pandas", (no placeholder because defined in defaultConfig)
          options: [
            { value: "pandas", label: "Pandas", tooltip: "Mature, easy-to-use, great for small-to-medium datasets." },
            { value: "polars", label: "Polars", tooltip: "Fast, memory-efficient, great for large-scale in-memory analytics." },
            { value: "duckdb", label: "DuckDB", tooltip: "SQL-based, excellent for large datasets" }
          ],
          advanced: true
        }
		,
        {
          type: "select",
          label: "Comparison mode",
          id: "select_comparison_mode",
          //placeholder: "Default: Do nothing", (no placeholder because defined in defaultConfig)
          options: [
            { value: "data", label: "Compare rows of both inputs, output is row-level", tooltip: "Compare rows of both inputs" },
            { value: "count_data", label: "Compare rows of both inputs, output the number of difference", tooltip: "Compare rows of both inputs" },
            // { value: "field_data", label: "Compare rows of both inputs, output fields with their data in difference", tooltip: "Compare rows of both inputs (keys required)" },
            // { value: "differing_fields", label: "Compare rows of both inputs, output list of fields where there is a difference", tooltip: "Compare rows of both inputs (keys required)"  },
            { value: "metadata", label: "Compare columns of both inputs, output one row by column with difference", tooltip: "Compare columns of both inputs (name, type,...)" }//,
            //{ value: "metadata+metrics", label: "Compare columns of both inputs+metrics of each column, output one row by column with difference", tooltip: "Compare columns of both inputs (name, type,min, etc...)" }
          ],
          advanced: true
        }
		,
        {
          type: "select",
          label: "When columns differ in dataframe",
          id: "select_column_mismatch",
		  //placeholder: "Default: suffix_right", (no placeholder because defined in defaultConfig)
          options: [
            { value: "intersect", label: "Take only common columns", tooltip: "Take only common columns" },
            { value: "strict", label: "Raise an error", tooltip: "Raise an error" }
          ],
          advanced: true
        }
		//for V2
		// ,
        // {
          // type: "columns",
          // label: "Key Fields",
          // id: "selectcol_key_fields",
          // placeholder: "Column name",
		  // condition: { select_comparison_mode: ["field_data","differing_fields"]},
		  // inputNb: 1,
		  // advanced: true
        // }
		// ,
        // {
          // type: "columns",
          // label: "Fields to be ignored",
          // id: "selectcol_ignore_fields",
          // placeholder: "Column name",
		  // advanced: true
        // }
		// ,
        // {
          // type: "boolean",
          // label: "Rows order to be considered",
          // id: "boolean_index_data_for_compare",
          // condition: { select_comparison_mode: ["data","count_data","field_data","differing_fields"]},
          // advanced: true
        // }
        // ,
        // {
          // type: "boolean",
          // label: "Columns order to be considered",
          // id: "boolean_index_metadata_for_compare",
          // condition: { select_comparison_mode: ["metadata","metadata+metrics"]},
          // advanced: true
        // },
        // {
          // type: "boolean",
          // label: "Check for equal count",
          // id: "boolean_check_forcount",
          // condition: { select_comparison_mode: ["data","count_data"]},
          // advanced: true
        // },
      ],
    };
    const description = "Compare dataframe of both inputs at several levels"

    super("Compare Dataframes", "CompareDataframes", description, "pandas_df_double_processor", [], "Misc", CompareDataframesIcon, defaultConfig, form);
  }

//now always available through requirements.txt
//    public provideDependencies({ config }): string[] {
//        const engine = config?.selectExecutionEngine ?? "pandas";
//        const deps: string[] = [];
//
//        if (engine === "polars") {
//            deps.push("polars", "pyarrow");
//        } else if (engine === "duckdb") {
//            deps.push("duckdb", "pyarrow");
//        }
//        // pandas assumed available, no extra deps
//        return deps;
//    }

//condition import does not work because there are functions.
    // public provideImports({ config }): string[] {
        // const engine = config?.selectExecutionEngine ?? "pandas";
		////pandas always necessary, since output and input are still pandas df
        // const imports = ["import pandas as pd", "import typing", "from typing import *"];

        // if (engine === "polars") {
            // imports.push("import polars as pl", "import pyarrow");
        // } else if (engine === "duckdb") {
            // imports.push("import duckdb", "import pyarrow");
        // }
        // return imports;
    // }
  public provideImports({ config }): string[] {
    return [
	"import pandas as pd",
	"import polars as pl",
	"import pyarrow",
	"import duckdb",
	"import typing",
	"from typing import *"
	];
  }

 public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to compare data
    const CompareFunction = `
def pandas_align_dtypes(
    source: pd.DataFrame,
    target: pd.DataFrame,
    null_representation: str = "auto"
) -> pd.DataFrame:
    """
    Align the dtypes of 'target' to match those of 'source',
    only for columns that exist in both dataframes.

    Parameters
    ----------
    source : pd.DataFrame
        Reference dataframe (authoritative schema).
    target : pd.DataFrame
        Dataframe to be aligned.
    null_representation : {"auto", "pd.NA", "None"}, default "auto"
        - "auto": keep pandas defaults (current behavior).
        - "pd.NA": enforce pandas' scalar pd.NA for missing values.
        - "None": enforce Python None for missing values (works best for object/string).
    """
    result = target.copy()
    for col, dtype in source.dtypes.items():
        if col in result.columns:
            try:
                result[col] = result[col].astype(dtype)
            except Exception:
                # Handle problematic cases gracefully
                if pd.api.types.is_integer_dtype(dtype):
                    result[col] = result[col].astype("Int64")
                elif pd.api.types.is_string_dtype(dtype) or pd.api.types.is_object_dtype(dtype):
                    result[col] = result[col].astype("string")
                elif pd.api.types.is_datetime64_any_dtype(dtype):
                    result[col] = pd.to_datetime(result[col], errors="coerce")
                else:
                    pass

            # enforce null representation
            if null_representation == "pd.NA":
                result[col] = result[col].where(~result[col].isna(), pd.NA)
            elif null_representation == "None":
                result[col] = result[col].where(~result[col].isna(), None)

    return result
def get_safe_origin_column_name(columns, base_name="origin_data"):
    i = 0
    while True:
        candidate = f"{base_name}{i}" if i > 0 else base_name
        if candidate not in columns:
            return candidate
        i += 1
####pandas#########
def pandas_apply_rounding_by_type(
    df: pd.DataFrame,
    rounding: Optional[Dict[str, Union[int, str]]]
) -> pd.DataFrame:
    if not rounding:
        return df
    df = df.copy()

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]) and "float" in rounding:
            df[col] = df[col].round(rounding["float"])
        elif pd.api.types.is_datetime64_any_dtype(df[col]) and "datetime" in rounding:
            df[col] = df[col].dt.round(rounding["datetime"])

    return df

def compare_pandas_data(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    column_mismatch: str = "intersect",  # or "strict"
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
    check_forcount: bool = True,
) -> pd.DataFrame:
    if index_data_for_compare:
        df1 = df1.reset_index(drop=True)
        df2 = df2.reset_index(drop=True)
        df1["_row_index_for_compare"] = df1.index
        df2["_row_index_for_compare"] = df2.index

    # Step 1: determine column set
    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    if column_mismatch == "strict":
        if cols1 != cols2:
            missing_1 = cols2 - cols1
            missing_2 = cols1 - cols2
            raise ValueError(
                f"Column mismatch: extra in df2={missing_1}, extra in df1={missing_2}"
            )
        common_cols = list(df1.columns)  # preserve order
    elif column_mismatch == "intersect":
        common_cols = [col for col in df1.columns if col in df2.columns]
    else:
        raise ValueError(f"Invalid column_mismatch value: {column_mismatch}")

    # Step 2: restrict to common columns and apply rounding
    df1 = pandas_apply_rounding_by_type(df1[common_cols].copy(), rounding)
    df2 = pandas_apply_rounding_by_type(df2[common_cols].copy(), rounding)

    # Step 3: assign origin + dynamic column names
    all_cols = set(df1.columns) | set(df2.columns)

    origin_col = get_safe_origin_column_name(all_cols, base_name="origin_data")
    row_count_col = get_safe_origin_column_name(all_cols | {origin_col}, base_name="row_count")
    diff_type_col = get_safe_origin_column_name(all_cols | {origin_col, row_count_col}, base_name="difference_type")
    total_diff_col = get_safe_origin_column_name(all_cols | {origin_col, row_count_col, diff_type_col}, base_name="total_count_diff")

    df1[origin_col] = "left"
    df2[origin_col] = "right"

    # Step 4: union + group counts
    combined = pd.concat([df1, df2], ignore_index=True)
    group_cols = [col for col in combined.columns if col != origin_col]

    grouped = (
        combined.groupby(group_cols + [origin_col], dropna=False)
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )

    if "left" not in grouped:
        grouped["left"] = 0
    if "right" not in grouped:
        grouped["right"] = 0

    results = []

    # (a) rows only in one side
    only_one_side = grouped[(grouped["left"] == 0) | (grouped["right"] == 0)].copy()
    if not only_one_side.empty:
        for side in ["left", "right"]:
            side_part = only_one_side[group_cols].copy()
            side_part[origin_col] = side
            side_part[row_count_col] = only_one_side[side]
            side_part = side_part[side_part[row_count_col] > 0]
            if not side_part.empty:
                side_part[diff_type_col] = "row_differs"
                side_part[total_diff_col] = side_part[row_count_col]  # other side is 0
                results.append(side_part)

    # (b) rows present in both but with different counts
    if check_forcount:
        count_diff = grouped[
            (grouped["left"] > 0) & (grouped["right"] > 0) & (grouped["left"] != grouped["right"])
        ].copy()
        if not count_diff.empty:
            diff_val = (count_diff["left"] - count_diff["right"]).abs()
            for side in ["left", "right"]:
                side_part = count_diff[group_cols].copy()
                side_part[origin_col] = side
                side_part[row_count_col] = count_diff[side]
                side_part[diff_type_col] = "count_differs"
                side_part[total_diff_col] = diff_val
                results.append(side_part)

    if results:
        diff_rows = pd.concat(results, ignore_index=True)
    else:
        # ensure correct dtypes when empty
        empty_dict = {col: pd.Series(dtype=df1[col].dtype if col in df1.columns else "object") for col in group_cols}
        empty_dict.update({
        origin_col: pd.Series(dtype="object"),
        row_count_col: pd.Series(dtype="int64"),
        diff_type_col: pd.Series(dtype="object"),
        total_diff_col: pd.Series(dtype="int64"),
        })
        diff_rows = pd.DataFrame(empty_dict)

# Final step: enforce schema consistency with df1
    diff_rows = pandas_align_dtypes(df1, diff_rows,null_representation="pd.NA")


    return diff_rows
	
def compare_pandas_count_data(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
    check_forcount: bool = True
) -> pd.DataFrame:
    # Reuse compare_pandas_data to get the differing rows
    diff_rows = compare_pandas_data(
        df1=df1,
        df2=df2,
        column_mismatch=column_mismatch,
        rounding=rounding,
        index_data_for_compare=index_data_for_compare,
        check_forcount=check_forcount
    )

    # Derive dynamic column name for row_count
    row_count_col = get_safe_origin_column_name(set(diff_rows.columns), base_name="row_count")

    # Return single-row, single-column DataFrame
    return pd.DataFrame({row_count_col: [len(diff_rows)]})
	
def get_metadata_as_df(df: pd.DataFrame, add_index: bool = False) -> pd.DataFrame:
    meta = [
        {"column": col, "type": str(dtype)}
        for col, dtype in df.dtypes.items()
    ]
    if add_index:
        for i, row in enumerate(meta):
            row["index"] = i
    return pd.DataFrame(meta)
    
def compare_pandas_metadata(df1: pd.DataFrame, df2: pd.DataFrame, index_metadata_for_compare: bool = False):
    meta1 = get_metadata_as_df(df1, add_index=index_metadata_for_compare)
    meta2 = get_metadata_as_df(df2, add_index=index_metadata_for_compare)
    return compare_pandas_data(meta1, meta2)

def get_metadata_metrics_as_df(df: pd.DataFrame, add_index: bool = False) -> pd.DataFrame:
    rows = []
    for i, col in enumerate(df.columns):
        dtype = str(df[col].dtype)
        col_data = df[col].dropna()

        base = {"column": col}
        if add_index:
            base["index"] = i

        rows.append({**base, "key": "type", "value": dtype})
        rows.append({**base, "key": "count", "value": len(col_data)})
        rows.append({**base, "key": "count_distinct", "value": col_data.nunique()})

        if pd.api.types.is_numeric_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
            rows.append({**base, "key": "min", "value": col_data.min()})
            rows.append({**base, "key": "max", "value": col_data.max()})

    return pd.DataFrame(rows)

def compare_pandas_metadata_and_metrics(df1: pd.DataFrame, df2: pd.DataFrame, index_metadata_for_compare: bool = False):
    meta1 = get_metadata_metrics_as_df(df1, add_index=index_metadata_for_compare)
    meta2 = get_metadata_metrics_as_df(df2, add_index=index_metadata_for_compare)
    return compare_pandas_data(meta1, meta2)

def compare_pandas_data_field(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    key_fields: list[str],
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
) -> pd.DataFrame:
    # Validate key fields
    if not key_fields:
        raise ValueError("key_fields must be provided")
        
    if index_data_for_compare:
        df1 = df1.reset_index(drop=True)
        df2 = df2.reset_index(drop=True)
        df1["_row_index_for_compare"] = df1.index
        df2["_row_index_for_compare"] = df2.index
        
    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    if column_mismatch == "strict":
        if cols1 != cols2:
            raise ValueError(f"Column mismatch: df1={cols1}, df2={cols2}")
        common_cols = list(cols1)
    elif column_mismatch == "intersect":
        common_cols = list(cols1 & cols2)
    else:
        raise ValueError(f"Invalid column_mismatch: {column_mismatch}")

    for k in key_fields:
        if k not in common_cols:
            raise ValueError(f"Key field {k} not in both datasets")

    value_fields = [col for col in common_cols if col not in key_fields]

    df1 = pandas_apply_rounding_by_type(df1[common_cols].copy(), rounding)
    df2 = pandas_apply_rounding_by_type(df2[common_cols].copy(), rounding)

    df1_keyed = df1.set_index(key_fields)
    df2_keyed = df2.set_index(key_fields)

    joined = df1_keyed.join(df2_keyed, lsuffix="__left", rsuffix="__right", how="outer")

    rows = []
    for field in value_fields:
        left_col = f"{field}__left"
        right_col = f"{field}__right"

        left_values = joined[left_col]
        right_values = joined[right_col]

        diff_mask = (left_values != right_values) | (
            left_values.isnull() ^ right_values.isnull()
        )

        differing = joined[diff_mask]
        for key_tuple, row in differing.iterrows():
            key_dict = (
                dict(zip(key_fields, [key_tuple]))
                if isinstance(key_tuple, (str, int))
                else dict(zip(key_fields, key_tuple))
            )
            if pd.notna(row[left_col]):
                rows.append({**key_dict, "Field": field, "Value": str(row[left_col]), "Origin": "left"})
            if pd.notna(row[right_col]):
                rows.append({**key_dict, "Field": field, "Value": str(row[right_col]), "Origin": "right"})

    return pd.DataFrame(rows)
    
def compare_pandas_differing_fields(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    key_fields: list[str],
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
) -> pd.DataFrame:
    diffs = compare_pandas_data_field(
        df1, df2, key_fields=key_fields,
        column_mismatch=column_mismatch,
        rounding=rounding,
        index_data_for_compare=index_data_for_compare
    )

    # Create a key tuple to count unique key combinations
    diffs["_key"] = diffs[key_fields].astype(str).agg("§".join, axis=1)

    summary = (
        diffs.groupby("Field")["_key"]
        .nunique()
        .reset_index()
        .rename(columns={"_key": "CountDistinctKeys"})
        .sort_values("Field")
        .reset_index(drop=True)
    )

    return summary
    
def compare_pandas(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    mode: str = "data",  # "data", "metadata", "metadata+metrics"
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    key_fields: Optional[list[str]] = None,
    index_data_for_compare: bool = False,
    index_metadata_for_compare: bool = True,    
    ignore_fields: Optional[list[str]] = None,
    check_forcount: bool = True
) -> pd.DataFrame:
    
    if ignore_fields:
        df1 = df1.drop(columns=[f for f in ignore_fields if f in df1.columns])
        df2 = df2.drop(columns=[f for f in ignore_fields if f in df2.columns])


    if mode == "data":
        return compare_pandas_data(
            df1,
            df2,
            column_mismatch=column_mismatch,
            rounding=rounding,
            index_data_for_compare=index_data_for_compare,
			check_forcount=check_forcount
        )
    elif mode == "count_data":
        return compare_pandas_count_data(
            df1,
            df2,
            column_mismatch=column_mismatch,
            rounding=rounding,
            index_data_for_compare=index_data_for_compare,
			check_forcount=check_forcount
        )
    elif mode == "metadata":
        return compare_pandas_metadata(
            df1,
            df2,
            index_metadata_for_compare
        )
    elif mode == "metadata+metrics":
        return compare_pandas_metadata_and_metrics(
            df1,
            df2,
            index_metadata_for_compare
        )
    elif mode == "field_data":
        return compare_pandas_data_field(
            df1,
            df2,
            key_fields=key_fields,
            column_mismatch=column_mismatch,
            rounding=rounding,
            index_data_for_compare=index_data_for_compare,
        )
    elif mode == "differing_fields":
        return compare_pandas_differing_fields(
            df1,
            df2,
            key_fields=key_fields,
            column_mismatch=column_mismatch,
            rounding=rounding,
            index_data_for_compare=index_data_for_compare,
        )
    else:
        raise ValueError(f"Unsupported comparison mode: {mode}")

####polars#########
def polars_apply_rounding_by_type(
    df: pl.DataFrame,
    rounding: Optional[Dict[str, Union[int, str]]]
) -> pl.DataFrame:
    if not rounding:
        return df

    for col in df.columns:
        dtype = df.schema[col]

        # Check for numeric types
        if isinstance(dtype, (pl.Float32, pl.Float64)) and "float" in rounding:
            df = df.with_columns(pl.col(col).round(rounding["float"]).alias(col))

        # Check for datetime types
        elif isinstance(dtype, (pl.Datetime, pl.Date, pl.Time)) and "datetime" in rounding:
            df = df.with_columns(pl.col(col).dt.round(rounding["datetime"]).alias(col))

    return df

def compare_polars_data(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
    check_forcount: bool = True,
) -> pl.DataFrame:
    def get_safe_origin_column_name(columns, base_name="origin_data"):
        i = 0
        while True:
            candidate = f"{base_name}{i}" if i > 0 else base_name
            if candidate not in columns:
                return candidate
            i += 1

    if index_data_for_compare:
        df1 = df1.with_row_count("_row_index_for_compare")
        df2 = df2.with_row_count("_row_index_for_compare")

    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    if column_mismatch == "strict":
        if cols1 != cols2:
            raise ValueError(f"Column mismatch: df1={cols1}, df2={cols2}")
        common_cols = list(cols1)
    elif column_mismatch == "intersect":
        common_cols = list(cols1 & cols2)
    else:
        raise ValueError(f"Invalid column_mismatch: {column_mismatch}")

    # Ensure sets for safe name logic
    common_cols_set = set(common_cols)

    # Dynamic safe names
    origin_col = get_safe_origin_column_name(common_cols_set, "origin_data")
    row_count_col = get_safe_origin_column_name(common_cols_set | {origin_col}, "row_count")
    diff_type_col = get_safe_origin_column_name(common_cols_set | {origin_col, row_count_col}, "difference_type")
    total_diff_col = get_safe_origin_column_name(common_cols_set | {origin_col, row_count_col, diff_type_col}, "total_count_diff")


    df1 = df1.select(common_cols).with_columns(pl.lit("left").alias(origin_col))
    df2 = df2.select(common_cols).with_columns(pl.lit("right").alias(origin_col))

    combined = pl.concat([df1, df2], how="vertical_relaxed")

    if not check_forcount:
        # Simple row-diff mode
        grouped = (
            combined
            .group_by([col for col in combined.columns if col != origin_col])
            .agg([pl.col(origin_col).min().alias("min_origin"), pl.col(origin_col).max().alias("max_origin")])
            .filter(pl.col("min_origin") == pl.col("max_origin"))
            .with_columns(pl.col("min_origin").alias(origin_col))
            .drop(["min_origin", "max_origin"])
            .with_columns([
                pl.lit(1).alias(row_count_col),
                pl.lit("row_differs").alias(diff_type_col),
                pl.lit(1).alias(total_diff_col),
            ])
        )
        return grouped

    # Count-based mode
    per_origin_counts = (
        combined.group_by(common_cols + [origin_col]).agg(pl.len().alias("cnt"))
    )

    wide = (
        per_origin_counts.pivot(values="cnt", index=common_cols, on=origin_col)
        .fill_null(0)
    )

    left_count = pl.col("left")
    right_count = pl.col("right")

    only_one_side = (
        wide.filter((left_count == 0) | (right_count == 0))
        .with_columns([
            pl.when(left_count == 0).then(pl.lit("right")).otherwise(pl.lit("left")).alias(origin_col),
            pl.when(left_count == 0).then(right_count).otherwise(left_count).alias(row_count_col),
            pl.lit("row_differs").alias(diff_type_col),
            pl.when(left_count == 0).then(right_count).otherwise(left_count).alias(total_diff_col),
        ])
        .select([*common_cols, origin_col, row_count_col, diff_type_col, total_diff_col])
    )

    count_differs = (
        wide.filter((left_count > 0) & (right_count > 0) & (left_count != right_count))
        .pipe(lambda df: pl.concat([
            df.with_columns([
                pl.lit("left").alias(origin_col),
                left_count.alias(row_count_col),
                pl.lit("count_differs").alias(diff_type_col),
                (left_count.cast(pl.Int64) - right_count.cast(pl.Int64)).abs().alias(total_diff_col),
            ]),
            df.with_columns([
                pl.lit("right").alias(origin_col),
                right_count.alias(row_count_col),
                pl.lit("count_differs").alias(diff_type_col),
                (left_count.cast(pl.Int64) - right_count.cast(pl.Int64)).abs().alias(total_diff_col),
            ])
        ]))
        .select([*common_cols, origin_col, row_count_col, diff_type_col, total_diff_col])
    )

    result = pl.concat([only_one_side, count_differs], how="vertical_relaxed")
    return result
    
def compare_polars_count_data(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
    check_forcount: bool = True
) -> pl.DataFrame:
    diff_rows = compare_polars_data(
        df1,
        df2,
        column_mismatch=column_mismatch,
        rounding=rounding,
        index_data_for_compare=index_data_for_compare,
    )
    return pl.DataFrame({"diff_count": [diff_rows.height]})


def compare_polars_data_field(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    key_fields: list[str],
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
) -> pl.DataFrame:
    if not key_fields:
        raise ValueError("key_fields must be provided")

    if index_data_for_compare:
        df1 = df1.with_row_count("_row_index_for_compare")
        df2 = df2.with_row_count("_row_index_for_compare")
        key_fields = ["_row_index_for_compare"] + key_fields

    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    if column_mismatch == "strict":
        if cols1 != cols2:
            raise ValueError(f"Column mismatch: df1={cols1}, df2={cols2}")
        common_cols = list(cols1)
    elif column_mismatch == "intersect":
        common_cols = list(cols1 & cols2)
    else:
        raise ValueError(f"Invalid column_mismatch: {column_mismatch}")

    for k in key_fields:
        if k not in common_cols:
            raise ValueError(f"Key field {k} not in both datasets")

    value_fields = [col for col in common_cols if col not in key_fields]

    df1 = polars_apply_rounding_by_type(df1.select(common_cols), rounding)
    df2 = polars_apply_rounding_by_type(df2.select(common_cols), rounding)

    df1 = df1.with_columns(pl.lit("left").alias("origin"))
    df2 = df2.with_columns(pl.lit("right").alias("origin"))

    combined = pl.concat([df1, df2], how="vertical_relaxed")

    melted = combined.melt(id_vars=key_fields + ["origin"], value_vars=value_fields, variable_name="Field", value_name="Value")

    pivoted = melted.pivot(
        values="Value",
        index=key_fields + ["Field"],
        columns="origin"
    )

    # Keep rows where left and right differ
    result = pivoted.filter(
        (pl.col("left") != pl.col("right")) | (pl.col("left").is_null() ^ pl.col("right").is_null())
    )

    # Flatten back to left/right rows
    return pl.concat([
        result.select(key_fields + ["Field", pl.col("left").cast(str).alias("Value")]).with_columns(pl.lit("left").alias("Origin")),
        result.select(key_fields + ["Field", pl.col("right").cast(str).alias("Value")]).with_columns(pl.lit("right").alias("Origin")),
    ])
def compare_polars_differing_fields(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    key_fields: list[str],
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
) -> pl.DataFrame:
    diffs = compare_polars_data_field(
        df1, df2,
        key_fields=key_fields,
        column_mismatch=column_mismatch,
        rounding=rounding,
        index_data_for_compare=index_data_for_compare,
    )

    # Reconstruct key to group by Field
    if "_row_index_for_compare" in diffs.columns:
        key_fields = ["_row_index_for_compare"] + [k for k in key_fields if k != "_row_index_for_compare"]

    diffs = diffs.with_columns([
        pl.concat_str([pl.col(k).cast(str) for k in key_fields], separator="§").alias("_key")
    ])

    return (
        diffs.group_by("Field")
        .agg(pl.col("_key").n_unique().alias("CountDistinctKeys"))
        .sort("Field")
    )

def get_polars_metadata(df: pl.DataFrame, add_index: bool = False) -> pl.DataFrame:
    rows = []
    for idx, (col, dtype) in enumerate(df.schema.items()):
        row = {"column": col, "type": str(dtype)}
        if add_index:
            row["index"] = idx
        rows.append(row)
    return pl.DataFrame(rows)

def compare_polars_metadata(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    index_metadata_for_compare: bool = False
) -> pl.DataFrame:
    meta1 = get_polars_metadata(df1, add_index=index_metadata_for_compare)
    meta2 = get_polars_metadata(df2, add_index=index_metadata_for_compare)
    return compare_polars_data(meta1, meta2)

def get_polars_metadata_metrics(df: pl.DataFrame, add_index: bool = False) -> pl.DataFrame:
    rows = []
    for idx, col in enumerate(df.columns):
        dtype = str(df.schema[col])
        col_data = df.select(col).drop_nulls()

        base = {"column": col}
        if add_index:
            base["index"] = idx

        rows.append({**base, "key": "type", "value": dtype})
        rows.append({**base, "key": "count", "value": col_data.height})
        rows.append({**base, "key": "count_distinct", "value": col_data.select(pl.col(col).n_unique()).item()})

        if df.schema[col] in (pl.Float32, pl.Float64, pl.Int32, pl.Int64, pl.Datetime, pl.Date, pl.Time):
            stats = col_data.select([
              pl.col(col).min().alias("min_val"),
              pl.col(col).max().alias("max_val")
              ])

            rows.append({**base, "key": "min", "value": stats[0, "min_val"]})
            rows.append({**base, "key": "max", "value": stats[0, "max_val"]})
    return pl.DataFrame(rows)
    
def compare_polars_metadata_and_metrics(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    index_metadata_for_compare: bool = False
) -> pl.DataFrame:
    meta1 = get_polars_metadata_metrics(df1, add_index=index_metadata_for_compare)
    meta2 = get_polars_metadata_metrics(df2, add_index=index_metadata_for_compare)
    return compare_polars_data(meta1, meta2)
    
def compare_polars(
    df1: pl.DataFrame,
    df2: pl.DataFrame,
    mode: str = "data",
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    key_fields: Optional[list[str]] = None,
    index_data_for_compare: bool = False,
    index_metadata_for_compare: bool = False,
    ignore_fields: Optional[list[str]] = None,
    check_forcount: bool = True
):
    if ignore_fields:
        df1 = df1.drop([f for f in ignore_fields if f in df1.columns])
        df2 = df2.drop([f for f in ignore_fields if f in df2.columns])
        
    if mode == "data":
        return compare_polars_data(df1, df2, column_mismatch, rounding, index_data_for_compare,check_forcount)
    elif mode == "count_data":
        return compare_polars_count_data(df1, df2, column_mismatch, rounding, index_data_for_compare,check_forcount)
    elif mode == "field_data":
        return compare_polars_data_field(df1, df2, key_fields=key_fields, column_mismatch=column_mismatch, rounding=rounding, index_data_for_compare=index_data_for_compare)
    elif mode == "differing_fields":
        return compare_polars_differing_fields(df1, df2, key_fields=key_fields, column_mismatch=column_mismatch, rounding=rounding, index_data_for_compare=index_data_for_compare)
    elif mode == "metadata":
        return compare_polars_metadata(df1, df2, index_metadata_for_compare=index_metadata_for_compare)
    elif mode == "metadata+metrics":
        return compare_polars_metadata_and_metrics(df1, df2, index_metadata_for_compare=index_metadata_for_compare)
    else:
        raise NotImplementedError(f"Polars mode '{mode}' not yet implemented")

####duckdb#########

# def duckdb_apply_rounding_by_type(
    # df: pd.DataFrame,
    # rounding: Optional[Dict[str, Union[int, str]]]
    # ) -> pd.DataFrame:
    # if not rounding:
        # return df
    # df = df.copy()
    # for col in df.columns:
        # if pd.api.types.is_numeric_dtype(df[col]) and "float" in rounding:
            # df[col] = df[col].round(rounding["float"])
        # elif pd.api.types.is_datetime64_any_dtype(df[col]) and "datetime" in rounding:
            # df[col] = df[col].dt.round(rounding["datetime"])
    # return df
def duckdb_apply_rounding_by_type(
    df: pd.DataFrame,
    rounding: Optional[Dict[str, Union[int, str]]],
    table_name: str = "_rounding_input"
) -> pd.DataFrame:
    if not rounding:
        return df

    conn = duckdb.connect()
    conn.register(table_name, df)

    select_exprs = []
    for col in df.columns:
        dtype = df[col].dtype
		#here we do not use f string because the backslash is broken when building
        if pd.api.types.is_numeric_dtype(dtype) and "float" in rounding:
            digits = rounding["float"]
            select_exprs.append('round("' + col + '", ' + str(float) + ') AS "' + col + '"')
        elif pd.api.types.is_datetime64_any_dtype(dtype) and "datetime" in rounding:
            unit = rounding["datetime"]
            select_exprs.append("date_trunc('" + unit + "', \"" + col + "\") AS \"" + col + "\"")
        else:
            select_exprs.append('"' + col + '"')

    query = f"SELECT {', '.join(select_exprs)} FROM {table_name}"
    result = conn.execute(query).fetchdf()
    conn.close()
    return result    
    
def compare_duckdb_data(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
    check_forcount: bool = True
) -> pd.DataFrame:
    conn = duckdb.connect()

    if index_data_for_compare:
        df1 = df1.reset_index(drop=True)
        df2 = df2.reset_index(drop=True)
        df1["_row_index_for_compare"] = df1.index
        df2["_row_index_for_compare"] = df2.index

    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    if column_mismatch == "strict":
        if cols1 != cols2:
            raise ValueError(f"Column mismatch: df1={cols1}, df2={cols2}")
        common_cols = list(df1.columns)
    elif column_mismatch == "intersect":
        common_cols = [c for c in df1.columns if c in df2.columns]
    else:
        raise ValueError(f"Invalid column_mismatch: {column_mismatch}")

    # Apply rounding before analysis
    df1 = duckdb_apply_rounding_by_type(df1[common_cols].copy(), rounding)
    df2 = duckdb_apply_rounding_by_type(df2[common_cols].copy(), rounding)

    # Dynamic safe column names
    base_cols = set(df1.columns) | set(df2.columns)
    origin_col = get_safe_origin_column_name(base_cols, base_name="origin_data")
    row_count_col = get_safe_origin_column_name(base_cols | {origin_col}, base_name="row_count")
    diff_type_col = get_safe_origin_column_name(base_cols | {origin_col, row_count_col}, base_name="difference_type")
    total_diff_col = get_safe_origin_column_name(
        base_cols | {origin_col, row_count_col, diff_type_col}, base_name="total_count_diff"
    )

    df1[origin_col] = "left"
    df2[origin_col] = "right"

    conn.register("df1", df1)
    conn.register("df2", df2)

    quoted_cols = ", ".join(f'"{c}"' for c in common_cols)
    #⚠during dev, Amphi added a f right in the middle of the query so we split th  query in two strings
    query = f"""
        WITH unioned AS (
            SELECT {quoted_cols}, {origin_col} FROM df1
            UNION ALL
            SELECT {quoted_cols}, {origin_col} FROM df2
        ),
        per_origin AS (
            SELECT {quoted_cols}, {origin_col}, COUNT(*)::BIGINT AS cnt
            FROM unioned
            GROUP BY {quoted_cols}, {origin_col}
        ),
        pivoted AS (
            SELECT {quoted_cols},
                   COALESCE(MAX(CASE WHEN {origin_col}='left' THEN cnt END), 0) AS left_count,
                   COALESCE(MAX(CASE WHEN {origin_col}='right' THEN cnt END), 0) AS right_count
            FROM per_origin
            GROUP BY {quoted_cols}
        ),
        only_one_side AS (
            SELECT {quoted_cols},
                   CASE WHEN left_count=0 THEN 'right' ELSE 'left' END AS {origin_col},
                   CASE WHEN left_count=0 THEN right_count ELSE left_count END AS {row_count_col},
                   'row_differs' AS {diff_type_col},
                   CASE WHEN left_count=0 THEN right_count ELSE left_count END AS {total_diff_col}
            FROM pivoted
            WHERE left_count=0 OR right_count=0
        ),
        count_differs AS (
            SELECT {quoted_cols},
                   side.{origin_col},
                   CASE WHEN side.{origin_col}='left' THEN p.left_count ELSE p.right_count END AS {row_count_col},
                   'count_differs' AS {diff_type_col},
                   ABS(p.left_count - p.right_count) AS {total_diff_col}
            FROM pivoted p
            CROSS JOIN 
            (select"""+f""" 'left' AS {origin_col} UNION ALL SELECT 'right' AS {origin_col}) side
            WHERE p.left_count>0 AND p.right_count>0 AND p.left_count<>p.right_count
        )
        SELECT * FROM only_one_side
        UNION ALL
        SELECT * FROM count_differs
    """
    result = conn.execute(query).fetchdf()
    conn.close()

    # Enforce consistent column order
    ordered_cols = common_cols + [origin_col, row_count_col, diff_type_col, total_diff_col]
    result = result[ordered_cols]

    # Enforce consistent dtypes
    dtype_map = {
        origin_col: "string",
        row_count_col: "int64",
        diff_type_col: "string",
        total_diff_col: "int64",
    }
    for col, dtype in dtype_map.items():
        result[col] = result[col].astype(dtype)

    # Empty safeguard
    if result.empty:
        schema = {c: df1[c].dtype for c in common_cols}
        schema.update(dtype_map)
        return pd.DataFrame({col: pd.Series(dtype=dtype) for col, dtype in schema.items()})[ordered_cols]

    return result



def compare_duckdb_count_data(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
    check_forcount: bool = True
) -> pd.DataFrame:
    diff_df = compare_duckdb_data(
        df1,
        df2,
        column_mismatch=column_mismatch,
        rounding=rounding,
        index_data_for_compare=index_data_for_compare,
		check_forcount=check_forcount
    )
    return pd.DataFrame({"diff_count": [len(diff_df)]})


def compare_duckdb_data_field(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    key_fields: list[str],
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
) -> pd.DataFrame:
    import duckdb

    if not key_fields:
        raise ValueError("key_fields must be provided")

    if index_data_for_compare:
        df1 = df1.reset_index(drop=True)
        df2 = df2.reset_index(drop=True)
        df1["_row_index_for_compare"] = df1.index
        df2["_row_index_for_compare"] = df2.index
        key_fields = ["_row_index_for_compare"] + key_fields

    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    if column_mismatch == "strict":
        if cols1 != cols2:
            raise ValueError(f"Column mismatch: df1={cols1}, df2={cols2}")
        common_cols = list(cols1)
    elif column_mismatch == "intersect":
        common_cols = list(cols1 & cols2)
    else:
        raise ValueError(f"Invalid column_mismatch: {column_mismatch}")

    # Apply rounding manually to float and datetime columns
    def apply_rounding(df):
        if not rounding:
            return df
        df = df.copy()
        for col in df.columns:
            if col not in rounding:
                continue
            if pd.api.types.is_numeric_dtype(df[col]) and "float" in rounding:
                df[col] = df[col].round(rounding["float"])
            elif pd.api.types.is_datetime64_any_dtype(df[col]) and "datetime" in rounding:
                df[col] = df[col].dt.round(rounding["datetime"])
        return df

    df1 = apply_rounding(df1[list(common_cols)])
    df2 = apply_rounding(df2[list(common_cols)])

    value_fields = [col for col in common_cols if col not in key_fields]

    # Rename left/right columns
    df1 = df1[key_fields + value_fields].copy()
    df2 = df2[key_fields + value_fields].copy()
    df1.columns = key_fields + [f"{col}__left" for col in value_fields]
    df2.columns = key_fields + [f"{col}__right" for col in value_fields]

    conn = duckdb.connect()
    conn.register("df1", df1)
    conn.register("df2", df2)

    key_expr = ", ".join(f'"{k}"' for k in key_fields)
    joined = conn.execute(f"""
        SELECT *
        FROM df1
        FULL OUTER JOIN df2
        USING ({key_expr})
    """).fetchdf()

    result_rows = []

    for field in value_fields:
        left_col = f"{field}__left"
        right_col = f"{field}__right"
        for _, row in joined.iterrows():
            key_vals = {k: row[k] for k in key_fields}
            left_val = row.get(left_col, None)
            right_val = row.get(right_col, None)
            if pd.isna(left_val) and pd.isna(right_val):
                continue
            if left_val != right_val:
                if pd.notna(left_val):
                    result_rows.append({**key_vals, "Field": field, "Value": str(left_val), "Origin": "left"})
                if pd.notna(right_val):
                    result_rows.append({**key_vals, "Field": field, "Value": str(right_val), "Origin": "right"})

    return pd.DataFrame(result_rows)


def compare_duckdb_differing_fields(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    key_fields: list[str],
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_data_for_compare: bool = False,
) -> pd.DataFrame:
    diffs = compare_duckdb_data_field(
        df1,
        df2,
        key_fields=key_fields,
        column_mismatch=column_mismatch,
        rounding=rounding,
        index_data_for_compare=index_data_for_compare,
    )

    if "_row_index_for_compare" in diffs.columns:
        key_fields = ["_row_index_for_compare"] + [k for k in key_fields if k != "_row_index_for_compare"]

    diffs["_key"] = diffs[key_fields].astype(str).agg("§".join, axis=1)

    return (
        diffs.groupby("Field")["_key"]
        .nunique()
        .reset_index()
        .rename(columns={"_key": "CountDistinctKeys"})
        .sort_values("Field")
        .reset_index(drop=True)
    )

def compare_duckdb_metadata(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    index_metadata_for_compare: bool = False
) -> pd.DataFrame:
    meta1 = pd.DataFrame([
        {"column": col, "type": str(dtype), **({"index": i} if index_metadata_for_compare else {})}
        for i, (col, dtype) in enumerate(df1.dtypes.items())
    ])
    meta2 = pd.DataFrame([
        {"column": col, "type": str(dtype), **({"index": i} if index_metadata_for_compare else {})}
        for i, (col, dtype) in enumerate(df2.dtypes.items())
    ])
    return compare_duckdb_data(meta1, meta2, column_mismatch="intersect")


def compare_duckdb_metadata_and_metrics(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    index_metadata_for_compare: bool = False
) -> pd.DataFrame:
    def get_metadata_metrics(df: pd.DataFrame,rounding: Optional[Dict[str, Union[int, str]]] = None) -> pd.DataFrame:
        df = df.copy()

        if rounding:
            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]) and "float" in rounding:
                    df[col] = df[col].round(rounding["float"])
                elif pd.api.types.is_datetime64_any_dtype(df[col]) and "datetime" in rounding:
                    df[col] = df[col].dt.round(rounding["datetime"])

        rows = []
        for idx, col in enumerate(df.columns):
            dtype = str(df[col].dtype)
            col_data = df[col].dropna()

            base = {"column": col}
            if index_metadata_for_compare:
                base["index"] = idx

            rows.append({**base, "key": "type", "value": dtype})
            rows.append({**base, "key": "count", "value": len(col_data)})
            rows.append({**base, "key": "count_distinct", "value": col_data.nunique()})

            if pd.api.types.is_numeric_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
                rows.append({**base, "key": "min", "value": col_data.min()})
                rows.append({**base, "key": "max", "value": col_data.max()})

        return pd.DataFrame(rows)


    meta1 = get_metadata_metrics(df1)
    meta2 = get_metadata_metrics(df2)
    return compare_duckdb_data(meta1, meta2, column_mismatch="intersect")



def compare_duckdb(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    mode: str = "data",
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    key_fields: Optional[list[str]] = None,
    index_data_for_compare: bool = False,
    index_metadata_for_compare: bool = False,
    ignore_fields: Optional[list[str]] = None,
    check_forcount: bool = True
) -> pd.DataFrame:
    if ignore_fields:
        df1 = df1.drop(columns=[f for f in ignore_fields if f in df1.columns])
        df2 = df2.drop(columns=[f for f in ignore_fields if f in df2.columns])
    if mode == "data":
        return compare_duckdb_data(df1, df2, column_mismatch, rounding,index_data_for_compare,check_forcount)
    elif mode == "count_data":
        return compare_duckdb_count_data(df1, df2, column_mismatch, rounding,index_data_for_compare,check_forcount)
    elif mode == "field_data":
        return compare_duckdb_data_field(df1, df2, key_fields, column_mismatch, rounding, index_data_for_compare)
    elif mode == "differing_fields":
        return compare_duckdb_differing_fields(df1, df2, key_fields, column_mismatch, rounding, index_data_for_compare)
    elif mode == "metadata":
        return compare_duckdb_metadata(df1, df2, index_metadata_for_compare)
    elif mode == "metadata+metrics":
        return compare_duckdb_metadata_and_metrics(df1, df2, index_metadata_for_compare)
    else:
        raise ValueError(f"Unsupported DuckDB mode: {mode}")
#########general function####################

def compare_datasets(
    df1,
    df2,
    execution_engine: str = "pandas",
    mode: str = "data",
    column_mismatch: str = "intersect",
    rounding: Optional[Dict[str, Union[int, str]]] = None,
    key_fields: Optional[list[str]] = None,
    index_data_for_compare: bool = False,
    index_metadata_for_compare: bool = True,
	check_forcount: bool = True,
    ignore_fields: Optional[list[str]] = None,
):
    #Parameters:
		#execution_engine : execution engine (pandas, polars, duckdb...)
        #df1, df2 (pd.DataFrame): DataFrames to join
        #mode : data, count_data,field_data,differing_fields,metadata,metadata+metrics
        #column_mismatch : intersect (common column), strict (raise error)
        #rounding : optional rounding for numeric value #rounding={"float": 4, "datetime": "s"}
        #key_fields (str or list of str): optional,  combination of fields that identify a row
        #index_data_for_compare : true if the order of data is relevant
        #index_metadata_for_compare : true if the order of columns is relevant
        #ignore fields : fields that won't be in comparison
        #check_forcount : add a check on count for duplicate rows

    #Returns:
        #pd.DataFrame: result of comparison result
	#empty list or None
    if key_fields is None or len(fields) == 0:
        key_fields = None
    if ignore_fields is None or len(ignore_fields) == 0:
        ignore_fields = None

		
    if execution_engine == "pandas":
        return compare_pandas(
            df1, df2, mode=mode,
            column_mismatch=column_mismatch,
            rounding=rounding,
            key_fields=key_fields,
            index_data_for_compare=index_data_for_compare,
            index_metadata_for_compare=index_metadata_for_compare,
            ignore_fields= ignore_fields,
            check_forcount=check_forcount
        )
    elif execution_engine == "polars":
		#Convert to polars dataframe both pandas dataframe
        df1_pl = pl.from_pandas(df1)
        df2_pl = pl.from_pandas(df2)
        diff_rows= compare_polars(
            df1_pl, df2_pl,
            mode=mode,
            column_mismatch=column_mismatch,
            rounding=rounding,
            key_fields=key_fields,
            index_data_for_compare=index_data_for_compare,
            index_metadata_for_compare=index_metadata_for_compare,
            ignore_fields= ignore_fields,
            check_forcount=check_forcount
        ).to_pandas()
        if mode=="data":
            return pandas_align_dtypes(df1, diff_rows,null_representation="pd.NA")
        else :
            return diff_rows
    elif execution_engine == "duckdb":
        diff_rows= compare_duckdb(
            df1, df2, mode=mode,
            column_mismatch=column_mismatch,
            rounding=rounding,
            key_fields=key_fields,
            index_data_for_compare=index_data_for_compare,
            index_metadata_for_compare=index_metadata_for_compare,
            ignore_fields= ignore_fields,
            check_forcount=check_forcount
        )
        if mode=="data":
            return pandas_align_dtypes(df1, diff_rows,null_representation="pd.NA")
        else :
            return diff_rows
    else:
        raise ValueError(f"Unsupported engine: {engine}")
    `;
    return [CompareFunction];
  }
  
  
  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {

    const prefix = config?.backend?.prefix ?? "pd";
	const const_ts_execution_engine = config.select_execution_engine ?? "pandas";
	const const_ts_comparison_mode = config.select_comparison_mode ?? "data";
	const const_ts_column_mismatch = config.select_column_mismatch ?? "intersect";	
	//for V2
	//const const_ts_rounding = '{"float": 4, "datetime": "s"}'; //No UI right now
    //const const_ts_key_fields = config.selectcol_key_fields.map(column => column.named ? `"${column.value}"` : column.value);
    //const const_ts_ignore_fields = config.selectcol_ignore_fields.map(column => column.named ? `"${column.value}"` : column.value);
	//const const_ts_index_data_for_compare = config.boolean_index_data_for_compare ? "False" : "True";
	//const const_ts_index_metadata_for_compare = config.boolean_index_metadata_for_compare ? "True" : "False";
	//const const_ts_check_forcount = config.boolean_check_forcount ? "True" : "False";
	
    // Join the keys into a string for the Python code
    //const const_ts_key_fieldsstr = `[${const_ts_key_fields.join(', ')}]`;
	//const const_ts_ignore_fieldsstr = `[${const_ts_ignore_fields.join(', ')}]`;
	//Comment for Python
    let code = `# Compare ${inputName1} and ${inputName2}\n`;
    code += `${outputName}=compare_datasets(execution_engine='${const_ts_execution_engine}',df1=${inputName1}, df2=${inputName2},mode='${const_ts_comparison_mode}',column_mismatch='${const_ts_column_mismatch}')`
   //for VZ	
  // code += `${outputName}=compare_datasets(execution_engine='${const_ts_execution_engine}',df1=${inputName1}, df2=${inputName2},mode='${const_ts_comparison_mode}',column_mismatch='${const_ts_column_mismatch}',rounding=${const_ts_rounding},key_fields=${const_ts_key_fieldsstr},ignore_fields=${const_ts_ignore_fieldsstr},index_data_for_compare=${const_ts_index_data_for_compare},index_metadata_for_compare=${const_ts_index_metadata_for_compare},check_forcount=${const_ts_check_forcount} )`
  

    return code;
  }

}