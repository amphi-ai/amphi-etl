import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../icons';

export class JsonFileInput extends PipelineComponent<ComponentItem>() {

  public _name = 'JSON File Input';
  public _id = 'jsonFileInput';
  public _type = 'pandas_df_input';
  public _fileDrop = [ "json", "jsonl" ];
  public _category = 'input';
  public _icon = fileTextIcon;
  public _default = { jsonOptions: { } };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\.(json|jsonl)$",
        validationMessage: "This field expects a file with a json extension such as input.json."
      },
      {
        type: "select",
        label: "Orientation",
        id: "jsonOptions.orient",
        placeholder: "default: columns",
        options: [
          { value: 'columns', label: 'Columns - JSON object with column labels as keys' },
          { value: 'records', label: 'Records - List of rows as JSON objects' },
          { value: 'index', label: 'Index - Dict with index labels as keys' },
          { value: 'split', label: 'Split - Dict with "index", "columns", and "data" keys' },
          { value: 'table', label: 'Table - Dict with "schema" and "data" keys, following the Table Schema' }
        ],
      },
      {
        type: "boolean",
        label: "Infer Data Types",
        id: "jsonOptions.dtype",
        advanced: true
      },
      {
        type: "boolean",
        label: "Line-delimited",
        id: "jsonOptions.lines",
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
      type: JsonFileInput.Type,
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
          name: JsonFileInput.Name,
          ConfigForm: JsonFileInput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: JsonFileInput.Icon,
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

  public generateComponentCode({config, outputName}): string {
    // Assuming the JSON options are nested under a jsonOptions key in the config object
    let optionsString = Object.entries(config.jsonOptions || {})
        .filter(([key, value]) => value !== null && value !== '')
        .map(([key, value]) => `${key}="${value}"`)
        .join(', ');

    const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

    const code = `
${outputName} = pd.read_json("${config.filePath}"${optionsCode}).convert_dtypes()
`;
    return code;
}


}
