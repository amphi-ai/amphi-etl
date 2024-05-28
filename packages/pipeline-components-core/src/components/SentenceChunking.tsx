import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { splitIcon } from '../icons';

export class SentenceChunking extends PipelineComponent<ComponentItem>() {

  public _name = "Sentence chunking";
  public _id = "sentenceChunking";
  public _type = "documents_processor";
  public _category = "transform";
  public _icon = splitIcon; // You should define this icon in your icons file
  public _default = { type: "nltk", chunkSize: 1000, chunkOverlap: 100 };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "select",
        label: "Type",
        id: "type",
        options: [
          { value: "nltk", label: "NLTK" },
          { value: "spacy", label: "spaCy" }
        ]
      },
      {
        type: "inputNumber",
        label: "Chunk Size",
        id: "chunkSize",
      },
      {
        type: "inputNumber",
        label: "Chunk Overlap",
        id: "chunkOverlap",
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
    type: SentenceChunking.Type,
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
        name: SentenceChunking.Name,
        ConfigForm: SentenceChunking.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: SentenceChunking.Icon,
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

    let imports: string[] = [];
    switch (config.type) {
      case 'nltk':
        imports.push('from langchain.text_splitters import NLTKTextSplitter');
        break;
      case 'spacy':
        imports.push('from langchain.text_splitter import SpacyTextSplitter');
        break;
      default:
        console.error('Unknown option');
    }

    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
  
    let splitter: string;
    switch (config.type) {
      case 'nltk':
        splitter = `${outputName}_text_splitter = NLTKTextSplitter(chunk_size=${config.chunkSize}, chunk_overlap=${config.chunkOverlap})`;
        break;
      case 'spacy':
        splitter = `${outputName}_text_splitter = SpaCyTextSplitter(chunk_size=${config.chunkSize}, chunk_overlap=${config.chunkOverlap})`;
        break;
      default:
        console.error('Unknown option');
    }

    const code = `
# Sentence chunking
${splitter}
${outputName} = ${outputName}_text_splitter.split_documents(${inputName})
`;
    return code;
  }
  

}
