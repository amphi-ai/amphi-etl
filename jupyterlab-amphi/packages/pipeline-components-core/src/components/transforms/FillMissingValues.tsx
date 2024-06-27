import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { checkDiamondIcon } from '../../icons'; // Define this icon in your icons file

export class FillMissingValues extends PipelineComponent<ComponentItem>() {

  public _name = "Fill Missing Values";
  public _id = "fillMissingValues";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = checkDiamondIcon;
  public _default = { method: "value", value: 0, forward: false, backward: false };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "select",
        label: "Filling Method",
        id: "method",
        options: [
          { value: "value", label: "Fill with value" },
          { value: "mean", label: "Fill with mean" },
          { value: "median", label: "Fill with median" },
          { value: "ffill", label: "Forward fill" },
          { value: "bfill", label: "Backward fill" },
        ],
      },
      {
        type: "input",
        label: "Value",
        id: "value",
        placeholder: "Enter value"
      },
      {
        type: "columns",
        label: "Apply to columns",
        id: "columns",
        placeholder: "Default (All)",
        advanced: true
      },
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
    const defaultConfig = this.Default;

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

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId, componentService }

  const handleElement = React.createElement(renderHandle, {
    type: FillMissingValues.Type,
    Handle: Handle,
    Position: Position,
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
        name: FillMissingValues.Name,
        ConfigForm: FillMissingValues.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: FillMissingValues.Icon,
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

  public generateComponentCode({ config, inputName, outputName }): string {

    let code = `# Fill missing values\n`;

    const columns = config.columns && config.columns.length > 0 ? `[${config.columns.map(col => col.named ? `"${col.value}"` : col.value).join(", ")}]` : "";
    const columnsAssignment = config.columns && config.columns.length > 0 ? `${inputName}[${columns}]` : `${inputName}`;

    if (config.method === "value") {

      const value = config.columns.some(col => col.type === 'string') ? `"${config.value}"` : config.value;
      console.log("config.columns %o", config.columns);
      console.log("value %o", value);
      code += `${columnsAssignment} = ${columnsAssignment}.fillna(${value})\n`;
    } else if (config.method === "mean") {
      code += `${columnsAssignment} = ${columnsAssignment}.fillna(${columnsAssignment}.mean())\n`;
    } else if (config.method === "median") {
      code += `${columnsAssignment} = ${columnsAssignment}.fillna(${columnsAssignment}.median())\n`;
    } else if (config.method === "ffill") {
      code += `${columnsAssignment} = ${columnsAssignment}.ffill()\n`;
    } else if (config.method === "bfill") {
      code += `${columnsAssignment} = ${columnsAssignment}.bfill()\n`;
    }

    code += `${outputName} = ${inputName}\n`

    return code;
  }

}
