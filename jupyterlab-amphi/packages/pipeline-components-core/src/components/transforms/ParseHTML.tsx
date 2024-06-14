import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { htmlLineIcon } from '../../icons';

export class ParseHTML extends PipelineComponent<ComponentItem>() {

  public _name = "Parse HTML";
  public _id = "parseHtml";
  public _type = "documents_processor";
  public _category = "transform";
  public _icon = htmlLineIcon; // You should define this icon in your icons file
  public _default = { };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "selectMultipleCustomizable",
        label: "Tags to extract",
        id: "tagsToExtract",
        tooltip: "A list of tags whose content will be extracted.",
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
        type: "selectMultipleCustomizable",
        label: "Unwanted tags",
        id: "unwantedTags",
        tooltip: "A list of tags to be removed from the HTML.",
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
        type: "valuesList",
        label: "Remove class names",
        id: "removeClassnames",
        tooltip: "A list of class names to be removed from the HTML.",
        advanced: true
      },
      {
        type: "boolean",
        label: "Remove unecessary lines",
        id: "removeLines",
        tooltip: "If set to True, unnecessary lines will be removed.",
        advanced: true
      },
      {
        type: "boolean",
        label: "Remove comments",
        id: "removeComments",
        tooltip: "If set to True, comments will be removed.",
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
      type: ParseHTML.Type,
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
          name: ParseHTML.Name,
          ConfigForm: ParseHTML.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: ParseHTML.Icon,
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
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["from langchain_community.document_transformers import BeautifulSoupTransformer"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const formatList = (list: string[]): string => {
      return list && list.length > 0 ? `[${list.map(item => `'${item}'`).join(', ')}]` : '[]';
    };
  
    const formatBoolean = (value: boolean): string => {
      return typeof value === 'boolean' ? `${value ? 'True' : 'False'}` : 'None';
    };
  
    const options = [
      config.tagsToExtract && config.tagsToExtract.length > 0 ? `tags_to_extract=${formatList(config.tagsToExtract)}` : '',
      config.unwantedTags && config.unwantedTags.length > 0 ? `unwanted_tags=${formatList(config.unwantedTags)}` : '',
      config.removeClassnames && config.removeClassnames.length > 0 ? `remove_classnames=${formatList(config.removeClassnames)}` : '',
      config.removeLines !== undefined && config.removeLines !== false ? `remove_lines=${formatBoolean(config.removeLines)}` : '',
      config.removeComments !== undefined && config.removeComments !== false ? `remove_comments=${formatBoolean(config.removeComments)}` : ''
    ].filter(option => option).join(',\n  ');
  
    const code = `
# Parse HTML
${outputName}_transformer = BeautifulSoupTransformer()
${outputName} = ${outputName}_transformer.transform_documents(${inputName},
${options}
)
`;
    return code;
  }


}
