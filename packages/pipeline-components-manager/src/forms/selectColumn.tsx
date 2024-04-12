import React, { useState, useEffect, useRef } from 'react';
import { SmileOutlined, PlusOutlined } from '@ant-design/icons';
import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { KernelMessage } from '@jupyterlab/services';

import { ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';


interface SelectColumnsProps {
    field: FieldDescriptor;
    handleChange: (values: any, fieldId: string) => void;
    defaultValue: Option | Option[];
    context: any;
    componentService: any;
    commands: any;
    nodeId: string;
    inDialog: boolean;
  }

export const SelectColumn: React.FC<SelectColumnsProps> = ({
  field, handleChange, defaultValue, context, componentService, commands, nodeId, inDialog
}) => {
    
  const initialOptions = field.options || [];
  
  const findOptionByValue = (value: any) => {
    return initialOptions.find(option => option.value === value) || { value: value, label: value };
  };

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);

  const [items, setItems] = useState<Option[]>(initialOptions);
  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [selectedOption, setSelectedOption] = useState(findOptionByValue(defaultValue));
  const [loadings, setLoadings] = useState<boolean>();
  const inputNb = field.inputNb ? field.inputNb - 1 : 0;

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name }]);
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

  const customizeRenderEmpty = () => (
    <div style={{ textAlign: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
      <Button type="primary" onClick={retrieveColumns} loading={loadings}>Retrieve columns</Button>
    </div>
  );

  const retrieveColumns = (event: React.MouseEvent<HTMLElement>) => {
    setLoadings(true);
    const flow = PipelineService.filterPipeline(context.model.toString());
    let code = CodeGenerator.generateCodeUntil(context.model.toString(), commands, componentService, PipelineService.findMultiplePreviousNodeIds(flow, nodeId)[inputNb]);
    const lines = code.split('\n');
    const output_df = lines.pop(); // Extract the last line and store it in output_df
    code = lines.join('\n'); // Rejoin the remaining lines back into code
    const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

    future.onReply = reply => {
      if (reply.content.status == "ok") {
        const future2 = context.sessionContext.session.kernel!.requestExecute({ code: "print(_amphi_metadatapanel_getcontentof(" + output_df + "))"});
        future2.onIOPub = msg => {
          if (msg.header.msg_type === 'stream') {
            const streamMsg = msg as KernelMessage.IStreamMsg;
            const output = streamMsg.content.text;
            // Split the output string into fields and then map each field to an object
            const newItems = output.split(', ').map(field => {
              const [name, type] = field.split(' (');
              const trimmedType = type.slice(0, -1); // Removes the closing parenthesis
              return { value: name, label: `${name}`, type: trimmedType };
            });

            // Update the items array with the new items
            setItems(items => [...items, ...newItems]);
          } else if (msg.header.msg_type === 'error') {
            const errorMsg = msg as KernelMessage.IErrorMsg; 
            const errorOutput = errorMsg.content; 
            console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
          }
        };
      } else if (reply.content.status == "error") {
        setLoadings(false)
      } else if (reply.content.status == "abort") {
        setLoadings(false)
      } else {
        setLoadings(false)
      }
    };

  };


  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
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

export default SelectColumn;