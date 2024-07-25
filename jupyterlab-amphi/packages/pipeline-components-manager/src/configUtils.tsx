import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Card, Cascader, Flex, Form, Modal, Radio, Switch, Typography, Select, Divider, Space, Button } from 'antd';
import React, { useEffect, useState } from 'react';
import { renderFormItem } from './formUtils'
import CodeTextarea from './forms/CodeTextarea';
import InputFile from './forms/InputFile';
import InputQuantity from './forms/InputQuantity';
import InputRegular from './forms/InputRegular';
import TextareaRegular from './forms/TextareaRegular';
import DataMapping from './forms/dataMapping';
import KeyValueColumns from './forms/keyValueColumns';
import KeyValueColumnsSelect from './forms/keyValueColumnsSelect';
import KeyValueForm from './forms/keyValueForm';
import SelectColumn from './forms/selectColumn';
import SelectColumns from './forms/selectColumns';
import SelectCustomizable from './forms/selectCustomizable';
import SelectMultipleCustomizable from './forms/selectMultipleCustomizable';
import SelectRegular from './forms/selectRegular';
import SelectTokenization from './forms/selectTokenization';
import TransferData from './forms/transferData';
import ValuesListForm from './forms/valuesListForm';
import { PipelineService } from './PipelineService';

export const setDefaultConfig = ({
  nodeId,
  store,
  setNodes,
  defaultConfig,
}: SetDefaultConfigProps): void => {
  const { nodeInternals } = store.getState();
  setNodes(
    Array.from(nodeInternals.values()).map((node) => {
      if (node.id === nodeId && Object.keys(node.data).length === 1) {
        node.data = {
          ...defaultConfig,
          lastUpdated: null,
          lastExecuted: null,
        };
      }
      return node;
    })
  );
};

export const onChange = ({ evtTargetValue, field, nodeId, store, setNodes }: OnChangeProps): void => {
  const newValue = evtTargetValue;
  const { nodeInternals } = store.getState();
  const currentTimestamp = Date.now(); // Current timestamp in milliseconds since Unix epoch

  setNodes(
    Array.from(nodeInternals.values()).map((node) => {
      if (node.id === nodeId) {
        let fieldParts = field.split('.');

        // Set or update the main field
        if (fieldParts.length === 1) {
          // Top-level field
          node.data = { ...node.data, [field]: newValue };
        } else {
          // Nested field
          const [outerField, innerField] = fieldParts;
          node.data = {
            ...node.data,
            [outerField]: {
              ...node.data[outerField],
              [innerField]: newValue,
            },
          };
        }

        // Set or update the lastUpdated field with the current timestamp
        if (field !== 'lastExecuted') {
          node.data = { ...node.data, lastUpdated: currentTimestamp };
        } else {
          node.data = { ...node.data };
        }
      }
      return node;
    })
  );
};

export const generateUIFormComponent = ({
  nodeId,
  type,
  name,
  form,
  data,
  context,
  componentService,
  manager,
  commands,
  handleChange,
  modalOpen,
  setModalOpen
}: FormComponentProps) => {

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div onDoubleClick={stopPropagation}>
      <Form
        layout="vertical"
        size="small">
        {generateUIInputs({ name, nodeId, form, data, context, componentService, manager, commands, handleChange, advanced: false })}

        <ConfigModal modalOpen={modalOpen} setModalOpen={setModalOpen} name={name} nodeId={nodeId} form={form} data={data} context={context} componentService={componentService} manager={manager} commands={commands} handleChange={handleChange} advanced />
      </Form>
    </div>
  );
};

export const generateUIInputs = ({
  name,
  nodeId,
  form,
  data,
  context,
  componentService,
  manager,
  commands,
  handleChange,
  advanced
}: UIInputsProps) => {

  const [connections, setConnections] = useState([]);
  const [optionsConnections, setOptionsConnections] = useState<Record<string, any[]>>({});


  const fetchConnections = () => {
    const allConnections = PipelineService.getConnections(context.model.toString());
    setConnections(allConnections);
    console.log("allConnections %o", allConnections);
    
    const connectionsByType = allConnections.reduce((acc, connection) => {
      const connectionType = connection.connectionType; // Change to group by connectionType
      if (!acc[connectionType]) {
        acc[connectionType] = [];
      }
      acc[connectionType].push(renderItem(connection.connectionName)); // Use connectionName for display
      return acc;
    }, {} as Record<string, any[]>);
  
    setOptionsConnections(connectionsByType);
    console.log("optionsConnections %o", optionsConnections);
  };

  const renderItem = (title: string) => ({
    value: title,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {title}
      </div>
    ),
  });

  const handleSelectConnection = (connectionName: string, attributeId: string) => {
    console.log("connections: %o", connections)
    console.log("connectionName: %o", connectionName)
    const selectedConnection = connections.find(conn => conn.connectionName === connectionName);
    console.log("selectedConnection %o", selectedConnection)
    if (selectedConnection) {
      selectedConnection.variables.forEach(variable => {
        const { key, name } = variable;
        console.log("key %o", key);
        const VarName = name;
        const fieldId = `${key}`;
        handleChange('{' + `${VarName}` + '}', fieldId);
      });
      handleChange(connectionName, attributeId);
    }
  };

  const handleRemoveConnection = (attributeId: string) => {
    console.log("Removing connection for attributeId: %o", attributeId);
    const connectionName = data[attributeId];
    const selectedConnection = connections.find(conn => conn.connectionName === connectionName);
    if (selectedConnection) {
      selectedConnection.variables.forEach(variable => {
        const { key } = variable;
        const fieldId = `${key}`;
        handleChange('', fieldId);
      });
      handleChange('', attributeId);
    }
  };

  // Group fields by connection
  const groupedFields = form.fields.reduce((acc: Record<string, FieldDescriptor[]>, field: FieldDescriptor) => {
    const connection = field.connection || 'default';
    if (!acc[connection]) {
      acc[connection] = [];
    }
    acc[connection].push(field);
    return acc;
  }, {});

  const renderField = (field: FieldDescriptor, index: number) => {
    if (!advanced && field.advanced) {
      return null;
    }

    let value: any;
    let values: any[] = [];
    const fieldParts = field.id.split('.');

    if (Array.isArray(data[field.id])) {
      values = data[field.id];
    } else if (fieldParts.length === 1) {
      if (data[field.id] !== undefined) {
        value = data[field.id];
      }
    } else {
      const [outerField, innerField] = fieldParts;
      if (data[outerField] && data[outerField][innerField] !== undefined) {
        value = data[outerField][innerField];
      }
    }

    const validateInput = (value: any) => {
      if (field.validation) {
        const pattern = new RegExp(field.validation, "i");
        setIsInvalid(!pattern.test(value));
      } else {
        setIsInvalid(false);
      }
    };

    const [isInvalid, setIsInvalid] = useState(false);
    useEffect(() => {
      validateInput(value);
    }, [value]);

    const commonProps = { field, handleChange, context, advanced };

    switch (field.type) {
      case "input":
        return renderFormItem(field, <InputRegular {...commonProps} value={value} />);
      case "radio":
        return renderFormItem(field, (
          <Flex vertical gap="middle">
            <Radio.Group defaultValue={value} onChange={(e: any) => handleChange(e.target.value, field.id)} buttonStyle="solid">
              {field.options.map((option: any) => (
                <Radio.Button value={option.value}>{option.label}</Radio.Button>
              ))}
            </Radio.Group>
          </Flex>
        ));
      case "file":
        return renderFormItem(field, <InputFile {...commonProps} value={value} manager={manager} />);
      case "columns":
        return renderFormItem(field, <SelectColumns {...commonProps} defaultValues={values} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "column":
        return renderFormItem(field, <SelectColumn {...commonProps} defaultValue={value} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "selectCustomizable":
        return renderFormItem(field, <SelectCustomizable {...commonProps} defaultValue={value} />);
      case "selectMultipleCustomizable":
        return renderFormItem(field, <SelectMultipleCustomizable {...commonProps} defaultValues={values} />);
      case "selectTokenization":
        return renderFormItem(field, <SelectTokenization {...commonProps} defaultValue={value} />);
      case "select":
        return renderFormItem(field, <SelectRegular {...commonProps} defaultValue={value} />);
      case "textarea":
        return renderFormItem(field, <TextareaRegular {...commonProps} value={value} rows={field.rows} />);
      case "codeTextarea":
        return renderFormItem(field, <CodeTextarea {...commonProps} value={value} rows={field.rows} />);
      case "boolean":
        return renderFormItem(field, (
          <Switch
            onChange={(checked) => handleChange(checked, field.id)}
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
            defaultChecked={value === true}
          />
        ));
      case "cascader":
        return renderFormItem(field, (
          <Cascader
            value={values}
            placeholder={field.placeholder}
            options={field.options}
            {...(field.onlyLastValue ? { displayRender: (labels: string[]) => labels[labels.length - 1] } : {})}
            onChange={(value: any) => handleChange(value, field.id)}
          />
        ));
      case "keyvalue":
        return renderFormItem(field, <KeyValueForm {...commonProps} initialValues={values} />);
      case "keyvalueColumns":
        return renderFormItem(field, <KeyValueColumns {...commonProps} initialValues={values} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "keyvalueColumnsSelect":
        return renderFormItem(field, <KeyValueColumnsSelect {...commonProps} initialValues={values} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "valuesList":
        return renderFormItem(field, <ValuesListForm {...commonProps} initialValues={values} />);
      case "inputNumber":
        return renderFormItem(field, <InputQuantity {...commonProps} value={value} />);
      case "transferData":
        return renderFormItem(field, <TransferData {...commonProps} defaultValue={value} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "dataMapping":
        return renderFormItem(field, <DataMapping data={data} {...commonProps} defaultValue={values} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "info":
        return <Typography.Paragraph style={{ padding: '5px' }}>{field.text}</Typography.Paragraph>;
      default:
        return null;
    }
  };

  return (
    <>
      {Object.entries(groupedFields).map(([connection, fields], groupIndex) => {
        if (connection === 'default' || (!advanced && (fields as FieldDescriptor[]).some(field => field.advanced))) return null;

        const connectionFields = fields as FieldDescriptor[];
        const connectionDataId = `${connection}-${groupIndex}`;
        const selectedConnectionName = data[connectionDataId] || '';

        const selectConnection = (
          <Select
            placeholder="Select Connection"
            style={{ minWidth: 200 }}
            onClick={fetchConnections}
            options={optionsConnections[connection] || []}
            value={selectedConnectionName || undefined}
            onChange={(value) => handleSelectConnection(value, connectionDataId)}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 4px 4px' }}>
                  <Button type="text" icon={<CloseOutlined />} onClick={() => handleRemoveConnection(connectionDataId)}>
                    Remove Connection
                  </Button>
                </Space>
              </>
            )}
          />
        );

        return (
          <Card
            size="small"
            title={`${connection} Connection`}
            key={`${connection}-${groupIndex}`}
            style={{ marginTop: '10px', marginBottom: '10px' }}
            extra={selectConnection}
            type="inner"
          >
            {connectionFields.map(renderField)}
          </Card>
        );
      })}
      {groupedFields.default && groupedFields.default.map(renderField)}
    </>
  );
};

export default function ConfigModal({
  name,
  nodeId,
  form,
  data,
  context,
  componentService,
  manager,
  commands,
  handleChange,
  advanced,
  modalOpen,
  setModalOpen
}: ConfigModalProps) {
  const componentName = data?.customTitle || name;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const [formIdentifier] = Form.useForm();

  const onFillConnection = () => {
    formIdentifier.setFieldsValue({
      url: 'https://taobao.com/',
    });
  };

  return (
    <>
      <Modal
        title={componentName}
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
        <div onDoubleClick={stopPropagation}>
          <Form
            form={formIdentifier}
            layout="vertical" >
            {generateUIInputs({ name, nodeId, form, data, context, componentService, manager, commands, handleChange, advanced: true })}
          </Form>
        </div>

      </Modal>
    </>
  )
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
  modalOpen: boolean;
  setModalOpen: any;
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
  type: 'file' | 'column' | 'columns' | 'keyvalue' | 'valuesList' | 'input' | 'password' | 'select' | 'textarea' | 'codeTextarea' | 'radio'
  | 'cascader' | 'boolean' | 'inputNumber' | 'selectCustomizable' | 'selectTokenization' | 'transferData' | 'keyvalueColumns' | 'keyvalueColumnsSelect'
  | 'dataMapping' | 'editableTable' | 'info' | 'cascaderMultiple' | 'selectMultipleCustomizable';
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
  height?: number;
  rows?: number;
  outputType?: string;
  drivers?: string;
  typeOptions?: any;
  inputType?: 'password';
  text?: string;
  imports?: string[];
  query?: string;
  onlyLastValue?: boolean;
  noneOption?: boolean;
  connection?: string;
}

interface ConfigModalProps {
  name: string;
  nodeId: string;
  form: object;
  data: any;
  context: any;
  componentService: any;
  manager: any
  commands: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  advanced: boolean;
  modalOpen: any;
  setModalOpen: any;
}