import React, { useState, useEffect, useRef } from 'react';
import { SmileOutlined, PlusOutlined } from '@ant-design/icons';
import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { KernelMessage } from '@jupyterlab/services';
import { RequestService } from '../RequestService';
import { AddNewColumn } from './AddNewColumn'
import { ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';


interface SelectColumnsProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValues: Option[];
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const SelectColumns: React.FC<SelectColumnsProps> = ({
  field, handleChange, defaultValues, context, componentService, commands, nodeId, advanced
}) => {

  const [items, setItems] = useState(field.options || []);
  const [selectedOptions, setSelectedOptions] = useState(defaultValues);
  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [loadings, setLoadings] = useState<boolean>();
  const inputNb = field.inputNb ? field.inputNb - 1 : 0;

  const getTypeNamedByValue = (items: Option[], value: any): { type: string, named: boolean } | undefined => {
    const item = items.find(item => item.value === value);
    if (item) {
      return { type: item.type, named: item.named };
    }
    return undefined;
  };

  useEffect(() => {
    setSelectedOptions(defaultValues);
  }, [defaultValues]);

  const handleSelectChange = (selectedItems: Option[]) => {
    setSelectedOptions(selectedItems);
    const options = selectedItems.map(item => ({
      ...getTypeNamedByValue(items, item.value),
      value: item.value
    }));
    handleChange(options, field.id);
  };

  const customizeRenderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </div>
  );

  const retrieveColumns = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    RequestService.retrieveDataframeColumns(
      event,
      context,
      commands,
      componentService,
      setItems,
      setLoadings,
      nodeId,
      inputNb,
      true
    );
  };


  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <Select
        showSearch
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
            <Space style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 2px 2px' }}>
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
                  <AddNewColumn items={items} setItems={setItems} setSelectedOption={setSelectedOptions} />
                </Space>
              </>
            )}
          </>
        )}
        options={items.map((item: Option) => ({ label: item.label, value: item.value, type: item.type }))}
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

export default React.memo(SelectColumns);