import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filterIcon } from '../icons';

export class Sample extends PipelineComponent<ComponentItem>() {

  public _name = "Sample";
  public _id = "sample";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = filterIcon;
  public _default = { "mode": "random" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "inputNumber",
        label: "Rows number",
        id: "rows",
        placeholder: "0",
        min: 0
      },
      {
        type: "radio",
        label: "Mode",
        id: "mode",
        options: [
          { value: "random", label: "Random"},
          { value: "head", label: "First"},
          { value: "tail", label: "Last" }
        ],
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
    type: Sample.Type,
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
        name: Sample.Name,
        ConfigForm: Sample.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: Sample.Icon,
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
    let sampleCode = "";
  
    if (config.mode === "random") {
      sampleCode = `${outputName} = ${inputName}.sample(n=${config.rows})`;
    } else if (config.mode === "tail") {
      sampleCode = `${outputName} = ${inputName}.tail(${config.rows})`;
    } else if (config.mode === "head") {
      sampleCode = `${outputName} = ${inputName}.head(${config.rows})`;
    }
  
    // Template for the pandas query code
    const code = `
${sampleCode}
  `;
    return code;
  }



}