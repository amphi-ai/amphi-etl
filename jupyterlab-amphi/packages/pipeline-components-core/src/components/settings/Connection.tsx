import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector, PipelineService } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import { Form, Table, ConfigProvider, Divider, Input, Select, Space, Button, Typography, Modal, Popconfirm, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { keyIcon, settingsIcon } from '../../icons';

export class Connection extends PipelineComponent<ComponentItem>() {
  public _name = "Connection";
  public _id = "connection";
  public _type = "connection";
  public _category = "settings";
  public _icon = keyIcon;
  public _default = {};
  public _form = {};

  public static ConfigForm = ({
    nodeId,
    data,
    context,
    componentService,
    manager,
    commands,
    store,
    setNodes,
    handleChange
  }) => {
    type FormInstance<T> = GetRef<typeof Form<T>>;

    const EditableContext = React.createContext<FormInstance<any> | null>(null);

    interface Item {
      key: string;
      name: string;
      value: string;
      default: string;
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
      required: boolean;
    }

    const EditableCell: React.FC<EditableCellProps> = ({
      title,
      editable,
      children,
      dataIndex,
      record,
      handleSave,
      required,
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
          console.error('Save failed:', errInfo);
        }
      };

      let childNode = children;

      if (editable) {
        childNode = editing ? (
          <Form.Item
            style={{ margin: 0 }}
            name={dataIndex}
            rules={required ? [
              {
                required: true,
                message: `${title} is required.`,
              },
            ] : []}
          >
            <Input ref={inputRef} onPressEnter={save} onBlur={save} onKeyDown={(e) => e.stopPropagation()} autoComplete="off" />
          </Form.Item>
        ) : (
          <div
            className="editable-cell-value-wrap"
            style={{ paddingRight: 24, minHeight: '20px', width: '100%', display: 'inline-block' }}
            onClick={() => toggleEdit()}
          >
            {children}
          </div>
        );
      }

      return (
        <td {...restProps}>
          <div onDoubleClick={(e) => e.stopPropagation()}>
            {childNode}
          </div>
        </td>
      );
    };

    type EditableTableProps = Parameters<typeof Table>[0];

    interface DataType {
      key: React.Key;
      name: string;
      value: string;
      default: string;
    }

    type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;

    const [dataSource, setDataSource] = useState<DataType[]>(data.variables || []);
    const [connections, setConnections] = useState<{ label: string, value: string, fields: { id: string, label: string }[] }[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<{ label: string, value: string } | undefined>(
      data.connection ? { label: data.connection.label, value: data.connection.value } : undefined
    );    // const [connectionFields, setConnectionFields] = useState<DataType[]>([]);

    useEffect(() => {
      handleChange(dataSource, "variables");
    }, [dataSource]);

    const handleDelete = (key: React.Key) => {
      const newData = dataSource.filter((item) => item.key !== key);
      setDataSource(newData);
    };

    const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string, required?: boolean })[] = [
      {
        title: 'Name',
        dataIndex: 'name',
        width: '30%',
        editable: true,
        required: true
      },
      {
        title: 'Value',
        dataIndex: 'value',
        width: '40%',
        editable: true,
        required: false
      },
      {
        title: 'Default',
        dataIndex: 'default',
        width: '30%',
        editable: true,
        required: false
      }
      /*
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
      */
    ];

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
          required: col.required,
          handleSave,
        }),
      };
    });

    const handleSelectChange = (value: { value: string; label: string }) => {
      setSelectedConnection(value);
      const selectedConnectionFields = connections.find(conn => conn.value === value.value)?.fields || [];
      setDataSource(selectedConnectionFields.map(field => ({
        key: field.id,
        name: field.label,
        value: '',
        default: '',
      })));
      handleChange(value.value, "connection") // Update connection type
      if (!data.componentTitle) {
        // Update title if not already changed
        handleChange(value.value + " Connection", "customTitle")
      }
    };

    useEffect(() => {
      const extractedConnections = extractConnections(componentService);
      setConnections(extractedConnections.map(conn => ({
        label: conn.connection,
        value: conn.connection,
        fields: conn.fields
      })));
    }, [componentService]);

    const extractConnections = (componentService: any) => {
      const components = componentService.getComponents();
      const connectionMap: { [key: string]: { id: string, label: string }[] } = {};

      components.forEach(component => {
        if (component._form && component._form.fields) {
          component._form.fields.forEach(field => {
            if (field.connection) {
              if (!connectionMap[field.connection]) {
                connectionMap[field.connection] = [];
              }
              const existingField = connectionMap[field.connection].find(f => f.id === field.id);
              if (!existingField) {
                connectionMap[field.connection].push({ id: field.id, label: field.label });
              }
            }
          });
        }
      });

      return Object.keys(connectionMap).map(connection => ({
        connection,
        fields: connectionMap[connection]
      }));
    };

    const [modal2Open, setModal2Open] = useState(false);
    const { Paragraph, Text } = Typography;
    const info = (
      <span>
        Use connections wisely
      </span>
    );

    return (
      <>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#5F9B97',
            },
          }}
        >
          <div className="flex justify-center mt-1 pt-1.5 space-x-4">
            <Space direction="vertical" size="middle">
              <Space.Compact>
                <Paragraph style={{ padding: '5px' }}>
                  {info}
                </Paragraph>
              </Space.Compact>
              <Space.Compact>
                <span onClick={() => setModal2Open(true)}
                  className="inline-flex items-center justify-center cursor-pointer group">
                  <settingsIcon.react className="h-3 w-3 group-hover:text-primary" />
                </span>
              </Space.Compact>
            </Space>
          </div>
          <Modal
            title={this.Name}
            open={modal2Open}
            onOk={() => setModal2Open(false)}
            onCancel={() => setModal2Open(false)}
            width={1000}
            style={{ top: '25%' }}

            footer={(_, { OkBtn }) => (
              <>
                <OkBtn />
              </>
            )}
          >
            <Form layout="vertical" size="small">
              <Form.Item 
              label="Select connection type"
              >
                <Select
                  showSearch
                  labelInValue
                  size={"small"}
                  style={{ width: '100%' }}
                  className="nodrag"
                  onChange={handleSelectChange}
                  value={selectedConnection}
                  placeholder='Select connection'
                  options={connections.map(conn => ({ label: conn.label, value: conn.value }))}
                />
              </Form.Item>
              <br/>
              <Form.Item label="Environment Variables">
                <Table
                  components={components}
                  rowClassName={() => 'editable-row'}
                  bordered
                  dataSource={dataSource}
                  columns={columns as ColumnTypes}
                />
              </Form.Item>
            </Form>
          </Modal>
        </ConfigProvider>
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands }) {
    const { setNodes, deleteElements, setViewport } = useReactFlow();
    const store = useStoreApi();

    const deleteNode = useCallback(() => {
      deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

    const zoomSelector = createZoomSelector();
    const showContent = useStore(zoomSelector);

    const selector = (s) => ({
      nodeInternals: s.nodeInternals,
      edges: s.edges,
    });

    const { nodeInternals, edges } = useStore(selector);
    const nodeId = id;
    const internals = { nodeInternals, edges, nodeId, componentService }

    const handleElement = React.createElement(renderHandle, {
      type: Connection.Type,
      Handle: Handle,
      Position: Position,
      internals: internals
    });

    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    const isSelected = useStore((state) => !!state.nodeInternals.get(id)?.selected);

    return (
      <>
        {renderComponentUI({
          id: id,
          data: data,
          context: context,
          manager: manager,
          commands: commands,
          name: Connection.Name,
          ConfigForm: Connection.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes, handleChange }),
          Icon: Connection.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
          handleChange,
          isSelected
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import os"];
  }

  public generateComponentCode({ config }): string {
    let code = ``;

    config.variables.forEach(variable => {
      if (variable.value) {
        code += `os.environ["${variable.name}"] = "${variable.value}"\n`;
      }
    });

    code += "\n";

    return code;
  }
}
