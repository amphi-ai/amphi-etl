import { joinIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class Join extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { selectJoinType: "left" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Join type",
          id: "selectJoinType",
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
        },
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
        }
      ],
    };
    const description = "Use Join Datasets to combine two datasets by one or more columns."

    super("Join Datasets", "join", description, "pandas_df_double_processor", [], "transforms", joinIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public provideFunctions({ config }): string[] {
    const joinWithOperations = `
def join_with_column_operations(df_left, df_right, conditions, join_type="inner", left_suffix="", right_suffix="_right"):
    if join_type == "cross":
        result = pd.merge(df_left, df_right, how="cross", suffixes=(left_suffix, right_suffix))
        return result.convert_dtypes()

    if not conditions:
        raise ValueError("At least one join condition is required.")

    left_idx = "__amphi_left_idx__"
    right_idx = "__amphi_right_idx__"
    while left_idx in df_left.columns:
        left_idx = f"_{left_idx}"
    while right_idx in df_right.columns:
        right_idx = f"_{right_idx}"

    left = df_left.copy()
    right = df_right.copy()
    left[left_idx] = range(len(left))
    right[right_idx] = range(len(right))

    overlap_cols = set(df_left.columns).intersection(df_right.columns)
    left_renamed = {c: (f"{c}{left_suffix}" if c in overlap_cols and left_suffix else c) for c in df_left.columns}
    right_renamed = {c: (f"{c}{right_suffix}" if c in overlap_cols else c) for c in df_right.columns}

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
        for c in df_left.columns:
            target = left_renamed.get(c, c)
            if side == "left":
                frame[target] = unmatched_df[c].values
        for c in df_right.columns:
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
    return result.convert_dtypes()
`;
    return [joinWithOperations];
  }

  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {

    const prefix = config?.backend?.prefix ?? "pd";
    const joinType = config.selectJoinType || "left";
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

    const leftKeys = joinConditions.map(condition => formatColumnReference(condition.leftColumn));
    const rightKeys = joinConditions.map(condition => formatColumnReference(condition.rightColumn));
    const leftKeysStr = `[${leftKeys.join(', ')}]`;
    const rightKeysStr = `[${rightKeys.join(', ')}]`;
    const conditionsStr = `[${joinConditions
      .map(
        condition =>
          `{"left": ${formatColumnReference(condition.leftColumn)}, "op": "${condition.operation || "="}", "right": ${formatColumnReference(condition.rightColumn)}}`
      )
      .join(", ")}]`;

    let code = `# Join ${inputName1} and ${inputName2}\n`;

    if (joinType !== "cross" && joinConditions.length === 0) {
      code += `raise ValueError("At least one join condition is required.")\n`;
    } else if (hasNonEqualityOperation) {
      code += `${outputName} = join_with_column_operations(${inputName1}, ${inputName2}, conditions=${conditionsStr}, join_type="${joinType}")\n`;
    } else if (joinType === "cross") {
      code += `${outputName} = ${prefix}.merge(${inputName1}, ${inputName2}, how="cross")\n`;
    } else if (joinType === "anti-left") {
      code += `${outputName} = ${prefix}.merge(${inputName1}, ${inputName2}, left_on=${leftKeysStr}, right_on=${rightKeysStr}, how="left", indicator=True)\n`;
      code += `${outputName} = ${outputName}[${outputName}["_merge"] == "left_only"].drop(columns=["_merge"])\n`;
    } else if (joinType === "anti-right") {
      code += `${outputName} = ${prefix}.merge(${inputName1}, ${inputName2}, left_on=${leftKeysStr}, right_on=${rightKeysStr}, how="right", indicator=True)\n`;
      code += `${outputName} = ${outputName}[${outputName}["_merge"] == "right_only"].drop(columns=["_merge"])\n`;
    } else {
      code += `${outputName} = ${prefix}.merge(${inputName1}, ${inputName2}, left_on=${leftKeysStr}, right_on=${rightKeysStr}, how="${joinType}")\n`;
    }

    return code;
  }
}
