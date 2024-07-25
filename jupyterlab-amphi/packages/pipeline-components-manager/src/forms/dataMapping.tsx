import React, { useContext, useEffect, useRef, useState } from 'react';
import type { GetRef, InputRef } from 'antd';
import {  Form, Table, ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty, Popconfirm } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { RequestService } from '../RequestService';
import { FieldDescriptor, Option } from '../configUtils';

interface DataMappingProps {
  data: any;
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValue: any;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const DataMapping: React.FC<DataMappingProps> = ({
  data, field, handleChange, defaultValue, context, componentService, commands, nodeId, advanced
}) => {

  type FormInstance<T> = GetRef<typeof Form<T>>;
  const EditableContext = React.createContext<FormInstance<any> | null>(null);
  const [loadingsInput, setLoadingsInput] = useState<boolean>();
  const [loadingsOutput, setLoadingsOutput] = useState<boolean>();
  const [items, setItems] = useState<Option[]>([]);

  interface Item {
    input: any;
    key: React.Key;
    value: string;
    type: string;
  }
  
  interface EditableRowProps {
    index: number;
  }
  
  const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
    const [form] = Form.useForm();
    return (
      <Form form={form} component={false}>
        <EditableContext.Provider value={form}>
          <tr {...props} />
        </EditableContext.Provider>
      </Form>
    );
  };
  
  interface EditableCellProps {
    title: React.ReactNode;
    editable: boolean;
    children: React.ReactNode;
    dataIndex: keyof Item;
    record: Item;
    handleSave: (record: Item) => void;
  }
  
  const EditableCell: React.FC<EditableCellProps> = ({
    title,
    editable,
    children,
    dataIndex,
    record,
    handleSave,
    ...restProps
  }) => {
    const form = useContext(EditableContext)!;
    const [editing, setEditing] = useState(true);

    const handleSelectChange = (selection: any, record: Item) => {
      const value = selection.value;
      const input = items.find(item => item.value === value); // Finds the item where value matches
      record.input = input; // Assigns the found item to record.input
      handleSave(record); // Save the updated record
    };
  
    let childNode = children;

    if (editable) {
      childNode =
        <Form.Item
          style={{ margin: 0 }}
          name={dataIndex}
          rules={[
            {
              required: true,
              message: `${title} is required.`,
            },
          ]}
        >
          <ConfigProvider renderEmpty={customizeRenderEmpty}>
            <Select              
              showSearch 
              labelInValue
              size={advanced ? "middle" : "small"}
              style={{ width: '100%' }}
              className="nodrag"
              onChange={(value) => {handleSelectChange(value, record); }}
              value={record.input?.value ?? ""}  
              placeholder='Select column ...'
              {...(field.required ? { required: field.required } : {})}
              {...(field.tooltip ? { tooltip: field.tooltip } : {})}
              dropdownRender={(menu: any) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 2px 2px' }}>
                    <Button 
                    type="primary" 
                    onClick={(event) => {
                      RequestService.retrieveDataframeColumns(
                        event,
                        context,
                        commands,
                        componentService,
                        setItems,
                        setLoadingsInput,
                        nodeId,
                        0,
                        true
                      );
                    }}
                    loading={loadingsInput}>
                      Retrieve columns
                  </Button>
                </Space>
                </>
              )}
              options={items.map((item: Option) => ({ label: item.label, value: item.value, type: item.type, named: item.named }))}
              optionRender={(option) => (
                <Space>
                  <span> {option.data.label}</span>
                  <Tag>{option.data.type}</Tag>
                </Space>
              )}
            />
          </ConfigProvider>
        </Form.Item>
  }
  
    return <td {...restProps}>{childNode}</td>;
  };
  
  type EditableTableProps = Parameters<typeof Table>[0];
  
  interface DataType {
    input: any;
    key: React.Key;
    value: string;
    type: string;
  }
  
  type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;
  
  const [dataSource, setDataSource] = useState<DataType[]>(defaultValue || []);
  

    useEffect(() => {
      handleChange(dataSource, field.id);
    }, [dataSource]);

    const customizeRenderEmpty = () => (
      <div style={{ textAlign: 'center' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
      {
        title: 'Input Columns',
        dataIndex: 'input',
        width: '50%',
        editable: true,
      },
      {
        title: 'Output Schema',
        dataIndex: 'value',
        width: '50%',
        editable: false,
        render: (_, record) => (
          <>
          <Space>
          <span>{record.value}</span>
            <Tag>{record.type}</Tag>
          </Space>
          </>
        )
      },
      {
        title: '',
        dataIndex: 'operation',
        render: (_, record) =>
          dataSource.length >= 1 ? (
            <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
              <DeleteOutlined />
            </Popconfirm>
          ) : null,
      }
    ];

    const [form] = Form.useForm(); // Step 1: Create form instance

    const handleAdd = () => {
      const values = form.getFieldsValue(); // Step 2: Get values from the form
      console.log(values); // Do something with the form data
      console.log('Received values from form: ', values);
      const newData: DataType = {
        input: {},
        key: values.field.name,
        value: values.field.name,
        type: values.field.type
      };
      setDataSource([...dataSource, newData]);
    };

    const handleSave = (row: DataType) => {
      const newData = [...dataSource];
      const index = newData.findIndex((item) => row.key === item.key);
      const item = newData[index];
      newData.splice(index, 1, {
        ...item,
        ...row,
      });
      setDataSource(newData);
    };

    const handleDelete = (key: React.Key) => {
      const newData = dataSource.filter((item) => item.key !== key);
      setDataSource(newData);
    };
  
    const components = {
      body: {
        row: EditableRow,
        cell: EditableCell,
      },
    };
  
    const columns = defaultColumns.map((col) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record: DataType) => ({
          record,
          editable: col.editable,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave,
        }),
      };
    });


  return (
    <>
    <div>
      {field.outputType === 'relationalDatabase' ? (
          <Button
            type="primary"
            size="small"
            style={{ marginBottom: 16 }}
            onClick={(event) => {
              setDataSource([]);
              RequestService.retrieveTableColumns(
                event,
                field.imports,
                `${field.drivers}://${data.username}:${data.password}@${data.host}:${data.port}/${data.databaseName}`,
                `${data.schema ?? 'public'}`,
                `${data.tableName}`,
                `${field.query}`,
                context,
                commands,
                componentService,
                setDataSource,
                setLoadingsOutput,
                nodeId
              );
            }}
            loading={loadingsOutput}
          >
            Retrieve schema
          </Button>
        ) : null}
      <Table
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns as ColumnTypes}
      />
        <Form style={{ marginTop: 16 }}
          name="Add field row"
          layout="inline"
          form={form}
        >
       <Form.Item name="field">
        <FieldValueInput field={field} />
        </Form.Item>
        <Form.Item>
          <Button onClick={handleAdd}>
            Add a field
          </Button>
        </Form.Item>
      </Form>
    </div>
    </>
  );

};


interface FieldValue {
  name?: string;
  type?: string;
}

interface FieldValueProps {
  field: FieldDescriptor;
  value?: FieldValue;
  onChange?: (value: FieldValue) => void;
}

const FieldValueInput: React.FC<FieldValueProps> = ({ field, value = {}, onChange }) => {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [nameType, setNameType] = useState('');
  const inputRef = useRef<InputRef>(null);
  const [items, setItems] = useState(field.typeOptions);

  const triggerChange = (changedValue: { name?: string; type?: string }) => {
    onChange?.({ name, type, ...value, ...changedValue });
  };

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value || '';
    setName(newName);
    triggerChange({ name: newName });
  };

  const onTypeChange = (newType: string) => {
    setType(newType);
    triggerChange({ type: newType });
  };

  const onNameTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameType(event.target.value);
  };

  const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setItems([...items, { value: name, label: name}]);
    setName('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };


  return (
    <span>
      <Input
        type="text"
        value={name}
        placeholder='Field name'
        onChange={onNameChange}
        style={{ width: 150 }}
      />
        <Select
      value={type}
      style={{ width: 220, margin: '0 8px' }}
      className="nodrag"
      onChange={onTypeChange}
      dropdownRender={(menu: any) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px' }}>
            <Input
              placeholder="Custom"
              ref={inputRef}
              value={nameType}
              onChange={onNameTypeChange}
              onKeyDown={(e: any) => e.stopPropagation()}
            />
            <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
              Add type
            </Button>
          </Space>
        </>
      )}
      options={items.map((item: Option) => ({ label: item.value, value: item.value }))}
      />
    </span>
  );
};

export default DataMapping;