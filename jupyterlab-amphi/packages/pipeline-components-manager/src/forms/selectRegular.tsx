import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Select, Space, Tooltip, Divider, Button } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import { QuestionCircleOutlined, CloseOutlined } from '@ant-design/icons';


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
    if (!value) return undefined; // Fix: return undefined instead of an object
    return field.options.find(option => option.value === value) || { value, label: value };
  };

  const [items, setItems] = useState(field.options);
  const [selectedOption, setSelectedOption] = useState(
    defaultValue ? findOptionByValue(defaultValue) : undefined
  );

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);

  // If "field.selectionRemovable" is true, remove selection on button click
  const handleRemoveSelection = useCallback(() => {
    setSelectedOption(undefined);
    handleChange('', field.id);
  }, [handleChange, field.id]);

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
      // Conditionally render a "Remove Selection" button in the dropdown footer
      dropdownRender={(menu) =>
        field.selectionRemovable ? (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ padding: '0 4px 4px' }}>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleRemoveSelection}
              >
                Remove Selection
              </Button>
            </Space>
          </>
        ) : (
          menu
        )
      }
    />
  );
};

export default React.memo(SelectRegular);