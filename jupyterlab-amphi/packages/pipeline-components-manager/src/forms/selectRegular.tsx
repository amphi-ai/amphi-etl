import React, { useState, useEffect, useRef } from 'react';
import { Select, Space, Tag, Tooltip } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import { QuestionCircleOutlined } from '@ant-design/icons';


interface SelectCustomizableProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValue: Option | Option[];
  advanced: boolean;
}

export const SelectRegular: React.FC<SelectCustomizableProps> = ({
  field, handleChange, defaultValue, advanced
}) => {

  const findOptionByValue = (value: any) => {
    return field.options.find(option => option.value === value) || { value: value, label: value };
  };

  const [items, setItems] = useState(field.options);
  const [selectedOption, setSelectedOption] = useState(
    defaultValue ? findOptionByValue(defaultValue) : undefined
  );

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);



  const handleSelectChange = (option: { value: string; label: React.ReactNode }) => {
    setSelectedOption(option);
    handleChange(option?.value, field.id);
  };

  const optionRenderItems = (option: any) => (
    <Space>
      <span>{option.data.label}</span>
      {option.data.tooltip && (
        <Tooltip title={option.data.tooltip}>
          <QuestionCircleOutlined />
        </Tooltip>
      )}
    </Space>
  );

  return (
    <Select
      labelInValue
      size={advanced ? "middle" : "small"}
      style={{ width: '100%' }}
      className="nodrag"
      onChange={handleSelectChange}
      value={selectedOption || null}
      placeholder={field.placeholder || 'Select ...'}
      {...(field.required ? { required: field.required } : {})}
      {...(field.tooltip ? { tooltip: field.tooltip } : {})}
      options={items.map(item => ({
        label: item.label,
        value: item.value,
        tooltip: item.tooltip
      }))}
      optionRender={optionRenderItems}
    />
  );
};

export default SelectRegular;