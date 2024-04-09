import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { editIcon } from '../icons';

export class RenameColumns extends PipelineComponent<ComponentItem>() {

  public _name = "Rename Columns";
  public _id = "rename";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = editIcon;
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "keyvalue",
        label: "Columns",
        id: "columns",
        placeholders: { key: "column name", value: "new column name"},
        advanced: true
      },
      {
        type: "boolean",
        label: "Numeric indexes",
        id: "indexes",
        placeholder: "false",
        advanced: true
      },
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
    type: RenameColumns.Type,
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
        name: RenameColumns.Name,
        ConfigForm: RenameColumns.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: RenameColumns.Icon,
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

  public generateComponentCode({config, inputName, outputName}): string {

      const indexes = config.indexes;

      let columnsParam = '';
      if (config.columns && config.columns.length > 0) {
          if (indexes) { // If columns are numeric indexes
              columnsParam = 'columns={' + config.columns.map(column => `${column.key}: '${column.value}'`).join(', ') + '}';
          } else { // If columns are labels
              columnsParam = 'columns={' + config.columns.map(column => `'${column.key}': '${column.value}'`).join(', ') + '}';
          }
      }
    
      // Template for the pandas rename columns code
      const code = `
# Rename columns
${outputName} = ${inputName}.rename(${columnsParam})
`;
  return code;
  }
  
}