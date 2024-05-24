import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { filePlusIcon } from '../icons';

export class PineconeOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Pinecone Output";
  public _id = "PineconeOutput";
  public _type = "documents_output";
  public _category = "output.Vector Database";
  public _icon = filePlusIcon;
  public _default = { parquetOptions: { compression: "snappy"}}; // No default options for Parquet as of now
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Index Name",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.(parquet)$",
        validationMessage: "This field expects a file with a .parquet extension such as output.parquet."
      },
      {
        type: "password",
        label: "Pinecone API Key",
        id: "pineconeApiKey"
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
      type: PineconeOutput.Type,
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
          name: PineconeOutput.Name,
          ConfigForm: PineconeOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: PineconeOutput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["from langchain_openai import OpenAIEmbeddings", "from pinecone import Pinecone", "from langchain_pinecone import PineconeVectorStore"];
  }

  public generateComponentCode({ config, inputName }): string {

    const code = `
# Documents to Pinecone with on-the-fly embedding
pinecone_api_key = os.environ.get("PINECONE_API_KEY")
${inputName}_pc = Pinecone(api_key=${config.pineconeApiKey})
${inputName}_embeddings = OpenAIEmbeddings()
${inputName}_to_Pinecone = PineconeVectorStore.from_documents(${inputName}, ${inputName}_embeddings, index_name=${config.indexName})
`;
    return code;
  }

}
