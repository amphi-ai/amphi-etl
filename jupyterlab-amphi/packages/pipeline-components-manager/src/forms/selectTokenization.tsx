import React, { useState, useEffect, useRef } from 'react';
import { SmileOutlined, PlusOutlined } from '@ant-design/icons';
import { Divider, Input, Select, Button, ConfigProvider } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';

  interface SelectTokenizationProps {
    field: FieldDescriptor;
    handleChange: (values: string[], fieldId: string) => void;
    defaultValue: Option[];
    advanced: boolean;
  }
  
  export const SelectTokenization: React.FC<SelectTokenizationProps> = ({
    field, handleChange, defaultValue, advanced
  }) => {
    // Assuming defaultValues are already in the correct format
    useEffect(() => {
      setSelectedOptions(defaultValue);
    }, [defaultValue]);
  
    const [items, setItems] = useState(field.options);
    const [selectedOptions, setSelectedOptions] = useState(defaultValue);
  
    const handleSelectChange = (selectedItems: Option[]) => {
      setSelectedOptions(selectedItems);
      handleChange(selectedItems.map(item => item.value), field.id);
    };

    const customizeRenderEmpty = () => (
      <span style={{ display: 'none' }}>
      </span>
    );
  
    return (
      <ConfigProvider renderEmpty={customizeRenderEmpty}>
        <Select
          mode="tags"
          labelInValue
          size={advanced ? "middle" : "small"}
          style={{ width: '100%' }}
          className="nodrag"
          onChange={handleSelectChange}
          value={selectedOptions}
          tokenSeparators={[',']}
          placeholder={field.placeholder || 'Select ...'}
          {...(field.required ? { required: field.required } : {})}
          {...(field.tooltip ? { tooltip: field.tooltip } : {})}
          options={items.map(item => ({
            label: item.label,
            value: item.value
          }))}
        />
      </ConfigProvider>
    );
  };

export default SelectTokenization;