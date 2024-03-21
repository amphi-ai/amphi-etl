import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filterIcon } from '../icons';

export class Filter extends PipelineComponent<ComponentItem>() {

  public _name = "Filter";
  public _id = "filter";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = filterIcon;
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Column name",
        id: "columnName",
        placeholder: "Column name",
      },
      {
        type: "singleInputSelect",
        label: "Condition",
        id: "condition",
        placeholder: "Select condition",
        options: [
          { "value": "==", "label": "Equals" },
          { "value": "!=", "label": "Not Equals" },
          { "value": ">", "label": "Greater Than (for numbers)" },
          { "value": "<", "label": "Less Than (for numbers)" },
          { "value": ">=", "label": "Greater Than or Equal To (numbers)" },
          { "value": "<=", "label": "Less Than or Equal To (numbers)" },
          { "value": "notnull", "label": "Not Null" },
          { "value": "notempty", "label": "Not Empty" },
          { "value": "contains", "label": "Contains (string)" },
          { "value": "not contains", "label": "Not contains (string)" },
          { "value": "startswith", "label": "Starts With (string)" },
          { "value": "endswith", "label": "Ends With (string)" },
          { "value": "is NaN", "label": "Is Not a Number (Leave value field empty)" },
          { "value": "is not N", "label": "Is a Number (Leave value field empty)" }
        ],
      },
      {
        type: "input",
        label: "Value the condition satisfies",
        id: "conditionValue",
        placeholder: "Any string of characters (enforce numbers if needed)"
      },
      {
        type: "boolean",
        label: "Enforce value as number",
        id: "enforceNumber",
        advanced: true
      }
    ],
  };

  public static ConfigForm = ({ 
    nodeId, 
    data,
    context,
    manager,
    commands,
    store,
    setNodes
  }) => {
    const defaultConfig = this.Default; // Define your default config

    const handleSetDefaultConfig = useCallback(() => {
      setDefaultConfig({ nodeId, store, setNodes, defaultConfig });
    }, [nodeId, store, setNodes, defaultConfig]);
  
    useEffect(() => {
      handleSetDefaultConfig();
    }, [handleSetDefaultConfig]);
  
    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    return (
      <>
        {generateUIFormComponent({
          nodeId: nodeId,
          type: this.Type,
          name: this.Name,
          form: this.Form,
          data: data,
          context: context,
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, manager, commands }) {

  const { setNodes, deleteElements, setViewport } = useReactFlow();
  const store = useStoreApi();

  const deleteNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const zoomSelector = (s) => s.transform[2] >= 1;
  const showContent = useStore(zoomSelector);
  
  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: Filter.Type,
    Handle: Handle, // Make sure Handle is imported or defined
    Position: Position // Make sure Position is imported or defined
  });
  
  return (
    <>
      {renderComponentUI({
        id: id,
        data: data,
        context: context,
        manager: manager,
        commands: commands,
        name: Filter.Name,
        ConfigForm: Filter.ConfigForm({nodeId:id, data, context, manager, commands, store, setNodes}),
        Icon: Filter.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({config, inputName, outputName}): string {
    const columnName = config.columnName;
    const condition = config.condition;
    const conditionValue = config.conditionValue;
    const enforceNumber = config.enforceNumber;

    // Formatting the condition value based on its type
    const formattedConditionValue = enforceNumber ? conditionValue : `'${conditionValue}'`;

    // Constructing the query expression
    let queryExpression;
    switch (condition) {
        case "==":
        case "!=":
            // For string values or equality/inequality comparisons, always treat as string
            queryExpression = `\`${columnName}\` ${condition} ${formattedConditionValue}`;
            break;
        case "contains":
            // Correcting the syntax for "contains" condition with backticks for column names
            queryExpression = `\`${columnName}\`.str.contains(${formattedConditionValue})`;
            break;
        case "not contains":
            // Correcting the syntax for "not contains" condition with backticks for column names
            queryExpression = `~\`${columnName}\`.str.contains(${formattedConditionValue})`;
            break;
        case "startswith":
        case "endswith":
            // For string starts with/ends with, always treat conditionValue as string, with backticks
            queryExpression = `\`${columnName}\`.str.${condition}(${formattedConditionValue})`;
            break;
        case "isna":
        case "notna":
            // For NaN checks, no need for conditionValue, with backticks
            queryExpression = `\`${columnName}\`.${condition}()`;
            break;
        default:
            // For numerical comparisons, with backticks for column names
            queryExpression = `\`${columnName}\` ${condition} ${formattedConditionValue}`;
    }

    // Template for the pandas query code, with backticks around column names
    const code = `
# Filter rows
${outputName} = ${inputName}.query("${queryExpression}")
`;
    return code;
}



}