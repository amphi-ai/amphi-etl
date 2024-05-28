import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { pineconeIcon } from '../icons';

export class PineconeOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Pinecone Output";
  public _id = "PineconeOutput";
  public _type = "documents_output";
  public _category = "output";
  public _icon = pineconeIcon;
  public _default = { createIndex: false, cloudAndRegion: ["aws", "us-east-1"], dimensions: 1536, similarityMetric: "cosine" }; // No default options for Parquet as of now
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Index Name",
        id: "indexName",
        placeholder: "Type index name"
      },
      {
        type: "boolean",
        label: "Create index if not exist",
        id: "createIndex",
        advanced: true
      },
      {
        type: "input",
        inputType: "password",
        label: "Pinecone API Key",
        id: "pineconeApiKey",
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
        type: "cascader",
        label: "Pinecone Cloud Region",
        id: "cloudAndRegion",
        placeholder: "Select ...",
        options: [
          {
            value: "aws",
            label: "AWS",
            children: [
              { value: "us-east-1", label: "us-east-1" }
            ]
          }
        ],
        advanced: true
      },
      {
        type: "inputNumber",
        label: "Index Dimensions",
        id: "dimensions",
        advanced: true
      },
      {
        type: "radio",
        label: "Vector Similarity metric",
        id: "similarityMetric",
        options: [
          { value: "cosine", label: "Cosine" },
          { value: "euclidean", label: "Euclidean" },
          { value: "dotproduct", label: "Dot Product" }
        ],
        advanced: true
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
    return ["from langchain_openai import OpenAIEmbeddings", "from pinecone import Pinecone, ServerlessSpec", "from langchain_pinecone import PineconeVectorStore"];
  }

  public generateComponentCode({ config, inputName }): string {
    
    const createIndexCode = config.createIndex ? `

# Check if index already exists
if (${inputName}_index_name not in ${inputName}_pc.list_indexes().names()):
    # If does not exist, create index
    ${inputName}_pc.create_index(
        ${inputName}_index_name,
        dimension=${config.dimensions},  # dimensionality of text-embed-3-small
        metric="${config.similarityMetric}", # cosinus recommended for OpenAI
        spec=ServerlessSpec(cloud="${config.cloudAndRegion[0]}", region="${config.cloudAndRegion[1]}")
    )
    # wait for index to be initialized
    while not ${inputName}_pc.describe_index(${inputName}_index_name).status['ready']:
        time.sleep(1)
` : '';

    const code = `
# Documents to Pinecone with on-the-fly embedding
${inputName}_pc = Pinecone(api_key="${config.pineconeApiKey}")
${inputName}_index_name = "${config.indexName}"
${createIndexCode}
${inputName}_embeddings = OpenAIEmbeddings(api_key="${config.openaiApiKey}")
${inputName}_to_Pinecone = PineconeVectorStore.from_documents(${inputName}, ${inputName}_embeddings, index_name=${inputName}_index_name)
`;
    return code;
}


}
