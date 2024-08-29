import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Card, Cascader, Flex, Form, Modal, Radio, Switch, Typography, Select, Divider, Space, Button } from 'antd';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import FormulaColumns from './forms/FormulaColumns'
import { PipelineService } from './PipelineService';

// Function to check if a field should be displayed based on its condition
const shouldDisplayField = (field, values) => {
  console.log("shouldDisplayField field:", field);
  console.log("shouldDisplayField values:", values);

  if (!field.condition) {
    console.log("No condition for field, displaying:", field.id);
    return true;
  }
  console.log("Condition exists for field:", field.id);

  const conditionKeys = Object.keys(field.condition);
  console.log("Condition keys:", conditionKeys);

  const result = conditionKeys.every(key => {
    const fieldConditionValue = field.condition[key];
    const formValue = values[key];

    const matches = Array.isArray(fieldConditionValue)
      ? fieldConditionValue.includes(formValue)
      : formValue === fieldConditionValue;

    console.log(`Checking condition for key '${key}':`, {
      fieldConditionValue,
      formValue,
      matches
    });

    return matches;
  });

  console.log(`Final result for field ${field.id}:`, result);
  return result;
};

// Set default options to component if specified
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

export const GenerateUIFormComponent = React.memo(({
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

  // console.log("GenerateUIFormComponent");

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const [fieldsForm] = Form.useForm();
  const [formValues, setFormValues] = useState(fieldsForm.getFieldsValue());

  useEffect(() => {
    setFormValues(fieldsForm.getFieldsValue());
  }, [fieldsForm]);

  return (
    <div onDoubleClick={stopPropagation}>
      <Form
        form={fieldsForm}
        layout="vertical"
        size="small"
        onValuesChange={(_, values) => {
          setFormValues(values);
        }}>
        <GenerateUIInputs
          name={name}
          nodeId={nodeId}
          form={form}
          data={data}
          context={context}
          componentService={componentService}
          manager={manager}
          commands={commands}
          handleChange={handleChange}
          advanced={false}
          formValues={formValues}
        />

        <ConfigModal
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          name={name}
          nodeId={nodeId}
          form={form}
          data={data}
          context={context}
          componentService={componentService}
          manager={manager}
          commands={commands}
          handleChange={handleChange}
          advanced
        />
      </Form>
    </div>
  );
});

export const GenerateUIInputs = React.memo(({
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
  formValues
}: UIInputsProps) => {

  // console.log("GenerateUIInputs")

  const [connections, setConnections] = useState([]);
  const [optionsConnections, setOptionsConnections] = useState<Record<string, any[]>>({});

  const fetchConnections = useCallback(() => {
    const allConnections = PipelineService.getConnections(context.model.toString());
    setConnections(allConnections);

    const connectionsByType = allConnections.reduce((acc, connection) => {
      const connectionType = connection.connectionType;
      if (!acc[connectionType]) {
        acc[connectionType] = [];
      }
      acc[connectionType].push(renderItem(connection.connectionName));
      return acc;
    }, {} as Record<string, any[]>);

    setOptionsConnections(connectionsByType);
  }, [context]);

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

  const handleSelectConnection = useCallback((connectionName: string, attributeId: string) => {

    const selectedConnection = connections.find(conn => conn.connectionName === connectionName);
    if (selectedConnection) {
      selectedConnection.variables.forEach(variable => {
        const { key, name } = variable;
        const VarName = name;
        const fieldId = `${key}`;
        handleChange('{' + `${VarName}` + '}', fieldId);
      });
      handleChange(connectionName, attributeId);
    }
  }, [connections, handleChange]);

  const handleRemoveConnection = useCallback((attributeId: string) => {
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
  }, [connections, data, handleChange]);

  const groupedFields = useMemo(() => form.fields.reduce((acc: Record<string, FieldDescriptor[]>, field: FieldDescriptor) => {
    const connection = field.connection || 'default';
    if (!acc[connection]) {
      acc[connection] = [];
    }
    acc[connection].push(field);
    return acc;
  }, {}), [form.fields]);

  const renderField = useCallback((field: FieldDescriptor, index: number) => {
    if (!advanced && field.advanced) {
      return null;
    }


    // Directly check if the field should be displayed
    if (!shouldDisplayField(field, data)) {
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

    /*
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
    */

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
        return renderFormItem(field, <CodeTextarea {...commonProps} value={value} />);
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
      case "formulaColumns":
        return renderFormItem(field, <FormulaColumns {...commonProps} defaultValue={value} componentService={componentService} commands={commands} nodeId={nodeId} />);
      case "info":
        return <Typography.Paragraph style={{ padding: '5px' }}>{field.text}</Typography.Paragraph>;
      default:
        return null;
    }
  }, [data, handleChange, componentService, commands, manager, advanced]);

  // Helper function to check if any field in a connection should be displayed
  const shouldDisplayConnection = (fields: FieldDescriptor[]) => {
    return fields.some(field => shouldDisplayField(field, data));
  };

  return (
    <>
      {Object.entries(groupedFields).map(([connection, fields], groupIndex) => {
        if (connection === 'default' || (!advanced && (fields as FieldDescriptor[]).some(field => field.advanced))) return null;
        const connectionFields = fields as FieldDescriptor[];

        // Check if the connection card should be displayed
        if (!shouldDisplayConnection(connectionFields)) {
          return null;
        }

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
});

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

  const [fieldsForm] = Form.useForm();
  const [formValues, setFormValues] = useState(fieldsForm.getFieldsValue());

  /*
  useEffect(() => {
    console.log("changed form")
    setFormValues(fieldsForm.getFieldsValue());
  }, [fieldsForm]);
  */

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
            form={fieldsForm}
            layout="vertical"
            onValuesChange={(_, values) => {
              console.log("onValuesChange %o", values);
              setFormValues(values);
            }}
          >
            <GenerateUIInputs
              name={name}
              nodeId={nodeId}
              form={form}
              data={data}
              context={context}
              componentService={componentService}
              manager={manager}
              commands={commands}
              handleChange={handleChange}
              advanced={true}
              formValues={formValues}
            />
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
  formValues: any;
}

export interface Option {
  key?: string;
  value: string;
  label: string | React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  type?: string;
  named?: boolean;
  tooltip?: string;
}

export interface FieldDescriptor {
  type: 'file' | 'column' | 'columns' | 'keyvalue' | 'valuesList' | 'input' | 'password' | 'select' | 'textarea' | 'codeTextarea' | 'radio'
  | 'cascader' | 'boolean' | 'inputNumber' | 'selectCustomizable' | 'selectTokenization' | 'transferData' | 'keyvalueColumns' | 'keyvalueColumnsSelect'
  | 'dataMapping' | 'editableTable' | 'info' | 'cascaderMultiple' | 'selectMultipleCustomizable' | 'formulaColumns';
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
  connectionVariableName?: string;
  condition?: Record<string, any>;
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