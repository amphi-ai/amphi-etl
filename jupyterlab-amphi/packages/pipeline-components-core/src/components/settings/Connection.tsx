import { ComponentItem, InputFile, InputRegular, Option, PipelineComponent, PipelineService, SelectRegular, createZoomSelector, onChange, renderComponentUI, renderHandle } from '@amphi/pipeline-components-manager';
import { CopyOutlined } from '@ant-design/icons';
import type { GetRef, InputRef } from 'antd';
import { ConfigProvider, Form, Input, Modal, Select, Space, Table, Tooltip } from 'antd';
import React, { useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { Handle, NodeToolbar, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { keyIcon, settingsIcon } from '../../icons';

export class Connection extends PipelineComponent<ComponentItem>() {
  public _name = "Connection";
  public _id = "connection";
  public _type = "connection";
  public _category = "configuration";
  public _description = `Use Connection to set up a connection (e.g., credentials, database parameters, configuration file)
  once for the pipeline, and reuse it across different components. This approach ensures that no credentials are stored 
  in the pipeline, as they can be retrieved from environment variables or a configuration files.`;
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
    handleChange,
    modalOpen,
    setModalOpen
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
    const [selectedConnection, setSelectedConnection] = useState<{ label: string, value: string } | undefined>({
      label: data.connectionType,
      value: data.connectionType
    });
    const [connectionName, setConnectionName] = useState<string>(data.connectionName || "");
    // const [fetchMethod, setFetchMethod] = useState<Option>(data.fetchMethod || "clear" );
    const fetchMethod = useMemo(() => data.fetchMethod || "clear", [data.fetchMethod]);

    if (!data.fetchMethod) {
      handleChange(fetchMethod, "fetchMethod")
    }

    const [envVarFile, setEnvVarFile] = useState<Option>(data.envVarFile || "");

    useEffect(() => {
      handleChange(dataSource, "variables");
    }, [dataSource]);

    const handleDelete = (key: React.Key) => {
      const newData = dataSource.filter((item) => item.key !== key);
      setDataSource(newData);
    };

    const defaultColumns = useMemo(() => ([
      {
        title: (
          <>
            Name
            {dataSource.length > 0 && (
              <Tooltip
                title={() => {
                  const variables = dataSource.map(item => `${item.name}=""\n`).join('');
                  return `Copy the following variables:\n${variables}`;
                }}
                trigger="hover"
              >
                <CopyOutlined
                  style={{ marginLeft: 8, cursor: 'pointer' }}
                  onClick={async () => {
                    const variables = dataSource.map(item => `${item.name}=""\n`).join('');
                    try {
                      await navigator.clipboard.writeText(variables);
                      // Temporarily change the tooltip to "Copied to clipboard"
                      document.querySelector('.ant-tooltip-inner')!.textContent = 'Copied to clipboard';
                      setTimeout(() => {
                        document.querySelector('.ant-tooltip-inner')!.textContent = `Copy the following variables:\n${variables}`;
                      }, 2000); // Change back after 2 seconds
                    } catch (err) {
                      console.error('Could not copy text: ', err);
                    }
                  }}
                />
              </Tooltip>
            )}
          </>
        ),
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
    ]), [dataSource]);

    const handleSave = useCallback((row: DataType) => {
      const newData = [...dataSource];
      const index = newData.findIndex((item) => row.key === item.key);
      const item = newData[index];
      newData.splice(index, 1, { ...item, ...row });
      setDataSource(newData);
    }, [dataSource]);

    const components = useMemo(() => ({
      body: {
        row: EditableRow,
        cell: EditableCell,
      },
    }), []);

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

    const handleSelectChange = useCallback((value: { value: string; label: string }) => {
      setSelectedConnection(value);

      const selectedConnectionFields = connections.find(conn => conn.value === value.value)?.fields || [];
      handleChange(value.value, "connectionType");
      if (!data.customTitle) {
        handleChange(value.value + " Connection", "customTitle");
      }
      handleChange(value.value, "connectionName");
      setConnectionName(value.value);

      setDataSource(selectedConnectionFields.map(field => ({
        key: field.id,
        name: field.label.includes('_')
          ? field.label
          : PipelineService.formatVarName(value.value + '_' + field.label),
        value: '',
        default: '',
      })));
    }, [connections, data.customTitle, handleChange]);

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
            if (field.connection && !field.ignoreConnection) {
              if (!connectionMap[field.connection]) {
                connectionMap[field.connection] = [];
              }
              const existingField = connectionMap[field.connection].find(f => f.id === field.id);
              if (!existingField) {
                const newField: any = {
                  id: field.id,
                  label: field.connectionVariableName || field.label
                };
                connectionMap[field.connection].push(newField);
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

    const connectionNameTooltip = "Provide a name to the connection to describe and differentiate it with other connections."

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
                <Form.Item label="Connection Name" tooltip={connectionNameTooltip}>
                  <InputRegular field={{
                    type: "input", label: "Submission", id: "connectionName", placeholder: "Optional name",
                  }} handleChange={(value) => {
                    handleChange(value, 'connectionName');
                    setConnectionName(value);
                  }} context={context} advanced={false} value={connectionName} />
                </Form.Item>

              </Space.Compact>
            </Space>
          </div>
          <Modal
            title={this.Name}
            open={modalOpen}
            onOk={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
            width={1000}
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
                  className="nodrag"
                  onChange={handleSelectChange}
                  value={selectedConnection}
                  placeholder='Select connection'
                  options={connections.map(conn => ({ label: conn.label, value: conn.value }))}
                  size="middle"
                />
              </Form.Item>
              <br />
              <Form.Item label="Connection Name"
                tooltip={connectionNameTooltip} >
                <InputRegular field={{
                  type: "input", id: "connectionName", placeholder: "Optional name", label: ""
                }} handleChange={(value) => {
                  handleChange(value, 'connectionName');
                  setConnectionName(value);
                }} context={context} advanced={true} value={connectionName} />
              </Form.Item>
              <br />
              <Form.Item label="Values to fetch from" tooltip="Select the method used to retrieve the connection information. When choosing from an environment variables file, please specify the file in the file input below.">
                <SelectRegular
                  field={{
                    type: "select",
                    id: "fetchMethod",
                    label: "Values to fetch from",
                    placeholder: "Select method",
                    options: [
                      { value: "clear", label: "Values in clear (not recommended)" },
                      { value: "envVars", label: "Environment Variables (provided using Env. Variables component)" },
                      { value: "envFile", label: "Environment Variables from .env file (recommended)" }
                    ]
                  }}
                  handleChange={(value) => {
                    handleChange(value, 'fetchMethod');

                    if (value === "envVars" || value === "envFile") {
                      setDataSource(prevDataSource =>
                        prevDataSource.map(item => ({
                          ...item,
                          value: `{os.getenv('${item.name}')}`
                        }))
                      );
                    } else {
                      setDataSource(prevDataSource =>
                        prevDataSource.map(item => ({
                          ...item,
                          value: ''
                        }))
                      );
                    }
                  }}
                  advanced={true}
                  defaultValue={fetchMethod}
                />
              </Form.Item>
              <br />
              {data.fetchMethod === "envFile" && (
                <Form.Item label="Environment Variables File (.env)" tooltip="If the environment file is the selected method, specify the file from which to extract the connection information. The file is a dot env (.env) file which consists of VARIABLE='value', one per line. You can use the helper to copy-paste the list of variable names below next to the Name column title.">
                  <InputFile field={{
                    type: "input", id: "environmentVariableFile", placeholder: "config.env", label: ""
                  }} handleChange={handleChange} context={context} advanced={true} value={envVarFile} manager={manager} />
                </Form.Item>
              )}
              <br />
              <Form.Item label="Variables">
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

  public UIComponent({ id, data, context, componentService, manager, commands, rendermimeRegistry }) {
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
    const [modalOpen, setModalOpen] = useState(false);

    return (
      <>
        {renderComponentUI({
          id: id,
          data: data,
          context: context,
          manager: manager,
          commands: commands,
          name: Connection.Name,
          ConfigForm: Connection.ConfigForm, // Pass the component itself
          configFormProps: { // Provide props separately
            nodeId: id,
            data,
            context,
            componentService,
            manager,
            commands,
            store,
            setNodes,
            handleChange,
            modalOpen,
            setModalOpen
          },
          Icon: Connection.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
          handleChange,
          isSelected
        })}
        {showContent && (
          <NodeToolbar isVisible position={Position.Bottom}>
            <button onClick={() => setModalOpen(true)}><settingsIcon.react /></button>
          </NodeToolbar>
        )}
      </>
    );
  }

  public provideImports({ config }): string[] {
    const imports = ["import os"];
    if (config.fetchMethod === "envFile") {
      imports.push("from dotenv import load_dotenv");
    }
    return imports;
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('python-dotenv');
    // console.log("python-dotenv");
    return deps;
  }

  public generateComponentCode({ config }): string {
    let code = `# Connection constants for ${config.connectionType}\n`;

    // If the fetch method is "envFile", load the environment variables from the specified file
    if (config.fetchMethod === "envFile") {
      code += `load_dotenv(dotenv_path="${config.environmentVariableFile}")\n\n`;
    }

    // Define the variables based on the fetch method
    config.variables.forEach(variable => {
      let varName = variable.name;
      if (config.fetchMethod === "clear") {
        code += `${varName} = "${variable.value}"\n`;
      } else if (config.fetchMethod === "envVars") {
        if (variable.default) {
          code += `${varName} = os.getenv('${varName}', '${variable.default}')\n`;
        } else {
          code += `${varName} = os.getenv('${varName}')\n`;
        }
      } else if (config.fetchMethod === "envFile") {
        if (variable.default) {
          code += `${varName} = os.getenv('${varName}', '${variable.default}')\n`;
        } else {
          code += `${varName} = os.getenv('${varName}')\n`;
        }
      }
    });

    code += "\n";

    return code;
  }
}
