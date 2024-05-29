import React, { useContext, useEffect, useState, useRef } from 'react';
import { ConfigProvider, Button, Form, Input, Radio, Flex, Cascader, Space, Switch, InputNumber, Modal, Table, Popconfirm } from 'antd';
import type { GetRef, InputRef } from 'antd';


const [modal2Open, setModal2Open] = useState(false);

export default function ConnectionsTable({
  context,
  manager,
  commands,
}: ConfigModalProps) {

  type FormInstance<T> = GetRef<typeof Form<T>>;

  const EditableContext = React.createContext<FormInstance<any> | null>(null);
  
  interface Item {
    key: string;
    name: string;
    age: string;
    address: string;
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
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<InputRef>(null);
    const form = useContext(EditableContext)!;
  
    useEffect(() => {
      if (editing) {
        inputRef.current?.focus();
      }
    }, [editing]);
  
    const toggleEdit = () => {
      setEditing(!editing);
      form.setFieldsValue({ [dataIndex]: record[dataIndex] });
    };
  
    const save = async () => {
      try {
        const values = await form.validateFields();
  
        toggleEdit();
        handleSave({ ...record, ...values });
      } catch (errInfo) {
        console.log('Save failed:', errInfo);
      }
    };
  
    let childNode = children;
  
    if (editable) {
      childNode = editing ? (
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
          <Input ref={inputRef} onPressEnter={save} onBlur={save} />
        </Form.Item>
      ) : (
        <div className="editable-cell-value-wrap" style={{ paddingRight: 24 }} onClick={toggleEdit}>
          {children}
        </div>
      );
    }
  
    return <td {...restProps}>{childNode}</td>;
  };
  
  type EditableTableProps = Parameters<typeof Table>[0];
  
  interface DataType {
    key: React.Key;
    name: string;
    age: string;
    address: string;
  }
  
  type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;
  
  const App: React.FC = () => {
    const [dataSource, setDataSource] = useState<DataType[]>([
      {
        key: '0',
        name: 'Edward King 0',
        age: '32',
        address: 'London, Park Lane no. 0',
      },
      {
        key: '1',
        name: 'Edward King 1',
        age: '32',
        address: 'London, Park Lane no. 1',
      },
    ]);
  
    const [count, setCount] = useState(2);
  
    const handleDelete = (key: React.Key) => {
      const newData = dataSource.filter((item) => item.key !== key);
      setDataSource(newData);
    };
  
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
      {
        title: 'name',
        dataIndex: 'name',
        width: '30%',
        editable: true,
      },
      {
        title: 'age',
        dataIndex: 'age',
      },
      {
        title: 'address',
        dataIndex: 'address',
      },
      {
        title: 'operation',
        dataIndex: 'operation',
        render: (_, record) =>
          dataSource.length >= 1 ? (
            <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
              <a>Delete</a>
            </Popconfirm>
          ) : null,
      },
    ];
  
    const handleAdd = () => {
      const newData: DataType = {
        key: count,
        name: `Edward King ${count}`,
        age: '32',
        address: `London, Park Lane no. ${count}`,
      };
      setDataSource([...dataSource, newData]);
      setCount(count + 1);
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
      <Modal
        title="test"
        centered
        open={modal2Open}
        onOk={() => setModal2Open(false)}
        onCancel={() => setModal2Open(false)}
        width={800}
        footer={(_, { OkBtn }) => (
          <>
          <OkBtn />
          </>
        )}
      >
        <div>
          <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
            Add a row
          </Button>
          <Table
            components={components}
            rowClassName={() => 'editable-row'}
            bordered
            dataSource={dataSource}
            columns={columns as ColumnTypes}
          />
        </div>
      </Modal>
    </>
  )
}
}

// Define interfaces for the parameters used in the functions

interface StoreApi {
  getState: () => { nodeInternals: Map<string, any> };
  // ... other necessary methods and properties
}

// Props for setDefaultConfig function
export interface SetDefaultConfigProps {
  nodeId: string;
  store: StoreApi;
  setNodes: any;
  defaultConfig: any; // Define the type of your default config
}

// Props for onChange function
export interface OnChangeProps {
  evtTargetValue: any; // Modify as needed for different event types
  field: string;
  nodeId: string;
  store: StoreApi;
  setNodes: any;
}

interface FormComponentProps {
  nodeId: string;
  type: string;
  name: string;
  form: any;
  data: any;
  context: any;
  componentService: any;
  manager: any;
  commands: any;
  // handleChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLDataListElement>, fieldId: string) => void;
  handleChange: any;
}

interface UIInputsProps {
  name: string;
  nodeId: string;
  form: any;
  data: any;
  context: any;
  componentService: any;
  manager: any;
  commands: any;
  // handleChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLDataListElement>, fieldId: string) => void;
  handleChange: any;
  advanced: boolean;
}

export interface Option {
  key?: string;
  value: string;
  label: string | React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  type?: string;
  named?: boolean;
}

export interface FieldDescriptor {
  type: 'file' | 'column' | 'columns' | 'keyvalue' | 'valuesList' | 'input' | 'select' | 'textarea' | 'radio' | 'cascader' | 'boolean' | 'inputNumber' | 'selectCustomizable' | 'selectTokenization' | 'transferData' | 'keyvalueColumns' | 'keyvalueColumnsSelect' | 'dataMapping';
  label: string;
  id: string;
  placeholder?: any;
  tooltip?: string;
  required?: boolean;
  options?: Option[];
  advanced?: boolean;
  validation?: string;
  validationMessage?: string;
  elementName?: string;
  inputNb?: number;
  min?: number;
  max?: number;
  rows?: number;
  outputType?: string;
  drivers?: string;
}

interface ConfigModalProps {
  context: any;
  manager: any
  commands: any;
}
