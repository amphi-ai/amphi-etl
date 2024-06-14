import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { splitIcon } from '../../icons';

export class RecursiveChunking extends PipelineComponent<ComponentItem>() {

  public _name = "Recursive chunking";
  public _id = "recursiveChunking";
  public _type = "documents_processor";
  public _category = "transform";
  public _icon = splitIcon; // You should define this icon in your icons file
  public _default = { separators: ["\n\n", "\n", " ", ""], regex: false, chunkSize: 1000, chunkOverlap: 100, chunkLength: "character" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "selectMultipleCustomizable",
        label: "Separators",
        id: "separators",
        tooltip: "The chunking strategy is parameterized by a list of separators. It tries to split on them in order until the chunks are small enough.",
        options: [
          { value: "\n\n", label: "Double newline (paragraph)" },
          { value: "\n", label: "Single newline" },
          { value: " ", label: "Space" },
          { value: "", label: "Empty (character-based splitting)" },
          { value: ",", label: "Comma (,)" },
          { value: ".", label: "Period (.)" },
          { value: "!", label: "Exclamation mark (!)" },
          { value: "?", label: "Question mark (?)" }
        ],
       advanced: true
      },
      {
        type: "boolean",
        label: "Separator is a regex",
        id: "regex",
        advanced: true
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
      },
      {
        type: "select",
        label: "Chunk length",
        tooltip: "Determine how the length of the chunks are measured. By default, the length of a chunk is measured in characters",
        id: "chunkLength",
        options: [
          { value: "character", label: "Character" },
          { value: "word", label: "Word" }
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
    type: RecursiveChunking.Type,
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
        name: RecursiveChunking.Name,
        ConfigForm: RecursiveChunking.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: RecursiveChunking.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideFunctions({ config }): string[] {
    let functions: string[] = [];
    if (config.chunkLength === "word") {
        const code = `
def word_length_function(text):
    return len(text.split())
`;
        functions.push(code);
    }
    return functions;
}

  public provideDependencies({config}): string[] {
    let deps: string[] = [];
    deps.push('tiktoken');
    return deps;
  }

  public provideImports({config}): string[] {
    return ["from langchain_text_splitters import RecursiveCharacterTextSplitter"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const lengthFunction = config.chunkLength === "word" ? ",\n  length_function=word_length_function" : "";

    const code = `
# Recursive chunking (character split)
${outputName}_text_splitter = RecursiveCharacterTextSplitter(
  separators = "${config.separator}",
  chunk_size = ${config.chunkSize},
  chunk_overlap  = ${config.chunkOverlap},
  is_separator_regex = ${config.regex ? "True" : "False"}${lengthFunction}
)
${outputName} = ${outputName}_text_splitter.split_documents(${inputName})
`;
    return code;
  }
  

}
