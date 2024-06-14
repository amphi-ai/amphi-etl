import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { splitIcon } from '../../icons';

export class SplitColumn extends PipelineComponent<ComponentItem>() {

  public _name = "Split Column";
  public _id = "splitColumn";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = splitIcon;
  public _default = { keepOriginalColumn: false };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "column",
        label: "Column",
        id: "column",
        placeholder: "Type column name",
      },
      {
        type: "selectCustomizable",
        label: "Delimiter",
        id: "delimiter",
        placeholder: "Select or type delimiter",
        options: [
          { value: ",", label: "comma (,)" },
          { value: ";", label: "semicolon (;)" },
          { value: " ", label: "space" },
          { value: "  ", label: "tab" },
          { value: "|", label: "pipe (|)" }
        ],
      },
      {
        type: "boolean",
        label: "Keep original column",
        id: "keepOriginalColumn",
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
      type: SplitColumn.Type,
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
          name: SplitColumn.Name,
          ConfigForm: SplitColumn.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: SplitColumn.Icon,
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
    const columnName = config.column.value; // name of the column
    const columnType = config.column.type; // current type of the column (e.g., 'int', 'string')
    const columnNamed = config.column.named; // boolean, true if column is named, false if index is used
  
    // Ensure unique variable names for intermediate dataframes
    const uniqueSplitVar = `${outputName}_split`;
    const uniqueCombinedVar = `${outputName}_combined`;
  
    // Start generating the code string
    let code = `\n# Create a new DataFrame from the split operation\n`;
  
    // Handling column access based on whether it's named or indexed
    const columnAccess = columnNamed ? `"${columnName}"` : columnName;
  
    // Convert column to string if it's not already
    if (columnType !== "string") {
      code += `${inputName}[${columnAccess}] = ${inputName}[${columnAccess}].astype("string")\n`;
    }
  
    // Split operation
    code += `${uniqueSplitVar} = ${inputName}[${columnAccess}].str.split("${config.delimiter}", expand=True)\n`;
  
    // Rename the new columns to avoid any potential overlap
    code += `${uniqueSplitVar}.columns  = [f"${columnName}_{i}" for i in range(${uniqueSplitVar}.shape[1])]\n`;
  
    // Combine the original DataFrame with the new columns
    code += `${outputName} = pd.concat([${inputName}, ${uniqueSplitVar}], axis=1)\n`;
  
    // Check if the original column should be kept
    if (!config.keepOriginalColumn) {
      code += `\n# Remove the original column used for split\n`;
      code += `${outputName}.drop(columns=[${columnAccess}], inplace=True)\n`;
    }
  
    // Assign to output
  
    return code;
  }
  

}