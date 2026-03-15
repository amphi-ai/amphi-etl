import { BaseCoreComponent } from '../BaseCoreComponent';
import { filterIcon } from '../../icons'; // Reusing filter icon as it's logically similar, or I should check if there is a 'switch' icon.
// Checking icons: I'll use filterIcon for now or engineIcon if available. 
// Step 14 showed: playCircleIcon, settingsIcon, engineIcon
// Step 20 showed: filterIcon
// I will use filterIcon as placeholder or engineIcon. User didn't specify icon.

export class SwitchComponent extends BaseCoreComponent {
    constructor() {
        const description = "Routes data to Path A or Path B based on a condition. Filters the dataframe: matching rows go to Path A, the rest to Path B.";
        const defaultConfig = {
            column_name: "",
            operator: "==",
            compare_value: "",
            value_type: "String"
        };

        const form = {
            idPrefix: "switch_component__form",
            fields: [
                 {
                    type: "info",
                    label: "Routes data to Path A or Path B based on a condition",
                    id: "instructions",
                    text: "Filters the dataframe by condition: matching rows go to Path A, remaining rows go to Path B. If no rows match, the original data flows through Path B unchanged.",
                },
                {
                    type: "column",
                    label: "Column Name",
                    id: "column_name",
                    placeholder: "Select column to test",
                    // auto-populated from upstream schema implicitly by type 'column'
                },
                {
                    type: "select",
                    label: "Operator",
                    id: "operator",
                    options: [
                        { value: "==", label: "Equals (==)" },
                        { value: "!=", label: "Not Equals (!=)" },
                        { value: ">", label: "Greater Than (>)" },
                        { value: "<", label: "Less Than (<)" },
                        { value: "contains", label: "Contains" },
                        { value: "is_empty", label: "Is Empty" }
                    ]
                },
                {
                    type: "input",
                    label: "Compare Value",
                    id: "compare_value",
                    placeholder: "Value to compare against",
                    condition: { operator: ["==", "!=", ">", "<", "contains"] } // Hide if is_empty
                },
                {
                    type: "select",
                    label: "Value Type",
                    id: "value_type",
                    options: [
                        { value: "String", label: "String" },
                        { value: "Int", label: "Integer" },
                        { value: "Float", label: "Float" },
                        { value: "Boolean", label: "Boolean" }
                    ],
                    condition: { operator: ["==", "!=", ">", "<", "contains"] }
                }
            ]
        };

        // Use the new type 'pandas_df_switch'
        super("Conditional Switch", "conditionalSwitch", description, "pandas_df_switch", [], "transforms", filterIcon, defaultConfig, form);
    }

    // public static instance: SwitchComponent;

    // public static getInstance(): SwitchComponent {
    //     if (!SwitchComponent.instance) {
    //         SwitchComponent.instance = new SwitchComponent();
    //     }
    //     return SwitchComponent.instance;
    // }

    public provideImports(config): string[] {
        return ["import pandas as pd"];
    }

    public generateComponentCode({ config, inputName, outputName }): string {
        const colNameRaw = config.column_name;
        const colName = (colNameRaw && typeof colNameRaw === 'object' && 'value' in colNameRaw)
            ? colNameRaw.value
            : (colNameRaw || "");

        const op = config.operator || "==";
        let val = config.compare_value || "";
        const valType = config.value_type || "String";

        let valStr = `"${val}"`;
        if (valType === "Int") valStr = `${parseInt(val) || 0}`;
        if (valType === "Float") valStr = `${parseFloat(val) || 0.0}`;
        if (valType === "Boolean") valStr = (val === 'true' || val === true) ? "True" : "False";
        if (valType === "String") valStr = `"${val}"`;

        if (!colName) {
            return `
# Warning: No column selected for Switch Condition
${outputName}_path_a = pd.DataFrame()
${outputName}_path_b = ${inputName}
`;
        }

        let conditionCode = "";

        if (op === "is_empty") {
            conditionCode = `
# Filter: rows where '${colName}' is empty
_mask = ${inputName}['${colName}'].isna() | (${inputName}['${colName}'].astype(str).str.strip() == "")
${outputName}_path_a = ${inputName}[_mask].copy()
${outputName}_path_b = ${inputName}[~_mask].copy()
if ${outputName}_path_a.empty:
    ${outputName}_path_b = ${inputName}
`;
        } else if (op === "contains") {
            conditionCode = `
# Filter: rows where '${colName}' contains ${valStr}
_mask = ${inputName}['${colName}'].astype(str).str.contains(${valStr}, na=False)
${outputName}_path_a = ${inputName}[_mask].copy()
${outputName}_path_b = ${inputName}[~_mask].copy()
if ${outputName}_path_a.empty:
    ${outputName}_path_b = ${inputName}
`;
        } else {
            conditionCode = `
# Filter: rows where '${colName}' ${op} ${valStr}
try:
    _mask = ${inputName}['${colName}'] ${op} ${valStr}
    ${outputName}_path_a = ${inputName}[_mask].copy()
    ${outputName}_path_b = ${inputName}[~_mask].copy()
    if ${outputName}_path_a.empty:
        ${outputName}_path_b = ${inputName}
except:
    ${outputName}_path_a = pd.DataFrame()
    ${outputName}_path_b = ${inputName}
`;
        }

        return conditionCode;
    }
}
