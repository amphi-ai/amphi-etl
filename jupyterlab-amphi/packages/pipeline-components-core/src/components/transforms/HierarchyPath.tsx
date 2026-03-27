import { hierarchyIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class HierarchyPath extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
                           tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations : [],
						   tsCFselectCustomizableHierarchySep : " > "
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Select the parent column",
          id: "tsCFcolumnHierarchyParentColumn",
          placeholder: "Column name",
          advanced: false
        },
        {
          type: "column",
          label: "Select the child column",
          id: "tsCFcolumnHierarchyChildColumn",
          placeholder: "Column name",
          advanced: false
        },
        {
          type: "selectCustomizable",
          label: "Separator",
          id: "tsCFselectCustomizableHierarchySep",
          placeholder: "default: > (with spaces)",
          tooltip: "Select or provide a custom delimiter.",
          options: [
            { value: " > ", label: " > " },
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" },
            { value: "\\t", label: "tab" },
            { value: "|", label: "pipe (|)" },
            { value: ">", label: ">" },
            { value: "/", label: "/" }
          ],
          advanced: false
        },
        {
          type: "keyvalueColumnsSelect",
          label: "Operations along path (optional)",
          id: "tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations",
          placeholder: "Select column",
          options: [
            { value: "min", label: "Min", tooltip: "Returns the minimum value in the group." },
            { value: "max", label: "Max", tooltip: "Returns the maximum value in the group." },
            { value: "sum", label: "Sum", tooltip: "Returns the sum of all values in the group." },
            { value: "mean", label: "Mean", tooltip: "Returns the average value of the group." },
            { value: "count", label: "Count", tooltip: "Counts the number of non-null entries." },
            { value: "nunique", label: "Distinct Count", tooltip: "Returns the number of distinct elements." },
            { value: "first", label: "First", tooltip: "Returns the first value in the group." },
            { value: "last", label: "Last", tooltip: "Returns the last value in the group." },
            { value: "median", label: "Median", tooltip: "Returns the median value in the group." },
            { value: "std", label: "Standard Deviation", tooltip: "Returns the standard deviation of the group." },
            { value: "var", label: "Variance", tooltip: "Returns the variance of the group." },
            { value: "prod", label: "Product", tooltip: "Returns the product of all values in the group." }
          ],
          advanced: true
        }
      ],
    };

    const description = "Transpose a parent/child hierarchy to a path of every node";

    super("Hierarchy Path", "hierarchy_path", description, "pandas_df_processor", [], "transforms", hierarchyIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "import numpy as np",
      "from collections import defaultdict"];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Functions to find the path of each node of hierarchy
    const tsHierarchyPathFunction = `
def py_fn_build_all_hierarchy_paths(df, parent_col, child_col, separator=" > ", aggregations=None):
    child_to_parents = defaultdict(set)
    for _, row in df.iterrows():
        child_to_parents[row[child_col]].add(row[parent_col])

    def get_paths(node, visited=None):
        if visited is None:
            visited = set()
        if node in visited:
            return [[f"{node}{separator}[CYCLE DETECTED]"]]
        visited.add(node)
        parents = child_to_parents.get(node)
        if not parents or all(pd.isna(p) for p in parents):
            return [[node]]
        all_paths = []
        for parent in parents:
            if pd.isna(parent):
                all_paths.append([node])
            else:
                for path in get_paths(parent, visited.copy()):
                    all_paths.append(path + [node])
        return all_paths

    rows = []
    for child in df[child_col].unique():
        paths = get_paths(child)
        for path in paths:
            flat_path = separator.join(str(p) for p in path)
            head = path[0] if path else None
            length = len(path)
            rows.append((child, path, flat_path, head, length))

    result_df = pd.DataFrame(rows, columns=[child_col, "_path_nodes", "hierarchy_path", "head_node", "path_length"])
    result_df["hierarchy_path"] = result_df["hierarchy_path"].astype("string")
    
    # Identify root nodes (parents that never appear as children)
    all_children = set(df[child_col].dropna().unique())
    all_parents = set(df[parent_col].dropna().unique())
    root_only_nodes = all_parents - all_children

    # Add a row for each root node
    for root in root_only_nodes:
      result_df.loc[len(result_df)] = {
        child_col: root,
        "_path_nodes": [root],
        "hierarchy_path": str(root),
        "head_node": root,
        "path_length": 1
      }
    
    if aggregations:
        for agg_label, field, func in aggregations:
            values = []
            expected_dtype = df[field].dtype if field in df.columns else None

            for path_nodes in result_df["_path_nodes"]:
                # Build edge set from consecutive nodes in the path
                edges = set(zip(path_nodes[:-1], path_nodes[1:]))
                # Filter rows in df that match those edges
                mask = df.apply(lambda row: (row[parent_col], row[child_col]) in edges, axis=1)
                path_df = df[mask]
                series = path_df[field]

                if func == "sum":
                    agg_value = series.sum(skipna=True)
                elif func == "max":
                    agg_value = series.max(skipna=True)
                elif func == "min":
                    agg_value = series.min(skipna=True)
                elif func == "mean":
                    agg_value = series.mean(skipna=True)
                elif func == "count":
                    agg_value = series.count()
                else:
                    agg_value = np.nan

                values.append(agg_value)

            result_df[agg_label] = pd.Series(values)
            if expected_dtype is not None:
                try:
                    result_df[agg_label] = result_df[agg_label].astype(expected_dtype)
                except Exception:
                    pass

    return result_df.drop(columns="_path_nodes")
    `;
    return [tsHierarchyPathFunction];
  }
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const tsConstParentColumn=config.tsCFcolumnHierarchyParentColumn.value;
    const tsConstChildColumn=config.tsCFcolumnHierarchyChildColumn.value;
    const tsConstAggregations=config.tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations;
    const tsConstAggregationsValue=config.tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations.value;
    let tsConstAggregationsParam=`aggregations=None`;
    // Start constructing the aggregation arguments dynamically
    let tsConstAggArgs = "[";

    if (config.tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations && config.tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations.length > 0) {
      config.tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations.forEach((op, index) => {
        // Determine how to reference the column based on 'named'
        const tsConstAggColumnReference = op.key.named ? `${op.key.value}` : op.key.value;
        const tsConstAggOperation = op.value.value;
        const tsConstAggColumnName = op.key.named ? op.key.value : `col${op.key.value}`;
        const tsConstAggOperationName = `${tsConstAggColumnName}_${tsConstAggOperation}`;
        const tsConstSanitizeAggColumnName = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_');
        const tsConstAggOperationNameReference = tsConstSanitizeAggColumnName(tsConstAggOperationName);

        // Construct each aggregation argument. The 
        tsConstAggArgs += `("${tsConstAggOperationNameReference}","${tsConstAggColumnReference}", "${tsConstAggOperation}")`;
        if (index < config.tsCFkeyvalueColumnsSelectHierarchyPathColumnOperations.length - 1) {
          tsConstAggArgs += ", ";
        }
      });
     tsConstAggArgs += "]";
     tsConstAggregationsParam=`aggregations=${tsConstAggArgs}`;
    }
    else
    {
     tsConstAggregationsParam=`aggregations=None`;
    }
    ;

    //const aggregations_param=`aggregations=None`;
//3 cases for the aggregations python variable :
//-can be undefined (if the user has not choosen any aggregation)
//-can be filled (if the user has choosen an aggregation)
//in this case we must have
//aggregations=[
//    ("Sum_longueur", "longueur", "sum"),
//    ("Max_longueur", "longueur", "max")
//]
    let code = `# Create the Hierarchy Path \n`;
    //execute the function
    code +=` 
# Execute the hierarchy path function
${outputName} = []
${outputName} =py_fn_build_all_hierarchy_paths(${inputName}, '${tsConstParentColumn}', '${tsConstChildColumn}', '${config.tsCFselectCustomizableHierarchySep}', ${tsConstAggregationsParam})
    `;
    return code + '\n';
  }
}
