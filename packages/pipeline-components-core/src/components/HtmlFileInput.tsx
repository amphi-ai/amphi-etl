import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../icons';

export class HtmlFileInput extends PipelineComponent<ComponentItem>() {

  public _name = 'HTML File Input';
  public _id = 'htmlInput';
  public _type = 'pandas_df_input';
  public _fileDrop = [ "html", "htm" ];
  public _category = 'input';
  public _icon = fileTextIcon;
  public _default = { };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholders: "Select or type file",
        validation: "\\.(html|htm)$",
        validationMessage: "This field expects a file with a html or htm extension such as index.html."
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

  const zoomSelector = createZoomSelector();
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
      type: HtmlFileInput.Type,
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
          name: HtmlFileInput.Name,
          ConfigForm: HtmlFileInput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: HtmlFileInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({config}): string[] {
    let imports: string[] = [];
    imports.push('import pandas as pd');
    imports.push('from unstructured.partition.html import partition_html');
    imports.push('from unstructured.staging.base import convert_to_dataframe');

    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    let code = '';
    const optionsString = Object.entries(config.jsonOptions || {})
        .filter(([key, value]) => value !== null && value !== '')
        .map(([key, value]) => `${key}='${value}'`)
        .join(', ');

    const optionsCode = optionsString ? `, ${optionsString}` : ''; // Only add optionsString if it exists

  // Initial code for loading HTML
    code += `
# Retrieve raw HTML from ${config.filePath}
${outputName}_elements = partition_html(filename="${config.filePath}")
${outputName} = convert_to_dataframe(${outputName}_elements)
`
return code;
}



}
