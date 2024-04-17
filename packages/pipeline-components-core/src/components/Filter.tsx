import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filterIcon } from '../icons';

export class Filter extends PipelineComponent<ComponentItem>() {

  public _name = "Filter Rows";
  public _id = "filter";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = filterIcon;
  public _default = { condition: "=="};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "column",
        label: "Column name",
        id: "column",
        placeholder: "Select column",
      },
      {
        type: "select",
        label: "Condition",
        id: "condition",
        placeholder: "Select condition",
        options: [
          { "value": "==", "label": "==" },
          { "value": "!=", "label": "!=" },
          { "value": ">", "label": ">" },
          { "value": "<", "label": "<" },
          { "value": ">=", "label": ">=" },
          { "value": "<=", "label": "<=" },
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
        label: "Value",
        id: "conditionValue",
        placeholder: "Any string of characters (enforce numbers if needed)"
      },
      {
        type: "boolean",
        label: "Enforce value as string",
        id: "enforceString",
        advanced: true
      }
    ],
  };

  public static ConfigForm = ({ 
    nodeId, 
    data,
    context,
    componentService,
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
          componentService: componentService,
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands }) {

  const { setNodes, deleteElements, setViewport } = useReactFlow();
  const store = useStoreApi();

  const deleteNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const zoomSelector = (s) => s.transform[2] >= 1;
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }

  
  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: Filter.Type,
    Handle: Handle, // Make sure Handle is imported or defined
    Position: Position, // Make sure Position is imported or defined
    internals: internals
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
        ConfigForm: Filter.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
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
    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnIsNamed = config.column.named;
    const condition = config.condition;
    const conditionValue = config.conditionValue;
    const enforceString = config.enforceString; // Correct naming to reflect enforcing string type usage

    let formattedConditionValue: string;
    switch (columnType) {
        case 'string':
        case 'Object':
        case 'category':
            formattedConditionValue = `'${conditionValue.toString().replace(/'/g, "\\'")}'`;
            break;
        case 'datetime64':
            formattedConditionValue = `'${new Date(conditionValue).toISOString()}'`;
            break;
        case 'bool':
            formattedConditionValue = conditionValue.toString().toLowerCase();
            break;
        case 'timedelta[ns]':
            formattedConditionValue = `pd.to_timedelta(${conditionValue}, unit='ms')`;
            break;
        case 'period':
            formattedConditionValue = `'P${conditionValue.toString()}'`;
            break;
        default:
            formattedConditionValue = !isNaN(Number(conditionValue)) ? conditionValue.toString() : `'${conditionValue.toString()}'`;
            break;
    }

    let queryExpression: string;
    switch (condition) {
        case "==":
        case "!=":
            queryExpression = columnIsNamed ? `\`${columnName}\` ${condition} ${formattedConditionValue}` : `${columnName} ${condition} ${formattedConditionValue}`;
            break;
        case "contains":
        case "not contains":
        case "startswith":
        case "endswith":
            if (['string', 'Object', 'category'].includes(columnType)) {
                const method = condition.replace(" ", ".");
                queryExpression = columnIsNamed ? `\`${columnName}\`.str.${method}(${formattedConditionValue})` : `${columnName}.str.${method}(${formattedConditionValue})`;
            } else {
                throw new Error('Invalid operation for the data type');
            }
            break;
        case "isna":
        case "notna":
            queryExpression = columnIsNamed ? `\`${columnName}\`.${condition}()` : `${columnName}.${condition}()`;
            break;
        default:
            queryExpression = columnIsNamed ? `\`${columnName}\` ${condition} ${formattedConditionValue}` : `${columnName} ${condition} ${formattedConditionValue}`;
            break;
    }

    const code = `
# Filter rows based on condition
${outputName} = ${inputName}.query("${queryExpression}")
`;
    return code;
}





}