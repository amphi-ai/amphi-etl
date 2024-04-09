import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { typeIcon } from '../icons';

export class TypeConverter extends PipelineComponent<ComponentItem>() {

  public _name = "Type Converter";
  public _id = "typeConverter";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = typeIcon;
  public _default = { dataType: "string" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Column name",
        id: "columnName",
        placeholder: "Column name",
      },
      {
        type: "selectCustomizable",
        label: "Data Type to convert to",
        id: "dataType",
        placeholder: "Select column type to convert to",
        required: true,
        options: [
          { value: "null", label: "Select or specify type", disabled: true},
          { value: "string", label: "string: For string data." },
          { value: "int", label: "int: For integer types (use int64, int32, int16, etc. for optimized memory usage)."},
          { value: "float", label: "float: For floating-point numbers (use float64, float32, etc. for optimized memory usage)." },
          { value: "object", label: "object: For generic objects (strings, timestamps, mixed types)." },
          { value: "bool", label: "bool: For boolean values (True or False)." },
          { value: "datetime64", label: "datetime64: For datetime values (use datetime64[ns], datetime64[ns, tz] for more options)." },
          { value: "timedelta[ns]", label: "timedelta[ns]: For differences between two datetimes." },
          { value: "category", label: "category: For categorical variables." }
        ]
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
    type: TypeConverter.Type,
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
        name: TypeConverter.Name,
        ConfigForm: TypeConverter.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: TypeConverter.Icon,
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
    const { columnName, dataType } = config;

    const code = `
# Convert ${columnName} to ${dataType}
${outputName} = ${inputName}.assign(${columnName}=${inputName}['${columnName}'].astype('${dataType}'))
`;
    return code;
}



}