import { BaseCoreComponent } from '../BaseCoreComponent';
import { filterIcon } from '../../icons';
import { Filter } from './Filter';

export class Switch extends BaseCoreComponent {
    constructor() {
        const description = "Routes data to True or False based on a condition. Matching rows go to True, the rest to False.";

        const filter = new Filter();
        const filterForm = (filter as any)._form as any;
        const filterDefault = (filter as any)._default as any;

        const getFields = (): any[] => (Array.isArray(filterForm?.fields) ? filterForm.fields : []);

        const form = {
            idPrefix: "switch_component__form",
            fields: [
                {
                    type: "info",
                    label: "Routes data to True or False based on a condition",
                    id: "tsCFinfoInstructions",
                    text: "Uses the same condition builder as Filter Rows. Matching rows go to True, remaining rows go to False.",
                    advanced: true
                },
                ...getFields()
            ]
        };

        // Use the new type 'pandas_df_switch'
        super("Conditional Switch", "conditionalSwitch", description, "pandas_df_switch", [], "transforms", filterIcon, { ...filterDefault }, form);
    }

    // public static instance: SwitchComponent;

    // public static getInstance(): SwitchComponent {
    //     if (!SwitchComponent.instance) {
    //         SwitchComponent.instance = new SwitchComponent();
    //     }
    //     return SwitchComponent.instance;
    // }

    public provideImports(config): string[] {
        return new Filter().provideImports({ config });
    }

    private normalizeFilterConfig(config: any): any {
        const normalizedConfig = { ...config } as any;
        const genericFilterType = normalizedConfig.filterType || normalizedConfig.tsCFradioFilterType || "basic";
        const genericColumn = normalizedConfig.column
            ?? normalizedConfig.column_name
            ?? normalizedConfig.tsCFcolumnColumntoFilter;
        const genericCondition = normalizedConfig.condition
            ?? normalizedConfig.operator
            ?? normalizedConfig.tsCFselectCondition;
        const genericConditionValue = normalizedConfig.conditionValue
            ?? normalizedConfig.compare_value
            ?? normalizedConfig.tsCFinputConditionValue;
        const genericEnforceString = normalizedConfig.enforceString
            ?? normalizedConfig.tsCFbooleanEnforceString
            ?? false;
        const genericAdvancedExpression = normalizedConfig.advancedExpression
            ?? normalizedConfig.advanced_expression
            ?? normalizedConfig.tsCFcodeTextareaPythonExpression
            ?? "";

        normalizedConfig.filterType = genericFilterType;
        normalizedConfig.tsCFradioFilterType = genericFilterType;

        if (genericColumn && !normalizedConfig.tsCFcolumnColumntoFilter) {
            normalizedConfig.tsCFcolumnColumntoFilter =
                typeof genericColumn === "object" && genericColumn?.value
                    ? genericColumn
                    : { value: genericColumn, type: "", named: true };
        }

        if (genericCondition !== undefined) {
            normalizedConfig.condition = genericCondition;
            normalizedConfig.tsCFselectCondition = genericCondition;
        }

        if (genericConditionValue !== undefined) {
            normalizedConfig.conditionValue = genericConditionValue;
            normalizedConfig.tsCFinputConditionValue = genericConditionValue;
        }

        normalizedConfig.enforceString = genericEnforceString;
        normalizedConfig.tsCFbooleanEnforceString = genericEnforceString;
        normalizedConfig.advancedExpression = genericAdvancedExpression;
        normalizedConfig.advanced_expression = genericAdvancedExpression;
        normalizedConfig.tsCFcodeTextareaPythonExpression = genericAdvancedExpression;

        return normalizedConfig;
    }

    public generateComponentCode({ config, inputName, outputName }): string {
        const normalizedConfig = this.normalizeFilterConfig(config);

        const columnValue = normalizedConfig?.tsCFcolumnColumntoFilter?.value ?? "";
        if (normalizedConfig.tsCFradioFilterType !== "advanced" && !columnValue) {
            return `
# Warning: No column selected for Switch Condition
${outputName}_True = ${inputName}.head(0).copy()
${outputName}_False = ${inputName}
`;
        }

        const trueOutputName = `${outputName}_True`;
        const falseOutputName = `${outputName}_False`;
        const filterCode = new Filter().generateComponentCode({
            config: normalizedConfig,
            inputName,
            outputName: trueOutputName
        });

        return `${filterCode}
# Rows not matching the condition
${falseOutputName} = ${inputName}[~${inputName}.index.isin(${trueOutputName}.index)].copy()
`;
    }
}
