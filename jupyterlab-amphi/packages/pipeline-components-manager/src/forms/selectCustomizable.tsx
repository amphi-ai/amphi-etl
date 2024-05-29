import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Divider, Input, Select, Space, Button } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';


interface SelectCustomizableProps {
    field: FieldDescriptor;
    handleChange: (values: any, fieldId: string) => void;
    defaultValue: Option | Option[];
    inDialog: boolean;
  }

export const SelectCustomizable: React.FC<SelectCustomizableProps> = ({
  field, handleChange, defaultValue, inDialog
}) => {
    
  const findOptionByValue = (value: any) => {
    return field.options.find(option => option.value === value) || { value: value, label: value };
  };

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);

  const [items, setItems] = useState(field.options);
  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [selectedOption, setSelectedOption] = useState(findOptionByValue(defaultValue));

  let index = 0;

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name}]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSelectChange = (option: { value: string; label: React.ReactNode }) => {
    setSelectedOption(option);
    handleChange(option?.value, field.id);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };


  return (
    <Select
    labelInValue
    size={inDialog ? "middle" : "small"}
    style={{ width: '100%' }}
    className="nodrag"
    onChange={handleSelectChange}
    value={selectedOption}
    placeholder={field.placeholder || 'Select ...'}
    {...(field.required ? { required: field.required } : {})} 
    {...(field.tooltip ? { tooltip: field.tooltip } : {})}
    dropdownRender={(menu: any) => (
      <>
        {menu}
        <Divider style={{ margin: '8px 0' }} />
        <Space style={{ padding: '0 8px 4px' }}>
          <Input
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
    options={items.map((item: Option) => ({ label: item.label, value: item.value }))}
  />
  );
};

export default SelectCustomizable;