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

    public generateComponentCode({ config, inputName, outputName }): string {
        const normalizedConfig = { ...config } as any;
        normalizedConfig.filterType = normalizedConfig.filterType || "basic";
        if (!normalizedConfig.column && normalizedConfig.column_name) {
            const col = normalizedConfig.column_name;
            normalizedConfig.column = typeof col === "object" && col?.value
                ? col
                : { value: col, type: "", named: true };
        }
        if (!normalizedConfig.condition && normalizedConfig.operator) {
            normalizedConfig.condition = normalizedConfig.operator;
        }
        if (normalizedConfig.conditionValue === undefined && normalizedConfig.compare_value !== undefined) {
            normalizedConfig.conditionValue = normalizedConfig.compare_value;
        }
        if (normalizedConfig.enforceString === undefined) {
            normalizedConfig.enforceString = false;
        }

        const columnValue = normalizedConfig?.column?.value ?? "";
        if (normalizedConfig.filterType !== "advanced" && !columnValue) {
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
