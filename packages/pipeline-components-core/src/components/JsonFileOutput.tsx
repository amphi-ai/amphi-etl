import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { filePlusIcon } from '../icons';

export class JsonFileOutput extends PipelineComponent<ComponentItem>() {

  public _name = 'JSON File Output';
  public _id = 'jsonFileOutput';
  public _type = 'pandas_df_output';
  public _category = 'output';
  public _icon = filePlusIcon;
  public _default = { jsonOptions: { "orient": "records"} };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\.(json|jsonl)$",
        validationMessage: "This field expects a file with a json or jsonl extension such as output.json."
      },
      {
        type: "select",
        label: "Orientation",
        id: "jsonOptions.orient",
        placeholder: "Select orientation",
        options: [
          { value: "columns", label: "columns (JSON object with column labels as keys)" },
          { value: "records", label: "records (List of rows as JSON objects)" },
          { value: "index", label: "index (Dict with index labels as keys)" },
          { value: "split", label: "split (Dict with 'index', 'columns', and 'data' keys)" },
          { value: "table", label: "table (Dict with 'schema' and 'data' keys, following the Table Schema)" }
        ],
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
      type: JsonFileOutput.Type,
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
          name: JsonFileOutput.Name,
          ConfigForm: JsonFileOutput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: JsonFileOutput.Icon,
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

  public generateComponentCode({config, inputName}): string {

    let optionsString = Object.entries(config.jsonOptions || {})
        .filter(([key, value]) => value !== null && value !== '')
        .map(([key, value]) => `${key}='${value}'`)
        .join(', ');

    const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

    const code = `
${inputName}.to_json('${config.filePath}'${optionsCode})
`;
    return code;
  }  


}
