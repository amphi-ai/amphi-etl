import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filterIcon } from '../icons';

export class FilterColumns extends PipelineComponent<ComponentItem>() {

  public _name = "Filter Columns";
  public _id = "filterColumns";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = filterIcon;
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "valuesList",
        label: "Columns to keep",
        id: "columns",
        placeholders: "columns list comma-separated",
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
      type: FilterColumns.Type,
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
          name: FilterColumns.Name,
          ConfigForm: FilterColumns.ConfigForm({ nodeId: id, data, context, manager, commands, store, setNodes }),
          Icon: FilterColumns.Icon,
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

    const columns = config.columns; // Now a list of columns
    const indexes = config.indexes;
    let filterMethod = '';

    if (indexes) {
      // Ensure columns are treated as integers for numeric indexes
      const numericIndexes = columns.map(index => parseInt(index));
      filterMethod = `.iloc[:, ${JSON.stringify(numericIndexes)}]`;
    } else {
      // Use filter for column names, assume columns is already a list of strings
      filterMethod = `.filter(${JSON.stringify(columns)})`;
    }

    // Template for the pandas rename columns code
    const code = `
# Filter columns
${outputName} = ${inputName}${filterMethod}
    `;
    return code;
  }

}