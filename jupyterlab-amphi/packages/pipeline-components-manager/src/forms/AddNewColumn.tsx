import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip, Input, Cascader, Space, Button, Row, Col } from 'antd';
import type { InputRef } from 'antd';

interface AddNewColumnProps {
  items: any;
  setItems: any;
  setSelectedOption: any;
}

export const AddNewColumn: React.FC<AddNewColumnProps> = ({
  items, setItems, setSelectedOption
}) => {

  const [name, setName] = useState('');
  const [type, setType] = useState('string');

  const inputRef = useRef<InputRef>(null);

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>): void => {
    e.preventDefault();
    setItems([...items, { value: name, label: name, type: type, named: true }]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onTypeChange = (value: any) => {
    setType(value);
  };

  const optionRenderItems = (option: any) => (
    <Space>
      <span>{option.label}</span>
      {option.tooltip && (
        <Tooltip title={option.tooltip}>
          <QuestionCircleOutlined />
        </Tooltip>
      )}
    </Space>
  );

  interface typeOptions {
    value: string;
    label: string;
    tooltip?: string;
    disabled?: boolean;
    children?: typeOptions[];
  }

  const typesOptions: typeOptions[] = [
    {
      value: "numeric",
      label: "Numeric",
      children: [
        {
          value: "int",
          label: "Integer",
          children: [
            { value: "int64", label: "int64", tooltip: "Standard integer type." },
            { value: "int32", label: "int32", tooltip: "For optimized memory usage." },
            { value: "int16", label: "int16", tooltip: "For more optimized memory usage." },
            { value: "int8", label: "int8", tooltip: "For more optimized memory usage." },
            { value: "uint64", label: "uint64", tooltip: "Unsigned integer (can only hold non-negative values)" },
            { value: "uint32", label: "uint32", tooltip: "For more optimized memory usage." },
            { value: "uint16", label: "uint16", tooltip: "For more optimized memory usage." },
            { value: "uint8", label: "uint8", tooltip: "For more optimized memory usage." }
          ]
        },
        {
          value: "float",
          label: "Float",
          children: [
            { value: "float64", label: "float64", tooltip: "Standard floating-point type." },
            { value: "float32", label: "float32", tooltip: "For optimized memory usage." },
            { value: "float16", label: "float16", tooltip: "For more optimized memory usage." }
          ]
        }
      ]
    },
    {
      value: "text",
      label: "Text",
      children: [
        { value: "string", label: "string", tooltip: "For string data. (recommended)" },
        { value: "object", label: "object", tooltip: "For generic objects (strings, timestamps, mixed types)." },
        { value: "category", label: "category", tooltip: "For categorical variables." }
      ]
    },
    {
      value: "datetime",
      label: "Date & Time",
      children: [
        { value: "datetime64[ns]", label: "datetime64[ns]", tooltip: "For datetime values." },
        { value: "datetime64[ms]", label: "datetime64[ms]", tooltip: "For datetime values in milliseconds." },
        { value: "datetime64[s]", label: "datetime64[s]", tooltip: "For datetime values in seconds." },
        { value: "datetime32[ns]", label: "datetime32[ns]", tooltip: "For compact datetime storage in nanoseconds." },
        { value: "datetime32[ms]", label: "datetime32[ms]", tooltip: "For compact datetime storage in milliseconds." },
        { value: "timedelta[ns]", label: "timedelta[ns]", tooltip: "For differences between two datetimes." }
      ]
    },
    {
      value: "boolean",
      label: "Boolean",
      children: [
        { value: "bool", label: "bool", tooltip: "For boolean values (True or False)." }
      ]
    }
  ];
  

  return (
    <Space style={{ padding: '0 4px 4px' }}>
      <Row gutter={8}>
        <Col span={12}>
          <Input
            placeholder="New column"
            ref={inputRef}
            value={name}
            onChange={onNameChange}
            onKeyDown={(e: any) => e.stopPropagation()}
          />
        </Col>
        <Col span={10}>
          <Cascader
            autoFocus
            style={{ width: '100%' }} // Set a fixed width
            allowClear={false}
            options={typesOptions}
            defaultValue={['text', 'string']}
            placement={'topLeft'}
            displayRender={(labels: string[]) => labels[labels.length - 1]}
            onChange={onTypeChange}
            optionRender={optionRenderItems}
            getPopupContainer={triggerNode => {
              // Find the closest parent dropdown element
              let parentElement = triggerNode.parentElement;
              while (parentElement && !parentElement.classList.contains('ant-dropdown')) {
                parentElement = parentElement.parentElement;
              }
              // Return the first dropdown's parent container or default to the current triggerNode's parent
              return parentElement || triggerNode.parentNode;
            }}
          />
        </Col>
        <Col span={2}>
          <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
            Add
          </Button>
        </Col>
      </Row>
    </Space>
  );
};

export default AddNewColumn;
