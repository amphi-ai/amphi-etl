import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { sortIcon } from '../icons';

export class Sort extends PipelineComponent<ComponentItem>() {

  public _name = "Sort";
  public _id = "sort";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = sortIcon; // You should define this icon in your icons file
  public _default = { "order":"true" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Columns",
        id: "by",
        placeholder: "Column name(s)",
      },
      {
        type: "radio",
        label: "Order",
        id: "order",
        options: [
          { key: "true", value: "True", text: "Asc." },
          { key: "false", value: "False", text: "Desc." }
        ],
      },
      {
        type: "boolean",
        label: "Ignore Index",
        id: "ignoreIndex",
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
    type: Sort.Type,
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
        name: Sort.Name,
        ConfigForm: Sort.ConfigForm({nodeId:id, data, context, manager, commands, store, setNodes}),
        Icon: Sort.Icon,
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
    const byColumns = config.by ? `by=[${config.by.split(',').map(column => `'${column.trim()}'`).join(', ')}]` : '';
    const ascending = typeof config.order !== 'undefined' ? `, ascending=${config.order}` : '';
    const ignoreIndex = config.ignoreIndex ? `, ignore_index=${config.ignoreIndex}` : '';

    const code = `${outputName} = ${inputName}.sort_values(${byColumns}${ascending}${ignoreIndex})`;
    return code;
  }

}
