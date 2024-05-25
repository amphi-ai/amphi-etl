import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { splitIcon } from '../icons';

export class Chunking extends PipelineComponent<ComponentItem>() {

  public _name = "Text Chunking";
  public _id = "chunking";
  public _type = "documents_processor";
  public _category = "transform.RAG";
  public _icon = splitIcon; // You should define this icon in your icons file
  public _default = { };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "columns",
        label: "Columns",
        id: "by",
        placeholder: "Select columns",
      },
      {
        type: "radio",
        label: "Order",
        id: "order",
        options: [
          { value: "True", label: "Asc." },
          { value: "False", label: "Desc." }
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
    type: Chunking.Type,
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
        name: Chunking.Name,
        ConfigForm: Chunking.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: Chunking.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideDependencies({config}): string[] {
    let deps: string[] = [];
    deps.push('tiktoken');
    return deps;
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {

    const byColumns = `by=[${config.by.map(column => column.named ? `"${column.value}"` : column.value).join(", ")}]`;
    const ascending = typeof config.order !== "undefined" ? `, ascending=${config.order}` : "";
    const ignoreIndex = config.ignoreIndex ? `, ignore_index=${config.ignoreIndex}` : "";
  
    const code = `
# Sort rows
${outputName} = ${inputName}.sort_values(${byColumns}${ascending}${ignoreIndex})
`;
    return code;
  }
  

}
