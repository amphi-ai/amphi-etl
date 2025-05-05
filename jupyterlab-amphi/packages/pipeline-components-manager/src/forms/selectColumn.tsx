import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';

import { ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import { AddNewColumn } from './AddNewColumn';
import { RequestService } from '../RequestService';
import { useMemo } from 'react';


interface SelectColumnsProps {
  field: FieldDescriptor;
  handleChange: (value: any, fieldId: string) => void;
  defaultValue: Option;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
  columnTypes?: string[];
}

const TYPE_GROUPS: Record<string, RegExp> = {
  numeric:  /^(u?int|float|complex|decimal)\d*$/i,
  datetime: /^(datetime|timedelta|period|datetimetz)/i,
  bool:     /^bool/i,
  string:   /^(object|string)$/i,
  category: /^category$/i,
};

export const SelectColumn: React.FC<SelectColumnsProps> = ({
  field, handleChange, defaultValue, context, componentService, commands, nodeId, advanced
}) => {

  let allowedTypes = field.allowedTypes ?? [];

  const matchers = useMemo(
    () => allowedTypes.map(k => TYPE_GROUPS[k]).filter(Boolean),
    [allowedTypes]
  );

  const matchesAllowedType = (t: string) =>
    !matchers.length || matchers.some(rx => rx.test(t));

  const byAllowedTypes = (opts: Option[]) => opts.filter(o => matchesAllowedType(o.type));

  const findOptionByValue = (value: any) => {
    if (value === undefined) {
      return undefined;
    }
    else {
      return items.find(option => option.value === value.value) || { value: value.value, label: value.value };
    }
  };

  const getTypeNamedByValue = (items: Option[], value: any): { type: string, named: boolean } | undefined => {
    const item = items.find(item => item.value === value);
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
  const [loadings, setLoadings] = useState<boolean>();
  const inputNb = field.inputNb ? field.inputNb - 1 : 0;

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name, type: 'object', named: true }]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSelectChange = (selection: any, option: any) => {
    const value = selection.value;
    const selectedOption = findOptionByValue(value);
    setSelectedOption(selectedOption);
    const { type, named } = getTypeNamedByValue(items, value);
    handleChange({ value, type, named }, field.id);
  }

  const customizeRenderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />

    </div>
  );

  const displayItems = byAllowedTypes(items);

  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <Select
        showSearch
        labelInValue
        size={advanced ? "middle" : "small"}
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
                onClick={(event) => RequestService.retrieveDataframeColumns(
                  event,
                  context,
                  commands,
                  componentService,
                  setItems,
                  setLoadings,
                  nodeId,
                  inputNb,
                  true
                )}
                loading={loadings}>
                Retrieve columns
              </Button>
            </Space>
            {advanced && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 8px 4px' }}>
                  <AddNewColumn items={items} setItems={setItems} setSelectedOption={setSelectedOption} />
                </Space>
              </>
            )}
          </>
        )}
        options={displayItems.map((item: Option) => ({ label: item.label, value: item.value, type: item.type, named: item.named }))}
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

export default React.memo(SelectColumn);