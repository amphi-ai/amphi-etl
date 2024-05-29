import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { apiIcon } from '../icons';

export class RestLookup extends PipelineComponent<ComponentItem>() {

  public _name = "REST Lookup";
  public _id = "restLookup";
  public _type = "pandas_df_lookup";
  public _category = "input";
  public _icon = apiIcon;
  public _default = { method: "GET", headers: [] };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "URL",
        id: "url",
        placeholder: "Endpoint URL",
      },
      {
        type: "radio",
        label: "Method",
        id: "method",
        options: [
          { key: "GET", value: "GET", text: "GET" },
          { key: "PUT", value: "PUT", text: "PUT" },
          { key: "POST", value: "POST", text: "POST" },
          { key: "DELETE", value: "DELETE", text: "DELETE" }
        ],
        advanced: true
      },
      {
        type: "keyvalue",
        label: "Headers",
        id: "headers",
        advanced: true
      },
      {
        type: "textarea",
        label: "Body",
        id: "body",
        placeholder: "Write body in JSON",
        advanced: true
      },
      {
        type: "input",
        label: "JSON Path",
        id: "jsonPath",
        placeholder: "JSON Path to retrieve from response",
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
      type: RestLookup.Type,
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
          name: RestLookup.Name,
          ConfigForm: RestLookup.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: RestLookup.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import requests", "from jsonpath_ng import parse"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const headersParam = config.headers && config.headers.length > 0 
        ? 'headers={' + config.headers.map(header => `"${header.key}": "${header.value}"`).join(', ') + '}, ' 
        : '';

    const jsonPathParam = config.jsonPath && config.jsonPath.trim() !== '' 
        ? `jsonpath_expr = parse('${config.jsonPath}')\n    return [match.value for match in jsonpath_expr.find(response.json())] if jsonpath_expr.find(response.json()) else []` 
        : 'return response.json()';

    const code = `
def lookup_value(row):
    response = requests.request(
        method="${config.method}",
        url="${config.url}".replace('{${config.inputColumnName}}', str(row['${config.inputColumnName}']))${headersParam ? ', ' + headersParam : ''}
    )
    ${jsonPathParam}

${inputName}['${config.resultColumnName}'] = ${inputName}.apply(lookup_value, axis=1)
${outputName} = ${inputName}
`;
    return code;
  }
}
