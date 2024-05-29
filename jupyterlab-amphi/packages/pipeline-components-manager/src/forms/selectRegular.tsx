import React, { useState, useEffect, useRef } from 'react';
import { Select } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';


interface SelectCustomizableProps {
    field: FieldDescriptor;
    handleChange: (values: any, fieldId: string) => void;
    defaultValue: Option | Option[];
    inDialog: boolean;
  }

export const SelectRegular: React.FC<SelectCustomizableProps> = ({
  field, handleChange, defaultValue, inDialog
}) => {
    
  const findOptionByValue = (value: any) => {
    return field.options.find(option => option.value === value) || { value: value, label: value };
  };

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);

  const [items, setItems] = useState(field.options);
  const [selectedOption, setSelectedOption] = useState(findOptionByValue(defaultValue));

  const handleSelectChange = (option: { value: string; label: React.ReactNode }) => {
    setSelectedOption(option);
    handleChange(option?.value, field.id);
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
    options={items.map(item => ({
      label: item.label,
      value: item.value
    }))}  />
  );
};

export default SelectRegular;