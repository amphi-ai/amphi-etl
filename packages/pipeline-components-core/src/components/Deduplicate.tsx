import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { dedupIcon } from '../icons';

export class Deduplicate extends PipelineComponent<ComponentItem>() {

  public _name = "Deduplicate";
  public _id = "deduplicateData";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = dedupIcon; // Assuming codeIcon is imported or defined elsewhere
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Columns",
        id: "subset",
        placeholder: "Optional: comma separated column names",
      },
      {
        type: "datalist",
        label: "Keep (survivorship)",
        id: "keep",
        placeholder: "first",
        options: [
          { key: "first", value: "first", text: "Drop duplicates except for the first occurrence." },
          { key: "last", value: "last", text: "Drop duplicates except for the last occurrence." },
          { key: "false", value: false, text: "Drop all duplicates." }
        ],
      },
    ],
  };

  public static ConfigForm = ({
    nodeId,
    data,
    context,
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
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, manager, commands }) {

    const { setNodes, deleteElements, setViewport } = useReactFlow();
    const store = useStoreApi();

    const deleteNode = useCallback(() => {
      deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

    const zoomSelector = (s) => s.transform[2] >= 1;
    const showContent = useStore(zoomSelector);

    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: Deduplicate.Type,
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
          name: Deduplicate.Name,
          ConfigForm: Deduplicate.ConfigForm({ nodeId: id, data, context, manager, commands, store, setNodes }),
          Icon: Deduplicate.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // Initializing code string
    let code = `# Deduplicate\n`;
    const columns = config.columns ? `subset=['${config.columns.split(',').map(name => name.trim()).join("', '")}'], ` : '';
    const keep = config.keepFirst ? `'first'` : `'last'`;

    // Generating the Python code for deduplication
    code += `${outputName} = ${inputName}.drop_duplicates(${columns}keep=${keep})\n`;

    return code;
  }
}