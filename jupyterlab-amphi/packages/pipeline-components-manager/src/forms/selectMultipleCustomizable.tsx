import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Divider, Input, Select, Space, Button } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';


interface SelectMultipleCustomizableProps {
    field: FieldDescriptor;
    handleChange: (values: any, fieldId: string) => void;
    defaultValues: Option[];
    advanced: boolean;
  }

export const SelectMultipleCustomizable: React.FC<SelectMultipleCustomizableProps> = ({
  field, handleChange, defaultValues, advanced
}) => {
    
  useEffect(() => {
    setSelectedOptions(defaultValues);
  }, [defaultValues]);

  const [items, setItems] = useState(field.options);
  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [selectedOptions, setSelectedOptions] = useState(defaultValues);

  let index = 0;

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name}]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSelectChange = (selectedItems: Option[]) => {
    setSelectedOptions(selectedItems);
    handleChange(selectedItems.map(item => item.value), field.id);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };


  return (
    <Select
    mode="multiple"
    labelInValue
    size={advanced ? "middle" : "small"}
    style={{ width: '100%' }}
    className="nodrag"
    onChange={handleSelectChange}
    value={selectedOptions}
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
            Add
          </Button>
        </Space>
      </>
    )}
    options={items.map((item: Option) => ({ label: item.label, value: item.value }))}
  />
  );
};

export default SelectMultipleCustomizable;