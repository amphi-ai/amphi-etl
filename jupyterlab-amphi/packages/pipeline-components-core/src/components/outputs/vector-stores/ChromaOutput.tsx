import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { chromaIcon } from '../../../icons';

export class ChromaOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Chroma Output";
  public _id = "chromaOutput";
  public _type = "documents_output";
  public _category = "output";
  public _icon = chromaIcon;
  public _default = { }; // No default options for Parquet as of now
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Collection name",
        id: "collection",
        placeholder: "Type collection name"
      },
      {
        type: "input",
        label: "Directory to persist",
        id: "persistDirectory",
        placeholder: "./chroma_db",
        advanced: true
      },
      {
        type: "cascader",
        label: "Embeddings Model",
        id: "model",
        placeholder: "Select ...",
        options: [
          {
            value: "openai",
            label: "OpenAI",
            children: [
              { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
              { value: "text-embedding-3-small", label: "text-embedding-3-small" },
              { value: "text-embedding-3-large", label: "text-embedding-3-large" }
            ]
          }
        ]
      },
      {
        type: "input",
        inputType: "password",
        label: "OpenAI API Key",
        id: "openaiApiKey",
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

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId, componentService }


    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: ChromaOutput.Type,
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
          name: ChromaOutput.Name,
          ConfigForm: ChromaOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: ChromaOutput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["from langchain_openai import OpenAIEmbeddings", "from langchain_chroma import Chroma"];
  }

  public generateComponentCode({ config, inputName }): string {
    const persistDirectory = config.persistDirectory ? `persist_directory="${config.persistDirectory}", ` : '';
  
    const code = `
# Documents to Chroma with on-the-fly embedding
${inputName}_collection_name = "${config.collection}"
${inputName}_embeddings = OpenAIEmbeddings(api_key="${config.openaiApiKey}")
${inputName}_to_Chroma = Chroma.from_documents(${inputName}, ${inputName}_embeddings, ${persistDirectory}collection_name=${inputName}_collection_name)
`;
    return code;
  }

}
