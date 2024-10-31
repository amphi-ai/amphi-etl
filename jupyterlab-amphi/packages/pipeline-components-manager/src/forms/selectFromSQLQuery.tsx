import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import { AddNewColumn } from './AddNewColumn';
import { RequestService } from '../RequestService';

interface SelectFromSQLQueryProps {
  data: any;
  field: FieldDescriptor;
  handleChange: (value: any, fieldId: string) => void;
  defaultValue: Option;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const SelectFromSQLQuery: React.FC<SelectFromSQLQueryProps> = ({
  data,
  field,
  handleChange,
  defaultValue,
  context,
  componentService,
  commands,
  nodeId,
  advanced,
}) => {
  const findOptionByValue = (value: any) => {
    if (value === undefined) {
      return {};
    } else {
      return items.find((option) => option.value === value.value) || { value: value.value, label: value.value };
    }
  };

  const getTypeNamedByValue = (items: Option[], value: any): { type: string; named: boolean } | undefined => {
    const item = items.find((item) => item.value === value);
    if (item) {
      return { type: item.type, named: item.named };
    }
    return undefined;
  };

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);

  const [items, setItems] = useState<Option[]>([]);
  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [selectedOption, setSelectedOption] = useState(findOptionByValue(defaultValue));
  const [loadings, setLoadings] = useState<boolean>(false);
  const inputNb = field.inputNb ? field.inputNb - 1 : 0;

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name, type: 'table', named: true }]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSelectChange = (selection: any, option: any) => {
    const value = selection.value;
    const selectedOption = findOptionByValue(value);
    setSelectedOption(selectedOption);
    const { type, named } = getTypeNamedByValue(items, value) || { type: '', named: false };
    handleChange({ value, type, named }, field.id);
  };

  const customizeRenderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </div>
  );

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <Select
        showSearch
        labelInValue
        size={advanced ? 'middle' : 'small'}
        style={{ width: '100%' }}
        className="nodrag"
        onChange={(value, option) => handleSelectChange(value, option)}
        value={selectedOption}
        placeholder={field.placeholder || 'Select ...'}
        {...(field.required ? { required: field.required } : {})}
        {...(field.tooltip ? { tooltip: field.tooltip } : {})}
        dropdownRender={(menu: any) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 2px 4px' }}>
              <Button
                type="primary"
                onClick={(event) =>
                  RequestService.retrieveTableList(
                    event,
                    `${data.schema ?? 'public'}`,
                    field.query,
                    context,
                    componentService,
                    setItems,
                    setLoadings,
                    nodeId
                  )
                }
                loading={loadings}
              >
                Retrieve
              </Button>
            </Space>
            {advanced && (
              <>
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
          </>
        )}
        options={items.map((item: Option) => ({
          label: item.label,
          value: item.value,
          type: item.type,
          named: item.named,
        }))}
        optionRender={(option) => (
          <Space>
            <span> {option.data.label}</span>
            <Tag>{option.data.type}</Tag>
          </Space>
        )}
      />
    </ConfigProvider>
  );
};

export default React.memo(SelectFromSQLQuery);
