import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { filePlusIcon } from '../icons';

export class XmlFileOutput extends PipelineComponent<ComponentItem>() {

  public _name = 'XML File Output';
  public _id = 'xmlFileOutput';
  public _type = 'pandas_df_output'; // Adjust if necessary for your data structure
  public _category = 'output';
  public _icon = filePlusIcon;
  public _default = {}; // Default options for XML output can be defined here
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.xml$",
        validationMessage: "This field expects a file with an xml extension such as output.xml."
      }
    ],
  };

  public static ConfigForm = ({ nodeId, data, context, componentService, manager, commands, store, setNodes }) => {
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

    const handleElement = React.createElement(renderHandle, {
      type: XmlFileOutput.Type,
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
          name: XmlFileOutput.Name,
          ConfigForm: XmlFileOutput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: XmlFileOutput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({config}): string[] {
    // Adjust this based on the XML library you choose to use for output
    return ["import xml.etree.ElementTree as ET", "import pandas as pd"]; // Adjust if pandas isn't required
  }

  public generateComponentCode({config, inputName}): string {
    // Create unique variable names based on the inputName for the XML output
    const xmlOutputVar = `${inputName}_xml_output`;
    const fileVar = `${inputName}_file`;

    const code = `
# Output the XML content to a file
${xmlOutputVar} = ${inputName}.to_xml()
with open("${config.filePath}", "w") as ${fileVar}:
    ${fileVar}.write(${xmlOutputVar})
`;
    return code;
  }
}
