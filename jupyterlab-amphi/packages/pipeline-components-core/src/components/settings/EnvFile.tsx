import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import { ComponentItem, PipelineComponent, InputFile, InputRegular, SelectRegular, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector, RequestService, Option } from '@amphi/pipeline-components-manager';
import { KernelMessage } from '@jupyterlab/services';
import { Handle, Position, useReactFlow, useStore, useStoreApi, NodeToolbar } from 'reactflow';
import { bracesIcon, settingsIcon } from '../../icons';

import { Form, Table, ConfigProvider, Divider, Input, Select, Space, Button, Typography, Modal, Popconfirm } from 'antd';
import type { GetRef, InputRef } from 'antd';

export class EnvFile extends PipelineComponent<ComponentItem>() {
  public _name = "Env. Variables File";
  public _id = "envFile";
  public _type = "env_variables";
  public _category = "configuration";
  public _description = "Use Env. Variables to define environment variable names for use in the pipeline. You can also assign a value directly and set a default value. It is not recommended for credentials or sensitive data unless you fully understand the implications."
  public _icon = bracesIcon;
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
    // Define your default config

    type FormInstance<T> = GetRef<typeof Form<T>>;

    const EditableContext = React.createContext<FormInstance<any> | null>(null);

    interface Item {
      key: string;
      name: string;
      value: string;
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
    }

    type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;

    const [dataSource, setDataSource] = useState<DataType[]>(data.variables || []);
    const [envVarFile, setEnvVarFile] = useState<Option>(data.envVarFile || "");
    const [loadings, setLoadings] = useState<boolean>();

    useEffect(() => {
      handleChange(dataSource, "variables");
    }, [dataSource]);

    const [count, setCount] = useState(dataSource.length || 0);

    const handleDelete = (key: React.Key) => {
      const newData = dataSource.filter((item) => item.key !== key);
      setDataSource(newData);
    };

    const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string, required?: boolean })[] = [
      {
        title: 'Name',
        dataIndex: 'name',
        width: '50%',
        editable: false,
        required: true
      },
      {
        title: 'Default',
        dataIndex: 'default',
        width: '50%',
        editable: true,
        required: false
      },
    ];

    const retrieveEnvVariablesFromFile = () => {
      setLoadings(true);

      // Define the request to retrieve environment variables
      const code = `
    !pip install --quiet python-dotenv --disable-pip-version-check
    from dotenv import dotenv_values
    
    env_vars = dotenv_values("${data.envVarFile || 'config.env'}")
    formatted_output = ", ".join([f"{k} ({v})" for k, v in env_vars.items()])
    print(formatted_output)
    `;

      const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

      future.onReply = reply => {
        if (reply.content.status == "ok") {
          console.log("OK")
        } else {
          console.log("Error or abort")
          setLoadings(false)
        }
      };

      future.onIOPub = msg => {
        if (msg.header.msg_type === 'stream') {
          const streamMsg = msg as KernelMessage.IStreamMsg;
          const output = streamMsg.content.text;

          const regex = /([^\s,]+)\s+\(((?:[^()]+|\([^)]*\))*)\)/g;
          const newItems = [];

          let match;
          while ((match = regex.exec(output)) !== null) {
            const [_, name, value] = match;
            newItems.push({
              key: name,
              name: name,
              value: value
            });
          }

          setDataSource((items) => {
            const existingKeys = new Set(newItems.map((item) => item.key));
            const filteredItems = items.filter((item) => existingKeys.has(item.key));
            const uniqueItems = newItems.filter(
              (newItem) => !filteredItems.some((item) => item.key === newItem.key)
            );

            return [...filteredItems, ...uniqueItems];
          });


          setLoadings(false)
        } else if (msg.header.msg_type === 'error') {
          setLoadings(false);
          const errorMsg = msg as KernelMessage.IErrorMsg;
          const errorOutput = errorMsg.content;
          console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
        }
      };
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
          required: col.required,
          handleSave,
        }),
      };
    });

    return (
      <>
        <ConfigProvider
          theme={{
            token: {
              // Seed Token
              colorPrimary: '#5F9B97',
            },
          }}
        >
          <Form
            layout="vertical"
            size="small">
            <Form.Item label="File (.env)">
              <InputFile field={{
                type: "input", id: "environmentVariableFile", placeholder: "config.env", label: ""
              }} handleChange={(value) => {
                handleChange(value, 'envVarFile');
                setEnvVarFile(value);
              }} context={context} advanced={false} value={envVarFile} manager={manager} />
            </Form.Item>
            <Modal
              title="Env. Variables File (.env)"
              centered
              open={modalOpen}
              onOk={() => setModalOpen(false)}
              onCancel={() => setModalOpen(false)}
              width={800}
              footer={(_, { OkBtn }) => (
                <>
                  <OkBtn />
                </>
              )}
            >
              <Form
                layout="vertical" >
                <div>
                  <Form.Item label="Environment Variables File (.env)" tooltip="Specify the file from which to extract the connection information. The file is a dot env (.env) file which consists of VARIABLE='value', one per line. You can use the helper to copy-paste the list of variable names below next to the Name column title.">

                    <InputFile field={{
                      type: "input", id: "environmentVariableFile", placeholder: "config.env", label: ""
                    }} handleChange={(value) => {
                      handleChange(value, 'envVarFile');
                      setEnvVarFile(value);
                    }} context={context} advanced={true} value={envVarFile} manager={manager} />
                  </Form.Item>
                  <br />
                  <Button onClick={retrieveEnvVariablesFromFile} type="primary" loading={loadings} style={{ marginBottom: 16 }}>
                    Retrieve Environment Variables from .env file
                  </Button>
                  <Table
                    components={components}
                    rowClassName={() => 'editable-row'}
                    bordered
                    dataSource={dataSource}
                    columns={columns as ColumnTypes}
                  />
                </div>
              </Form>
            </Modal>
          </Form>
        </ConfigProvider>
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands, rendermimeRegistry, settings }) {

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

    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: EnvFile.Type,
      Handle: Handle, // Make sure Handle is imported or defined
      Position: Position, // Make sure Position is imported or defined
      internals: internals
    });

    const handleChange = useCallback((evtTargetValue: any, field: string) => {

      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    // Selector to determine if the node is selected
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
          name: EnvFile.Name,
          ConfigForm: EnvFile.ConfigForm, // Pass the component itself
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
          Icon: EnvFile.Icon,
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
    return ["from dotenv import load_dotenv"];
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('python-dotenv');
    return deps;
  }

  public generateComponentCode({ config }): string {

    let code = `
# Load environment variables from ${config.envVarFile}
load_dotenv(dotenv_path="${config.envVarFile}")
`;

    code += "\n";

    return code;
  }
}
