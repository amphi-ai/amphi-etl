import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../icons'; // Ensure you have an appropriate XML icon

export class XmlFileInput extends PipelineComponent<ComponentItem>() {

  public _name = 'XML File Input';
  public _id = 'xmlFileInput';
  public _type = 'pandas_df_input';
  public _fileDrop = ["xml"];
  public _category = 'input';
  public _icon = fileTextIcon;
  public _default = { xmlOptions: { xpath: '' } };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.xml$",
        validationMessage: "This field expects a file with an xml extension such as input.xml."
      },
      {
        type: "text",
        label: "XPath Expression",
        id: "xmlOptions.xpath",
        placeholder: "/root/child"
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
      type: XmlFileInput.Type,
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
          name: XmlFileInput.Name,
          ConfigForm: XmlFileInput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: XmlFileInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({config}): string[] {
    return ["import xml.etree.ElementTree as ET"]; // Adjust import based on XML parsing library
  }

  public generateComponentCode({config, outputName}): string {
    // Ensure unique variable names based on the outputName for tree and root
    const treeVar = `${outputName}_tree`;
    const rootVar = `${outputName}_root`;

    let xpathOption = config.xmlOptions.xpath ? `"${config.xmlOptions.xpath}"` : "'.'"; // Use the provided XPath or default to root

    const code = `
${treeVar} = ET.parse("${config.filePath}")
${rootVar} = ${treeVar}.getroot()
${outputName} = ${rootVar}.findall(${xpathOption})
    `;
    return code;
  }
}
