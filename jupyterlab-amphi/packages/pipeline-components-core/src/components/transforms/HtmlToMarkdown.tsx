import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { markdownIcon } from '../../icons';

export class HtmlToMarkdown extends PipelineComponent<ComponentItem>() {

  public _name = "HTML to Markdown";
  public _id = "htmlToMarkdown";
  public _type = "documents_processor";
  public _category = "transform";
  public _icon = markdownIcon; // You should define this icon in your icons file
  public _default = { stripOrConvert: "strip", tags: ["<script>"] };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "radio",
        label: "Tags processing",
        id: "stripOrConvert",
        options: [
          { value: "strip", label: "Strip" },
          { value: "convert", label: "Convert" }
        ]
      },
      {
        type: "selectMultipleCustomizable",
        label: "Tags",
        id: "tags",
        tooltip: "List of tags to strip or convert to Markdown equivalent.",
        options: [
          { value: "script", label: "script" },
          { value: "style", label: "style" },
          { value: "iframe", label: "iframe" },
          { value: "object", label: "object" },
          { value: "form", label: "form" },
          { value: "h1", label: "h1" },
          { value: "h2", label: "h2" },
          { value: "h3", label: "h3" },
          { value: "h4", label: "h4" },
          { value: "h5", label: "h5" },
          { value: "h6", label: "h6" },
          { value: "p", label: "p" },
          { value: "strong", label: "strong" },
          { value: "b", label: "b" },
          { value: "em", label: "em" },
          { value: "i", label: "i" },
          { value: "a", label: "a" },
          { value: "ul", label: "ul" },
          { value: "ol", label: "ol" },
          { value: "li", label: "li" },
          { value: "div", label: "div" },
          { value: "span", label: "span" },
          { value: "img", label: "img" },
          { value: "br", label: "br" },
          { value: "hr", label: "hr" },
          { value: "table", label: "table" },
          { value: "tr", label: "tr" },
          { value: "td", label: "td" },
          { value: "th", label: "th" },
          { value: "thead", label: "thead" },
          { value: "tbody", label: "tbody" },
          { value: "tfoot", label: "tfoot" }
        ]
      },
      {
        type: "boolean",
        label: "Autolinks",
        id: "autolinks",
        tooltip: "Indicating whether the “automatic link” style should be used when a tag's contents match its href. Defaults to True.",
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
      type: HtmlToMarkdown.Type,
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
          name: HtmlToMarkdown.Name,
          ConfigForm: HtmlToMarkdown.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: HtmlToMarkdown.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('markdownify');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["from langchain_community.document_transformers import MarkdownifyTransformer"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const lengthFunction = config.chunkLength === "word" ? ",\n  length_function=word_length_function" : "";
    const tags = config.tags.map(tag => `"${tag}"`).join(", ");
    const stripOrConvert = config.stripOrConvert === "strip" ? "strip_tags" : "convert_tags";
    const autolinks = config.autolinks ? ",\n  autolinks=True" : "";

    const code = `
# Convert HTML to Markdown  
${outputName}_md = MarkdownifyTransformer(
  ${stripOrConvert}=[${tags}]
  ${autolinks}
)
${outputName} = ${outputName}_md.transform_documents(${inputName})
`;
    return code;
  }


}
