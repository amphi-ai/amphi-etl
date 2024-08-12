import React, { useState, useRef} from 'react';
import { FieldDescriptor } from '../configUtils'
import { minusIcon, plusIcon } from '../icons';
import { ConfigProvider, Divider, Input, Select, Space, Button, Form, Empty } from 'antd';
import type { InputRef } from 'antd';

import { MinusCircleOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { KernelMessage } from '@jupyterlab/services';
import { Option } from '../configUtils';
import { RequestService } from '../RequestService';


// Define a type for your component's props
interface KeyValueFormProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  initialValues?: { key: any; value: string }[]; // Add this line
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const KeyValueColumnsSelect: React.FC<KeyValueFormProps> = ({ field, handleChange, initialValues,  context, componentService, commands, nodeId, advanced }) => {
  const [keyValuePairs, setKeyValuePairs] = useState(initialValues || [{ key: { value: '', type: '', named: true}, value: ''}]);
  const [loadings, setLoadings] = useState<boolean>();
  const [items, setItems] = useState<Option[]>([]);
  const [options, setOptions] = useState<Option[]>(field.options);
  const inputRef = useRef<InputRef>(null);
  const [name, setName] = useState('');

  const findOptionByValue = (value: any) => {
    return field.options.find(option => option.value === value) || { value: value, label: value };
  };

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

  const handleChangeKV = (newValue: string, index: number, property: string) => {
    const updatedKeyValuePairs = [...keyValuePairs];
    updatedKeyValuePairs[index] = {
      ...updatedKeyValuePairs[index],
      [property]: newValue
    };
  
    setKeyValuePairs(updatedKeyValuePairs);
    handleChange(updatedKeyValuePairs, field.id);
  };

  const getAvailableItems = (index: number) => {
    const selectedKeys = keyValuePairs.map(pair => pair.key).filter((_, idx) => idx !== index);
    return items ? items.filter(item => !selectedKeys.includes(item.value)) : [];
  };


  const getTypeNamedByValue = (items: Option[], value: any): { type: string, named: boolean } | undefined => {
    const item = items.find(item => item.value === value);
    if (item) {
      return { type: item.type, named: item.named };
    }
    return undefined;
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleSelectColumnChange = (selection: any, index: number) => {
    const value = selection.value;
    const {type, named} = getTypeNamedByValue(items, value);
    const updatedKeyValuePairs = [...keyValuePairs];
    updatedKeyValuePairs[index] = {
      ...updatedKeyValuePairs[index],
      key: { value: value, type: type, named: named }
    };
    setKeyValuePairs(updatedKeyValuePairs);
    handleChange(updatedKeyValuePairs, field.id);
  };


  const customizeRenderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      <Button 
        type="primary" 
        onClick={(event) => RequestService.retrieveDataframeColumns(
          event,
          context,
          commands,
          componentService,
          setItems,
          setLoadings, 
          nodeId,
          0,
          true
        )} 
        loading={loadings}>Retrieve columns
      </Button>
    </div>
  );

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name}]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <Form.List name="keyValue">
      {(fields, { add, remove }) => (
        <>
          <Form.Item>
            {keyValuePairs.map((pair, index) => (
                <Space direction="vertical" style={{ display: 'flex', width: '100%' , marginBottom: 8 }}>
                 <ConfigProvider renderEmpty={customizeRenderEmpty}>
                  <Select
                  labelInValue
                  size={advanced ? "middle" : "small"}
                  className="nodrag"
                  onChange={(value) => {handleSelectColumnChange(value, index);}}
                  value={pair.key}
                  options={getAvailableItems(index).map(item => ({ label: item.label, value: item.value }))}
                  placeholder='Select ...'
                  {...(field.required ? { required: field.required } : {})}
                  {...(field.tooltip ? { tooltip: field.tooltip } : {})}
                  dropdownRender={(menu: any) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                          size={advanced ? "middle" : "small"}
                          placeholder="Custom"
                          ref={inputRef}
                          value={name}
                          onChange={onNameChange}
                          onKeyDown={(e: any) => e.stopPropagation()}
                        />
                        <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                          Add item
                        </Button>
                      </Space>
                    </>
                  )}
                />
              </ConfigProvider>
              <Select
                labelInValue
                size={advanced ? "middle" : "small"}
                id={`${field.id}_value_${index}`}
                className="nodrag"
                onChange={(value) => handleChangeKV(value, index, 'value')}
                value={pair.value}
                placeholder="Select ..."
                {...(field.required ? { required: field.required } : {})} 
                {...(field.tooltip ? { tooltip: field.tooltip } : {})}
                options={options.map(option => ({
                  label: option.label,
                  value: option.value
                }))}
                />
                <MinusCircleOutlined onClick={() => handleRemovePair(index)} />
              </Space>
            ))}
          </Form.Item>
          <Form.Item>
            <Button type="dashed" onClick={handleAddPair} block icon={<PlusOutlined />}>
              Add {field.elementName ? field.elementName : 'item'}
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default KeyValueColumnsSelect;