import { joinIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class AdvancedJoin extends BaseCoreComponent {
    constructor() {
        const defaultConfig = {
            selectExecutionEngine: "pandas",
            selectJoinType: "left",
            selectActionIfCartesianProduct: "0",
            selectSameNameStrategy: "suffix_right"
        };
        const form = {
            idPrefix: "component__form",
            fields: [
                {
                    type: "select",
                    label: "Join type",
                    id: "selectJoinType",
                    //placeholder: "Default: left", (no placeholder because defined in defaultConfig)
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
                    type: "columnOperationColumn",
                    label: "Join Conditions",
                    id: "joinConditions",
                    tooltip: "Define one or more join conditions with left column, operator, and right column.",
                    options: [
                        { value: "=", label: "=" },
                        { value: ">", label: ">" },
                        { value: "<", label: "<" },
                        { value: ">=", label: ">=" },
                        { value: "<=", label: "<=" }
                    ],
                    operatorControlFieldId: "selectExecutionEngine",
                    operatorLockedValues: ["pandas"],
                    operatorLockedWhenMissing: true
                },
                {
                    type: "select",
                    label: "Cartesian Product",
                    tooltip: "If the join keys contain duplicates, the result may multiply rows (Cartesian product). Choose how to handle this situation: continue, raise an error, or raise a warning.",
                    id: "selectActionIfCartesianProduct",
                    columnId: 1,
                    options: [
                        { value: "0", label: "Default", tooltip: "No action, execution of the join will continue." },
                        { value: "2", label: "Raise error if Cartesian product is detected", tooltip: "Execution will be stopped." },
                        { value: "3", label: "Raise warning if Cartesian product is detected", tooltip: "Execution will continue." }
                    ],
                    condition: { selectJoinType: ["inner", "left", "right", "outer", "anti-right", "anti-left"] },
                    advanced: true
                }
                ,
                {
                    type: "select",
                    label: "Strategy for same names",
                    id: "selectSameNameStrategy",
                    columnId: 1,
                    options: [
                        { value: "suffix_right", label: "Add _right suffix", tooltip: "If both datasets have columns with the same name, add '_right' to the columns from the right dataset." },
                        { value: "suffix_both", label: "Add _left and _right suffixes", tooltip: "If both datasets have columns with the same name, add '_left' to the columns from the left dataset and '_right' to the columns from the right dataset." },
                        { value: "coalesce", label: "Coalesce", tooltip: "If both datasets have columns with the same name, keep only one column. Fill missing values with data from the right dataset when the left one is empty." }
                    ],
                    condition: { selectJoinType: ["inner", "left", "right", "outer", "cross"] },
                    advanced: true
                }
                ,
                {
                    type: "select",
                    label: "Execution Engine",
                    id: "selectExecutionEngine",
                    placeholder: "Default: Pandas",
                    options: [
                        { value: "pandas", label: "Pandas", tooltip: "Mature, easy-to-use, great for small-to-medium datasets." },
                        { value: "polars", label: "Polars", tooltip: "Fast, memory-efficient, great for large-scale in-memory analytics." },
                        { value: "duckdb", label: "DuckDB", tooltip: "SQL-based, excellent for large datasets" }
                    ],
                    advanced: true
                }
            ],
        };
        const description = "Use Join Datasets to combine two datasets by one or more columns."

        super("Join Datasets", "join", description, "pandas_df_double_processor", [], "transforms", joinIcon, defaultConfig, form);
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

    public provideImports({ config }): string[] {
        const engine = config?.selectExecutionEngine ?? "pandas";
        //pandas always necessary, since output and input are still pandas df
        const imports = ["import pandas as pd", "import warnings"];

        if (engine === "polars") {
            imports.push("import polars as pl", "import pyarrow");
        } else if (engine === "duckdb") {
            imports.push("import duckdb", "import pyarrow");
        }
        return imports;
    }

    public provideFunctions({ config }): string[] {
        const prefix = config?.backend?.prefix ?? "pd";
        // Function to perform frequency analysis
        const JoinFunction = `
# Quote identifiers safely for DuckDB
def quote_duckdb(col:str) -> str:           
  return f'"{col}"'

def check_cartesian_product(execution_engine, df1, df2, key_left, key_right):
    #Checks if a Cartesian product may result from the join based on key uniqueness.
	  #
    #Parameters:
		#execution_engine : execution engine (pandas, polars, duckdb...)
        #df1, df2 (pd.DataFrame): DataFrames to join
        #key_left, key_right (str or list of str): Join keys for each DataFrame

    #Returns:
        #bool: True if a Cartesian product is likely, False otherwise.
    if execution_engine == "pandas":
        num_rows_df1 = len(df1)
        num_rows_df2 = len(df2)
        num_duplicates_df1 = df1.duplicated(subset=key_left).sum()
        num_duplicates_df2 = df2.duplicated(subset=key_right).sum()

        print(f"df1: {num_rows_df1} rows, {num_duplicates_df1} duplicate key rows")
        print(f"df2: {num_rows_df2} rows, {num_duplicates_df2} duplicate key rows")

        is_df1_unique = not df1.duplicated(subset=key_left).any()
        is_df2_unique = not df2.duplicated(subset=key_right).any()

    elif execution_engine == "polars":
        pl_df1 = pl.from_pandas(df1)
        pl_df2 = pl.from_pandas(df2)

        num_rows_df1 = pl_df1.height
        num_rows_df2 = pl_df2.height
        num_duplicates_df1 = num_rows_df1 - pl_df1.select(pl.col(key_left)).unique().height
        num_duplicates_df2 = num_rows_df2 - pl_df2.select(pl.col(key_right)).unique().height

        print(f"df1: {num_rows_df1} rows, {num_duplicates_df1} duplicate key rows")
        print(f"df2: {num_rows_df2} rows, {num_duplicates_df2} duplicate key rows")

        is_df1_unique = (num_duplicates_df1 == 0)
        is_df2_unique = (num_duplicates_df2 == 0)

    elif execution_engine == "duckdb":
        duckdb.register("df1", df1)
        duckdb.register("df2", df2)

        num_rows_df1 = duckdb.query("SELECT COUNT(*) FROM df1").fetchone()[0]
        num_rows_df2 = duckdb.query("SELECT COUNT(*) FROM df2").fetchone()[0]

        if isinstance(key_left, str):
            key_left = [key_left]
        if isinstance(key_right, str):
            key_right = [key_right]
            
        # Quote keys before using them in SQL
        quoted_key_left = [quote_duckdb(c) for c in key_left]
        quoted_key_right = [quote_duckdb(c) for c in key_right]
        
        num_unique_df1 = duckdb.query(
            f"SELECT COUNT(DISTINCT {', '.join(quoted_key_left)}) FROM df1"
        ).fetchone()[0]
        num_unique_df2 = duckdb.query(
            f"SELECT COUNT(DISTINCT {', '.join(quoted_key_right)}) FROM df2"
        ).fetchone()[0]

        num_duplicates_df1 = num_rows_df1 - num_unique_df1
        num_duplicates_df2 = num_rows_df2 - num_unique_df2

        print(f"df1: {num_rows_df1} rows, {num_duplicates_df1} duplicate key rows")
        print(f"df2: {num_rows_df2} rows, {num_duplicates_df2} duplicate key rows")

        is_df1_unique = (num_duplicates_df1 == 0)
        is_df2_unique = (num_duplicates_df2 == 0)

    else:
        raise ValueError(f"Unsupported execution engine: {execution_engine}")

    return not (is_df1_unique or is_df2_unique)

def perform_join(execution_engine, df1, df2, key_left, key_right, join_type, same_name_strategy):
    
    #Performs the join operation based on the specified type.

    #Parameters:
        #execution_engine (str): 'pandas', 'polars', or 'duckdb'
        #df1, df2 (pd.DataFrame): DataFrames to join
        #key_left, key_right (str or list of str): Join keys for each DataFrame
        #join_type (str): Join type ('inner', 'left', 'right', 'outer', 'cross', 'anti-left', 'anti-right')
        #same_name_strategy (str): 'suffix_right', 'suffix_both', or 'coalesce'

    #Returns:
        #pd.DataFrame: Joined DataFrame with missing values as pd.NA
    

   # Normalize keys to list
    if isinstance(key_left, str):
        key_left = [key_left]
    if isinstance(key_right, str):
        key_right = [key_right]

    # Find overlaps including keys
    overlap_cols = set(df1.columns).intersection(df2.columns)

    # Strategy: suffix mapping
    if same_name_strategy == 'suffix_right':
        left_suffix, right_suffix = "", "_right"
    elif same_name_strategy == 'suffix_both':
        left_suffix, right_suffix = "_left", "_right"
    elif same_name_strategy == 'coalesce':
        # For coalesce we still join with suffixes internally
        left_suffix, right_suffix = "_left", "_right"
    else:
        raise ValueError(f"Unsupported same_name_strategy: {same_name_strategy}")

    if execution_engine == "pandas":
        if join_type in ['inner', 'left', 'right', 'outer']:
            result = pd.merge(
                df1, df2, 
                how=join_type, 
                left_on=key_left, 
                right_on=key_right,
                suffixes=(left_suffix, right_suffix)
            )
        elif join_type == 'cross':
            result = pd.merge(
                df1, df2,
                how='cross',
                suffixes=(left_suffix, right_suffix)
            )
        elif join_type == 'anti-left':
            merged = pd.merge(
                df1, df2, 
                how='left', 
                left_on=key_left, 
                right_on=key_right, 
                indicator=True, 
                suffixes=(left_suffix, right_suffix)
            )
            result = merged[merged['_merge'] == 'left_only'].drop(columns=['_merge'])
        elif join_type == 'anti-right':
            merged = pd.merge(
                df2, df1, 
                how='left', 
                left_on=key_right, 
                right_on=key_left, 
                indicator=True, 
                suffixes=(left_suffix, right_suffix)
            )
            result = merged[merged['_merge'] == 'left_only'].drop(columns=['_merge'])
        else:
            raise ValueError(f"Unsupported join type: {join_type}")

    elif execution_engine == "polars":
        pl_df1 = pl.from_pandas(df1)
        pl_df2 = pl.from_pandas(df2)

        # Identify overlap (including keys)
        overlap_cols = set(df1.columns).intersection(df2.columns)
				
		# Always initialize rename maps
        rename_map_left = {}
        rename_map_right = {}

        if same_name_strategy == 'suffix_right':
            # Only rename right overlaps
            rename_map_right = {c: f"{c}{right_suffix}" for c in pl_df2.columns if c in overlap_cols}
            pl_df2 = pl_df2.rename(rename_map_right)

        elif same_name_strategy == 'suffix_both':
            rename_map_left = {c: f"{c}{left_suffix}" for c in pl_df1.columns if c in overlap_cols}
            rename_map_right = {c: f"{c}{right_suffix}" for c in pl_df2.columns if c in overlap_cols}
            pl_df1 = pl_df1.rename(rename_map_left)
            pl_df2 = pl_df2.rename(rename_map_right)

        elif same_name_strategy == 'coalesce':
            # Rename both sides internally
            rename_map_left = {c: f"{c}{left_suffix}" for c in pl_df1.columns if c in overlap_cols}
            rename_map_right = {c: f"{c}{right_suffix}" for c in pl_df2.columns if c in overlap_cols}
            pl_df1 = pl_df1.rename(rename_map_left)
            pl_df2 = pl_df2.rename(rename_map_right)

        join_map_pandas_polars = {
            'inner': 'inner',
            'left': 'left',
            'right': 'right',
            'outer': 'full', #outer Deprecated in version 0.20.29
            'cross': 'cross'
        }

        if join_type == 'cross':
            result = pl_df1.join(pl_df2, how='cross')
        elif join_type in join_map_pandas_polars:
            result = pl_df1.join(pl_df2, left_on=[rename_map_left.get(k, k) for k in key_left],
                                 right_on=[rename_map_right.get(k, k) for k in key_right],
                                 how=join_map_pandas_polars[join_type])
        elif join_type == 'anti-left':
            result = pl_df1.join(pl_df2, left_on=[rename_map_left.get(k, k) for k in key_left],
                                 right_on=[rename_map_right.get(k, k) for k in key_right],
                                 how='anti')
        elif join_type == 'anti-right':
            result = pl_df2.join(pl_df1, left_on=[rename_map_right.get(k, k) for k in key_right],
                                 right_on=[rename_map_left.get(k, k) for k in key_left],
                                 how='anti')
        else:
            raise ValueError(f"Unsupported join type: {join_type}")

        # Handle coalesce merging in Polars
        if same_name_strategy == 'coalesce':
            for col in overlap_cols:
                left_col = f"{col}{left_suffix}"
                right_col = f"{col}{right_suffix}"
                if left_col in result.columns and right_col in result.columns:
                    result = result.with_columns(
                        pl.col(left_col).fill_null(pl.col(right_col)).alias(col)
                    ).drop([left_col, right_col])

        result = result.to_pandas()

    elif execution_engine == "duckdb":
        duckdb.register("df1", df1)
        duckdb.register("df2", df2)

        if same_name_strategy == 'suffix_right':
            left_cols = [f"df1.{quote_duckdb(c)}" for c in df1.columns]
            right_cols = [f"df2.{quote_duckdb(c)} AS {quote_duckdb(c+right_suffix)}" if c in overlap_cols else f"df2.{quote_duckdb(c)}" for c in df2.columns]
        elif same_name_strategy == 'suffix_both':
            left_cols = [f"df1.{quote_duckdb(c)} AS {quote_duckdb(c+left_suffix)}" if c in overlap_cols else f"df1.{quote_duckdb(c)}" for c in df1.columns]
            right_cols = [f"df2.{quote_duckdb(c)} AS {quote_duckdb(c+right_suffix)}" if c in overlap_cols else f"df2.{c}" for c in df2.columns]
        elif same_name_strategy == 'coalesce':
             # Build coalesced expressions for overlapping cols (including keys)
            left_cols = []
            right_cols = []
            for c in df1.columns:
              if c in overlap_cols:
                # coalesce(df1.c, df2.c) as c
                left_cols.append(f"COALESCE(df1.{quote_duckdb(c)}, df2.{quote_duckdb(c)}) AS {quote_duckdb(c)}")
              else:
                left_cols.append(f"df1.{quote_duckdb(c)}")
              for c in df2.columns:
                 if c not in overlap_cols:  # already handled in coalesce
                    right_cols.append(f"df2.{quote_duckdb(c)}")
        else:
            raise ValueError(f"Unsupported same_name_strategy: {same_name_strategy}")

        select_clause = ", ".join(left_cols + right_cols)
        key_pairs = " AND ".join(f"df1.{quote_duckdb(l)} = df2.{quote_duckdb(r)}" for l, r in zip(key_left, key_right))

        if join_type == 'cross':
            query = f"SELECT {select_clause} FROM df1 CROSS JOIN df2"
        elif join_type in ['inner', 'left', 'right', 'outer']:
            sql_how = "full outer" if join_type == "outer" else join_type
            query = f"SELECT {select_clause} FROM df1 {sql_how} JOIN df2 ON {key_pairs}"
        #for anti-left and right, we only retrieve one side in result so no need for name strategy    
        elif join_type == 'anti-left':
            query = f"""
                SELECT {', '.join(left_cols)}
                FROM df1
                LEFT JOIN df2 ON {key_pairs}
                WHERE df2.{quote_duckdb(key_right[0])} IS NULL
            """
        elif join_type == 'anti-right':
            query = f"""
                SELECT {', '.join(right_cols)}
                FROM df2
                LEFT JOIN df1 ON {key_pairs}
                WHERE df1.{quote_duckdb(key_left[0])} IS NULL
            """
        else:
            raise ValueError(f"Unsupported join type: {join_type}")

        result = duckdb.query(query).to_df()

    else:
        raise ValueError(f"Unsupported execution engine: {execution_engine}")

    # Apply coalesce if needed
    #if same_name_strategy == 'coalesce':
    #    for col in overlap_cols:
    #        left_col = f"{col}{left_suffix}"
    #        right_col = f"{col}{right_suffix}"
    #        if left_col in result.columns and right_col in result.columns:
    #            result[col] = result[left_col].combine_first(result[right_col])
    #           result.drop(columns=[left_col, right_col], inplace=True)

    # Normalize missing values
    result = result.convert_dtypes()

    return result

def advanced_join(execution_engine,df1, df2, key_left, key_right, join_type, action_if_cartesian_product=0,same_name_strategy='suffix_right'):
    #Main function to handle join logic with optional Cartesian product check.

    #Parameters:
		#execution_engine : execution engine (pandas, polars, duckdb...)
        #df1, df2 (pd.DataFrame): DataFrames to join
        #key_left, key_right (str or list of str): Join keys for each DataFrame
        #join_type (str): Join type (e.g. "inner", "left", "cross", etc.)
        #action_if_cartesian_product (int): 
            #0 - Do nothing
            #2 - Raise error if Cartesian product is detected
            #3 - Raise warning if Cartesian product is detected
        #same_name_strategy (str): 'suffix_right', 'suffix_both', or 'coalesce'
    #Returns:
        #pd.DataFrame: Joined result

    # Normalize key inputs to lists
    if isinstance(key_left, str):
        key_left = [key_left]
    if isinstance(key_right, str):
        key_right = [key_right]

    if join_type != 'cross' and action_if_cartesian_product in [2, 3]:
        is_cartesian = check_cartesian_product(execution_engine,df1, df2, key_left, key_right)
        if is_cartesian:
            if action_if_cartesian_product == 2:
                raise ValueError("Cartesian product detected and not allowed.")
            elif action_if_cartesian_product == 3:
                warnings.warn("Cartesian product detected.")

    return perform_join(execution_engine,df1, df2, key_left, key_right, join_type, same_name_strategy)

def advanced_join_with_operations(df1, df2, conditions, join_type='inner', same_name_strategy='suffix_right'):
    if same_name_strategy == 'suffix_right':
        left_suffix, right_suffix = "", "_right"
    elif same_name_strategy == 'suffix_both':
        left_suffix, right_suffix = "_left", "_right"
    elif same_name_strategy == 'coalesce':
        left_suffix, right_suffix = "_left", "_right"
    else:
        raise ValueError(f"Unsupported same_name_strategy: {same_name_strategy}")

    if join_type == "cross":
        result = pd.merge(df1, df2, how="cross", suffixes=(left_suffix, right_suffix))
        return result.convert_dtypes()

    if not conditions:
        raise ValueError("At least one join condition is required.")

    left_idx = "__amphi_left_idx__"
    right_idx = "__amphi_right_idx__"
    while left_idx in df1.columns:
        left_idx = f"_{left_idx}"
    while right_idx in df2.columns:
        right_idx = f"_{right_idx}"

    left = df1.copy()
    right = df2.copy()
    left[left_idx] = range(len(left))
    right[right_idx] = range(len(right))

    overlap_cols = set(df1.columns).intersection(df2.columns)
    left_renamed = {c: (f"{c}{left_suffix}" if c in overlap_cols and left_suffix else c) for c in df1.columns}
    right_renamed = {c: (f"{c}{right_suffix}" if c in overlap_cols else c) for c in df2.columns}

    cross = pd.merge(left, right, how="cross", suffixes=(left_suffix, right_suffix))
    output_cols = [c for c in cross.columns if c not in [left_idx, right_idx]]

    mask = pd.Series(True, index=cross.index)
    for cond in conditions:
        left_col = left_renamed.get(cond["left"], cond["left"])
        right_col = right_renamed.get(cond["right"], cond["right"])
        op = cond.get("op", "=")
        if op == "=":
            mask &= (cross[left_col] == cross[right_col])
        elif op == ">":
            mask &= (cross[left_col] > cross[right_col])
        elif op == "<":
            mask &= (cross[left_col] < cross[right_col])
        elif op == ">=":
            mask &= (cross[left_col] >= cross[right_col])
        elif op == "<=":
            mask &= (cross[left_col] <= cross[right_col])
        else:
            raise ValueError(f"Unsupported operator: {op}")

    matched = cross[mask].copy()
    matched_left = set(matched[left_idx].tolist()) if not matched.empty else set()
    matched_right = set(matched[right_idx].tolist()) if not matched.empty else set()

    def build_unmatched_rows(unmatched_df, side):
        frame = pd.DataFrame({col: [pd.NA] * len(unmatched_df) for col in output_cols})
        for c in df1.columns:
            target = left_renamed.get(c, c)
            if side == "left":
                frame[target] = unmatched_df[c].values
        for c in df2.columns:
            target = right_renamed.get(c, c)
            if side == "right":
                frame[target] = unmatched_df[c].values
        return frame

    if join_type == "inner":
        result = matched
    elif join_type == "left":
        unmatched_left = left[~left[left_idx].isin(matched_left)]
        result = pd.concat([matched, build_unmatched_rows(unmatched_left, "left")], ignore_index=True)
    elif join_type == "right":
        unmatched_right = right[~right[right_idx].isin(matched_right)]
        result = pd.concat([matched, build_unmatched_rows(unmatched_right, "right")], ignore_index=True)
    elif join_type == "outer":
        unmatched_left = left[~left[left_idx].isin(matched_left)]
        unmatched_right = right[~right[right_idx].isin(matched_right)]
        result = pd.concat(
            [matched, build_unmatched_rows(unmatched_left, "left"), build_unmatched_rows(unmatched_right, "right")],
            ignore_index=True
        )
    elif join_type == "anti-left":
        unmatched_left = left[~left[left_idx].isin(matched_left)]
        result = build_unmatched_rows(unmatched_left, "left")
    elif join_type == "anti-right":
        unmatched_right = right[~right[right_idx].isin(matched_right)]
        result = build_unmatched_rows(unmatched_right, "right")
    else:
        raise ValueError(f"Unsupported join type: {join_type}")

    result = result.drop(columns=[c for c in [left_idx, right_idx] if c in result.columns], errors="ignore")

    if same_name_strategy == "coalesce":
        for col in overlap_cols:
            left_col = f"{col}{left_suffix}"
            right_col = f"{col}{right_suffix}"
            if left_col in result.columns and right_col in result.columns:
                result[col] = result[left_col].combine_first(result[right_col])
                result = result.drop(columns=[left_col, right_col])

    return result.convert_dtypes()

    `;
        return [JoinFunction];
    }


    public generateComponentCode({ config, inputName1, inputName2, outputName }): string {

        const const_ts_execution_engine = config.selectExecutionEngine ?? "pandas";
        const rawJoinConditions =
            config.joinConditions && config.joinConditions.length > 0
                ? config.joinConditions
                : (config.leftKeyColumn || []).map((leftColumn, index) => ({
                    leftColumn,
                    operation: "=",
                    rightColumn: config.rightKeyColumn?.[index]
                }));

        const joinConditions = rawJoinConditions.filter(condition => condition?.leftColumn?.value && condition?.rightColumn?.value);
        const hasNonEqualityOperation = joinConditions.some(condition => (condition.operation || "=") !== "=");
        const formatColumnReference = (column: any) => (column?.named === false ? `${column.value}` : `"${column.value}"`);

        const const_ts_leftKeys = joinConditions.map(condition => formatColumnReference(condition.leftColumn));
        const const_ts_rightKeys = joinConditions.map(condition => formatColumnReference(condition.rightColumn));
        const const_ts_joinType = config.selectJoinType ?? "left";
        const const_ts_action_if_cartesian_product = config.selectActionIfCartesianProduct ?? "0";
        const const_ts_selectSameNameStrategy = config.selectSameNameStrategy ?? "suffix_right";
        const const_ts_leftKeysStr = `[${const_ts_leftKeys.join(', ')}]`;
        const const_ts_rightKeysStr = `[${const_ts_rightKeys.join(', ')}]`;
        const conditionsStr = `[${joinConditions
            .map(
                condition =>
                    `{"left": ${formatColumnReference(condition.leftColumn)}, "op": "${condition.operation || "="}", "right": ${formatColumnReference(condition.rightColumn)}}`
            )
            .join(", ")}]`;

        let code = `# Join ${inputName1} and ${inputName2}\n`;

        if (const_ts_joinType !== "cross" && joinConditions.length === 0) {
            code += `raise ValueError("At least one join condition is required.")\n`;
        } else if (hasNonEqualityOperation) {
            code += `${outputName}=advanced_join_with_operations(df1=${inputName1}, df2=${inputName2}, conditions=${conditionsStr}, join_type='${const_ts_joinType}', same_name_strategy='${const_ts_selectSameNameStrategy}')`;
        } else {
            code += `${outputName}=advanced_join(execution_engine='${const_ts_execution_engine}',df1=${inputName1}, df2=${inputName2}, key_left=${const_ts_leftKeysStr}, key_right=${const_ts_rightKeysStr}, join_type='${const_ts_joinType}', action_if_cartesian_product=${const_ts_action_if_cartesian_product},same_name_strategy='${const_ts_selectSameNameStrategy}')`;
        }


        return code;
    }

}
