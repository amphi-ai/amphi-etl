import React, { useState, useEffect, useRef } from 'react';
import { Select } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';


interface SelectMultipleProps {
  field: FieldDescriptor;
  handleChange: (values: string[], fieldId: string) => void;
  defaultValues: Option[];
  advanced: boolean;
}

export const SelectMultiple: React.FC<SelectMultipleProps> = ({
  field, handleChange, defaultValues, advanced
}) => {
  // Assuming defaultValues are already in the correct format
  useEffect(() => {
    setSelectedOptions(defaultValues);
  }, [defaultValues]);

  const [items, setItems] = useState(field.options);
  const [selectedOptions, setSelectedOptions] = useState(defaultValues);

  const handleSelectChange = (selectedItems: Option[]) => {
    setSelectedOptions(selectedItems);
    handleChange(selectedItems.map(item => item.value), field.id);
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
      options={items.map(item => ({
        label: item.label,
        value: item.value
      }))}    />
  );
};

export default SelectMultiple;