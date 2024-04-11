import React, { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { FieldDescriptor } from '@amphi/pipeline-components-manager'

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { sortIcon } from '../icons';

import { Form, Divider, Input, Select, Space, Button } from 'antd';
import { MinusCircleOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';

export class Sort extends PipelineComponent<ComponentItem>() {

  public _name = "Sort";
  public _id = "sort";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = sortIcon; // You should define this icon in your icons file
  public _default = { "order":"true" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        label: "Sort By",
        id: "columnSorting"      }
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
    type: Sort.Type,
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
        name: Sort.Name,
        ConfigForm: Sort.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: Sort.Icon,
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
    const byColumns = config.by ? `by=[${config.by.split(',').map(column => `'${column.trim()}'`).join(', ')}]` : '';
    const ascending = typeof config.order !== 'undefined' ? `, ascending=${config.order}` : '';
    const ignoreIndex = config.ignoreIndex ? `, ignore_index=${config.ignoreIndex}` : '';

    const code = `${outputName} = ${inputName}.sort_values(${byColumns}${ascending}${ignoreIndex})`;
    return code;
  }

}

  // Define a type for your component's props
  interface KeyValueFormProps {
    field: FieldDescriptor;
    handleChange: (values: any, fieldId: string) => void;
    initialValues?: { key: string; value: string }[]; // Add this line
  }

const SortElements: React.FC<KeyValueFormProps> = ({ field, handleChange, initialValues }) => {
    const [keyValuePairs, setKeyValuePairs] = useState(initialValues || [{ key: '', value: '' }]);
  
    const handleAddPair = () => {
      setKeyValuePairs([...keyValuePairs, { key: '', value: '' }]);
      handleChange(keyValuePairs, field.id);
    };
  
    const handleRemovePair = (index: any) => {
      const pairs = [...keyValuePairs];
      pairs.splice(index, 1);
      setKeyValuePairs(pairs);
      handleChange(pairs, field.id);
    };
  
    const handleChangeKV = (e: React.ChangeEvent<HTMLInputElement>, index: number, property: string) => {
  
      const updatedKeyValuePairs = [...keyValuePairs];
  
      updatedKeyValuePairs[index] = {
        ...updatedKeyValuePairs[index],
        [property]: e.target.value
      };
  
      setKeyValuePairs(updatedKeyValuePairs);
      handleChange(updatedKeyValuePairs, field.id);
  
    };
  
    return (
      <Form.List name="keyValue">
        {(fields, { add, remove }) => (
          <>
            <Form.Item>
              {keyValuePairs.map((pair, index) => (
                <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Input
                    name={`${field.id}_key_${index}`}
                    placeholder={field.placeholder?.key || 'key'}
                    id={`${field.id}_key_${index}`}
                    value={pair.key}
                    onChange={(e) => handleChangeKV(e, index, 'key')}
                  />
                  <Input
                    name={`${field.id}_value_${index}`}
                    placeholder={field.placeholder?.value || 'value'}
                    id={`${field.id}_value_${index}`}
                    value={pair.value}
                    onChange={(e) => handleChangeKV(e, index, 'value')} />
                  <MinusCircleOutlined onClick={() => handleRemovePair(index)} />
                </Space>
              ))}
            </Form.Item>
            <Form.Item>
              <Button type="dashed" onClick={handleAddPair} block icon={<PlusOutlined />}>
                Add sorting
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    );
  };