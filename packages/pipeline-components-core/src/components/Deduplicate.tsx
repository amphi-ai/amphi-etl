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
  public _default = { keep: "first"};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "select",
        label: "Keep (survivorship)",
        id: "keep",
        options: [
          { value: "first", label: "Drop duplicates except for the first occurrence" },
          { value: "last", label: "Drop duplicates except for the last occurrence" },
          { value: false, label: "Drop all duplicates" }
        ],
      },
      {
        type: "columns",
        label: "Columns",
        id: "subset",
        placeholder: "All columns",
        tooltip: "Columns considered for identifying duplicates"
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
      type: Deduplicate.Type,
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
          name: Deduplicate.Name,
          ConfigForm: Deduplicate.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
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
    const columns = config.columns.length > 0 ? `subset=[${config.columns.map(name => `'${name.trim()}'`).join(", ")}], ` : '';
    const keep = config.keepFirst ? `'first'` : `'last'`;
  
    // Generating the Python code for deduplication
    code += `${outputName} = ${inputName}.drop_duplicates(${columns}keep=${keep})\n`;
  
    return code;
  }
}