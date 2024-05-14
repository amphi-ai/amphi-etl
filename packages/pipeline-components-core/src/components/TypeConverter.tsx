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
        type: "column",
        label: "Column name",
        id: "column",
        placeholder: "Column name",
      },
      {
        type: "cascader",
        label: "Data Type to convert to",
        id: "dataType",
        placeholder: "Select ...",
        options: [
          {
            value: "numeric",
            label: "Numeric",
            children: [
              {
                value: "int",
                label: "Integer",
                children: [
                  { value: "int64", label: "int64: Standard integer type." },
                  { value: "int32", label: "int32: For optimized memory usage." },
                  { value: "int16", label: "int16: For more optimized memory usage." },
                  { value: "int8", label: "int8: For more optimized memory usage." },
                  { value: "uint64", label: "uint64: Unsigned integer (can only hold non-negative values)" },
                  { value: "uint32", label: "uint32: For more optimized memory usage." },
                  { value: "uint16", label: "uint16: For more optimized memory usage." },
                  { value: "uint8", label: "uint8: For more optimized memory usage." }

                ]
              },
              {
                value: "float",
                label: "Float",
                children: [
                  { value: "float64", label: "float64: Standard floating-point type." },
                  { value: "float32", label: "float32: For optimized memory usage." },
                  { value: "float16", label: "float16: For optimized memory usage." }

                ]
              }
            ]
          },
          {
            value: "text",
            label: "Text",
            children: [
              { value: "string", label: "string: For string data. (recommended)" },
              { value: "object", label: "object: For generic objects (strings, timestamps, mixed types)." },
              { value: "category", label: "category: For categorical variables." }

            ]
          },
          {
            value: "datetime",
            label: "Date & Time",
            children: [
              { value: "datetime64[ns]", label: "datetime64[ns]: For datetime values." },
              { value: "datetime64[ms]", label: "datetime64[ms]: For datetime values in milliseconds." },
              { value: "datetime64[s]", label: "datetime64[s]: For datetime values in seconds." },
              { value: "datetime32[ns]", label: "datetime32[ns]: For compact datetime storage in nanoseconds." },
              { value: "datetime32[ms]", label: "datetime32[ms]: For compact datetime storage in milliseconds." },
              { value: "timedelta[ns]", label: "timedelta[ns]: For differences between two datetimes." }
            ]
          },
          {
            value: "boolean",
            label: "Boolean",
            children: [
              { value: "bool", label: "bool: For boolean values (True or False)." }
            ]
          }
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
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }

  
  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: TypeConverter.Type,
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

  public generateComponentCode({ config, inputName, outputName }): string {
    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnNamed = config.column.named;
    const dataType = config.dataType[config.dataType.length - 1];
  
    let code = `# Initialize the output DataFrame\n`;
    code += `${outputName} = ${inputName}.copy()\n`;
    code += `# Convert ${columnName} from ${columnType} to ${dataType}\n`;
  
    if (columnNamed) {
      code += this.generateConversionCode(inputName, outputName, columnName, columnType, dataType, true);
    } else {
      code += this.generateConversionCode(inputName, outputName, columnName, columnType, dataType, false);
    }
  
    return code;
  }
  
  private generateConversionCode(inputName: string, outputName: string, columnName: string, columnType: string, dataType: string, columnNamed: boolean): string {
    let conversionFunction = `astype("${dataType}")`;
    let additionalParams = "";
  
    if (dataType.startsWith("datetime")) {
      if (dataType.includes("[")) {
        const unit = dataType.split("[")[1].split("]")[0];
        additionalParams = `, unit="${unit}"`;
      }
      conversionFunction = `pd.to_datetime`;
    } else if (columnType.startsWith("float") && dataType.startsWith("int")) {
      conversionFunction = `pd.to_numeric(${inputName}["${columnName}"], errors="coerce").fillna(0).astype("${dataType}")`;
      return `${outputName}["${columnName}"] = ${conversionFunction}\n`;
    }
  
    if (columnNamed) {
      return `${outputName}["${columnName}"] = ${conversionFunction}(${inputName}["${columnName}"]${additionalParams})\n`;
    } else {
      return `${outputName}.iloc[:, ${columnName}] = ${conversionFunction}(${inputName}.iloc[:, ${columnName}]${additionalParams})\n`;
    }
  }
  

}