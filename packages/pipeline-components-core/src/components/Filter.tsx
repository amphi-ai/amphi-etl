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
  public _default = { condition: "==" };
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
          { "value": "isnull", "label": "Is Null" },
          { "value": "notempty", "label": "Not Empty" },
          { "value": "isempty", "label": "Is Empty" },
          { "value": "contains", "label": "Contains (string)" },
          { "value": "not contains", "label": "Not contains (string)" },
          { "value": "startswith", "label": "Starts With (string)" },
          { "value": "endswith", "label": "Ends With (string)" }
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
          ConfigForm: Filter.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: Filter.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnIsNamed = config.column.named;
    const condition = config.condition;
    const conditionValue = config.conditionValue;
    const enforceString = config.enforceString;

    let formattedConditionValue: string;
    switch (columnType) {
      case 'string':
      case 'Object':
      case 'category':
        formattedConditionValue = `${conditionValue.toString().replace(/"/g, '\\"')}`;
        break;
      case 'datetime64':
        formattedConditionValue = `${new Date(conditionValue).toISOString()}`;
        break;
      case 'bool':
        formattedConditionValue = conditionValue.toString().toLowerCase();
        break;
      case 'timedelta[ns]':
        formattedConditionValue = `pd.to_timedelta(${conditionValue}, unit='ms')`;
        break;
      case 'period':
        formattedConditionValue = `P${conditionValue.toString()}`;
        break;
      default:
        formattedConditionValue = !isNaN(Number(conditionValue)) ? conditionValue.toString() : `'${conditionValue.toString()}'`;
        break;
    }

    let code = `
# Filter rows based on condition
`;

    let queryExpression: string;
    const columnReference = columnIsNamed ? `'${columnName}'` : columnName;
    switch (condition) {
      case "==":
      case "!=":
        queryExpression = `${columnReference} ${condition} '${formattedConditionValue}'`;
        code += `${outputName} = ${inputName}.query("${queryExpression}")`;
        break;
      case "contains":
      case "not contains":
        if (['string', 'Object', 'category'].includes(columnType)) {
          const negation = condition === "not contains" ? "~" : "";
          queryExpression = `${inputName}[${negation}${inputName}[${columnReference}].str.contains("${formattedConditionValue}", na=False)]`;
          code += `${outputName} = ${queryExpression}`;
        } else {
          throw new Error('Invalid operation for the data type');
        }
        break;
      case "startswith":
      case "endswith":
        if (['string', 'Object', 'category'].includes(columnType)) {
          queryExpression = `${inputName}[${inputName}[${columnReference}].str.${condition}("${formattedConditionValue.slice(1, -1)}", na=False)]`;
          code += `${outputName} = ${queryExpression}`;
        } else {
          throw new Error('Invalid operation for the data type');
        }
        break;
      case "notnull":
        queryExpression = `${inputName}.dropna(subset=[${columnReference}])`
        code += `${outputName} = ${queryExpression}`;
        break;
      case "isnull":
        queryExpression = `${inputName}[${inputName}[${columnReference}].isna()]`;
        code += `${outputName} = ${queryExpression}`;
        break;
      default:
        queryExpression = `${columnReference} ${condition} '${formattedConditionValue}'`;
        code += `${outputName} = ${inputName}.query("${queryExpression}")`;
        break;
    }

    return code;
  }


}