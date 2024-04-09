import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { apiIcon } from '../icons';

export class RestInput extends PipelineComponent<ComponentItem>() {

  public _name = "REST Input";
  public _id = "restInput";
  public _type = "pandas_df_input";
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

    const zoomSelector = (s) => s.transform[2] >= 1;
    const showContent = useStore(zoomSelector);

    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: RestInput.Type,
      Handle: Handle, // Make sure Handle is imported or defined
      Position: Position // Make sure Position is imported or defined
    });

    return (
      <>
        {renderComponentUI({
          id: id,
          data: data,
          context: context,
          manager: manager,
          commands: commands,
          name: RestInput.Name,
          ConfigForm: RestInput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: RestInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import json", "import requests", "from jsonpath_ng import parse"];
  }

  public generateComponentCode({ config, outputName }): string {
    let bodyParam = '';
    if (config.body && config.body.trim() !== '') {
      // JSON body as a Python dictionary
      bodyParam = `json=${config.body.trim()}, `;
    }

    let headersParam = '';
    if (config.headers && config.headers.length > 0) {
      headersParam = 'headers={' + config.headers.map(header => `"${header.key}": "${header.value}"`).join(', ') + '}, ';
    }

    let jsonPathParam = '';
    if (config.jsonPath && config.jsonPath.trim() !== '') {
      jsonPathParam = `jsonpath_expr = parse('${config.jsonPath}')\nselected_data = [match.value for match in jsonpath_expr.find(data)] if jsonpath_expr.find(data) else []\n${outputName} = pd.DataFrame(selected_data).convert_dtypes() if selected_data else pd.DataFrame()\n`;
    } else {
      jsonPathParam = `${outputName} = pd.DataFrame([data]).convert_dtypes() if isinstance(data, dict) else pd.DataFrame(data).convert_dtypes()\n`;
    }

    const params = `${headersParam}${bodyParam}`;
    const trimmedParams = params.endsWith(', ') ? params.slice(0, -2) : params; // Remove trailing comma and space if present

    const code = `
import requests
from jsonpath_ng import parse
response = requests.request(
  method="${config.method}",
  url="${config.url}"${trimmedParams ? ', ' + trimmedParams : ''}
)
data = response.json()
${jsonPathParam}
`;
    return code;
  }
}
