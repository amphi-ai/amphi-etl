import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { splitIcon } from '../icons';

export class SplitColumn extends PipelineComponent<ComponentItem>() {

  public _name = "Split Column";
  public _id = "splitColumn";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = splitIcon;
  public _default = { "keepOriginalColumn": false };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Column",
        id: "column",
        placeholder: "Type column name",
      },
      {
        type: "select",
        label: "Delimiter",
        id: "delimiter",
        placeholder: "Select or type delimiter",
        options: [
          { value: "null", label: "Select or type delimiter", isDisabled: true},
          { value: ",", label: "comma (,)"},
          { value: ";", label: "semicolon (;)" },
          { value: " ", label: "space" },
          { value: "  ", label: "tab" },
          { value: "|", label: "pipe (|)"}
        ],
      },
      {
        type: "input",
        label: "Column names",
        id: "columnNames",
        placeholder: "Optional: comma separated",
        advanced: true
      },
      {
        type: "boolean",
        label: "Keep original column",
        id: "keepOriginalColumn",
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
    type: SplitColumn.Type,
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
        name: SplitColumn.Name,
        ConfigForm: SplitColumn.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: SplitColumn.Icon,
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
  // Ensure unique variable names for intermediate dataframes
  const uniqueSplitVar = `${outputName}_split`;
  const uniqueCombinedVar = `${outputName}_combined`;

  // Start generating the code string
  let code = `\n# Create a new DataFrame from the split operation\n`;
  code += `${uniqueSplitVar} = ${inputName}['${config.column}'].str.split('${config.delimiter}', expand=True)\n`;

  // Conditionally add code for renaming columns if column names are provided
  if (config.columnNames) {
      const columnNames = config.columnNames.split(',').map(name => name.trim()).join("', '");
      code += `\n# Rename columns\n`;
      code += `${uniqueSplitVar}.columns = ['${columnNames}']\n`;
  }

  // Combine the original DataFrame with the new columns
  code += `\n# Combine original DataFrame with the new temporary split DataFrame\n`;
  code += `${uniqueCombinedVar} = ${inputName}.join(${uniqueSplitVar})\n`;

  // Check if the original column should be kept
  if (!config.keepOriginalColumn) {
      code += `\n# Remove the original column used for split if required\n`;
      code += `${outputName} = ${uniqueCombinedVar}.drop(columns=['${config.column}'])\n`;
  } else {
    code += `${outputName} = ${uniqueCombinedVar}\n`;
  }

  return code;
}



}