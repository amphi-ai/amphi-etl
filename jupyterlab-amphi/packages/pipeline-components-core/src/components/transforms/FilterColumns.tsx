import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { crosshairIcon } from '../../icons';

export class FilterColumns extends PipelineComponent<ComponentItem>() {

  public _name = "Drop Columns";
  public _id = "filterColumn";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = crosshairIcon;
  public _default = { columns: {sourceData: [], targetKeys: [] }};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "transferData",
        label: "Filter columns",
        id: "columns",
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
    type: FilterColumns.Type,
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
        name: FilterColumns.Name,
        ConfigForm: FilterColumns.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: FilterColumns.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const allColumns = config.columns.sourceData;
    const targetKeys = config.columns.targetKeys;

    // Prepare column references, handling named and unnamed columns
    const columnsToKeep = targetKeys.map(key => {
        const column = allColumns.find(c => c.value === key);
        return column && column.named ? `"${key.trim()}"` : `${key.trim()}`;
    }).join(', ');

    // Python code generation for DataFrame operation
    const code = `
# Filter and order columns
${outputName} = ${inputName}[[${columnsToKeep}]]
`;
    return code;
}

}