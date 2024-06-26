import React, { Fragment, useEffect, useState } from 'react';
import { ConfigProvider, Button, Form, Input, Radio, Flex, Cascader, Space, Switch, InputNumber, Modal, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, EyeInvisibleOutlined, EyeTwoTone, SearchOutlined, SettingOutlined } from '@ant-design/icons';

import styled from 'styled-components';


import { KeyValueForm } from './forms/keyValueForm';
import { ValuesListForm } from './forms/valuesListForm';
import { crosshairIcon, playCircleIcon, searchIcon, settingsIcon, warningIcon } from './icons';
import InputRegular from './forms/InputRegular';
import InputQuantity from './forms/InputQuantity';
import InputFile from './forms/InputFile';
import SelectCustomizable from './forms/selectCustomizable';
import SelectTokenization from './forms/selectTokenization';
import SelectRegular from './forms/selectRegular';
import SelectColumns from './forms/selectColumns';
import SelectColumn from './forms/selectColumn';
import KeyValueColumns from './forms/keyValueColumns';
import KeyValueColumnsSelect from './forms/keyValueColumnsSelect';
import SelectMultipleCustomizable from './forms/selectMultipleCustomizable';
import TransferData from './forms/transferData';
import TextareaRegular from './forms/TextareaRegular';
import DataMapping from './forms/dataMapping';
import CodeTextarea from './forms/CodeTextarea';

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
        if(field !== 'lastExecuted') {
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
}: FormComponentProps) => {

  const [modalOpen, setModalOpen] = useState(false);

  const executeUntilComponent = () => {
    commands.execute('pipeline-editor:run-pipeline-until', { nodeId: nodeId, context: context });
    handleChange(Date.now(), 'lastExecuted'); 
  };

  return (

        <Form
        layout="vertical"
        size="small">
        {generateUIInputs({ name, nodeId, form, data, context, componentService, manager, commands, handleChange, advanced: false })}
        <div className="flex justify-center mt-1 pt-1.5 space-x-4">
          <span onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center cursor-pointer group">
            <settingsIcon.react className="h-3 w-3 group-hover:text-primary" />
          </span>
          {(type.includes('input') || type.includes('processor') || type.includes('output')) && (
            <span onClick={executeUntilComponent} className="inline-flex items-center justify-center cursor-pointer group">
              <playCircleIcon.react className="h-3 w-3 group-hover:text-primary" />
            </span>
          )}
        </div>
        <ConfigModal modalOpen={modalOpen} setModalOpen={setModalOpen} name={name} nodeId={nodeId} form={form} data={data} context={context} componentService={componentService} manager={manager} commands={commands} handleChange={handleChange} advanced />
      </Form>

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

  return (
    <>
      {form.fields.map((field: FieldDescriptor, index: number) => {

        if (!advanced && field.advanced) {
          return null;
        }

        // if unique value
        let value: any;

        // if list
        let values = []

        const fieldParts = field.id.split('.');

        if (Array.isArray(data[field.id])) {
          // We're dealing with a list item
          values = data[field.id];
        }
        else if (fieldParts.length === 1) {
          // Top-level field
          if (data[field.id] !== undefined) {
            value = data[field.id];
          }
        } else {
          // Nested field
          const [outerField, innerField] = fieldParts;
          if (data[outerField] && data[outerField][innerField] !== undefined) {
            value = data[outerField][innerField];
          }
        }

        const validateInput = (value: any) => {
          if (field.validation) { // Check if field.validation exists
            const pattern = new RegExp(field.validation, "i"); // Creates the regex
            setIsInvalid(!pattern.test(value));
          } else {
            setIsInvalid(false); // If no field.validation, consider the input as valid
          }
        };

        const [isInvalid, setIsInvalid] = useState(false);
        // Use useEffect to call validateInput whenever 'value' changes
        useEffect(() => {
          validateInput(value);
        }, [value]); // Dependency array ensures this effect runs whenever 'value' changes

        switch (field.type) {
          case "input":
            return (
              <Form.Item style={{ marginTop: "5px", padding: "0 0 2px" }} label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <InputRegular
                  field={field} value={value} handleChange={handleChange} context={context} advanced={advanced}
                />
              </Form.Item>
            );
            case "radio":
              return (
                <Form.Item label={field.label} className="nodrag"  {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                  <Flex vertical gap="middle">
                    <Radio.Group defaultValue={value} onChange={(e: any) => handleChange(e.target.value, field.id)} buttonStyle="solid">
                      {field.options.map(option => (
                        <Radio.Button value={option.value}>{option.label}</Radio.Button>
                      ))}
                    </Radio.Group>
                  </Flex>
                </Form.Item>
              );
          case "file":
            return (
              <Form.Item style={{ marginTop: "5px", padding: "0 0 2px" }} label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <InputFile
                  field={field} value={value} handleChange={handleChange} context={context} advanced={advanced} manager={manager}
                />
              </Form.Item>
            );
          case "columns":
            return (
              <Form.Item style={{ marginTop: "5px", padding: "0 0 2px" }} label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <SelectColumns field={field} handleChange={handleChange} defaultValues={values} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced} />
              </Form.Item>
            );
          case "column":
            return (
              <Form.Item style={{ marginTop: "5px", padding: "0 0 2px" }} label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <SelectColumn field={field} handleChange={handleChange} defaultValue={value} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced} />
              </Form.Item>
            );
          case "selectCustomizable":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <SelectCustomizable field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced} />
              </Form.Item>
            );
            case "selectMultipleCustomizable":
              return (
                <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                  <SelectMultipleCustomizable field={field} handleChange={handleChange} defaultValues={values} inDialog={advanced} />
                </Form.Item>
              );
          case "selectTokenization":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <SelectTokenization field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced} />
              </Form.Item>
            );
          case "select":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <SelectRegular field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced} />
              </Form.Item>
            );
          case "textarea":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <TextareaRegular
                  field={field} value={value} handleChange={handleChange} advanced={advanced} rows={field.rows}
                />        
              </Form.Item>
            );
            case "codeTextarea":
              return (
                <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                  <CodeTextarea
                    field={field} value={value} handleChange={handleChange} advanced={advanced} rows={field.rows}
                  />        
                </Form.Item>
              );
          case "boolean":
            return (
              <Form.Item
                style={{ marginTop: "5px", padding: "0 0 2px" }}
                label={field.label}
                {...(field.required ? { required: field.required } : {})}
                {...(field.tooltip ? { tooltip: field.tooltip } : {})}
              >
                <Switch
                  onChange={(checked) => handleChange(checked, field.id)}
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  defaultChecked={value === true} // Set defaultChecked based on field.value
                />
              </Form.Item>
            );
            case "cascader":
              return (
                <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                  <Cascader
                    value={values}
                    placeholder={field.placeholder}
                    options={field.options}
                    {...(field.onlyLastValue ? { displayRender: (labels: string[]) => labels[labels.length - 1] } : {})}
                    onChange={(value: any) => handleChange(value, field.id)}
                  />             
                </Form.Item>
              );
          case "keyvalue":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <KeyValueForm field={field} handleChange={handleChange} initialValues={values} />
              </Form.Item>
            );
          case "keyvalueColumns":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>

                <KeyValueColumns field={field} handleChange={handleChange} initialValues={values} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced} />
              </Form.Item>
            );
            case "keyvalueColumnsSelect":
              return (
                <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>

                  <KeyValueColumnsSelect field={field} handleChange={handleChange} initialValues={values} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced} />
                </Form.Item>
              );
          case "valuesList":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <ValuesListForm field={field} handleChange={handleChange} initialValues={values} />
              </Form.Item>
            );
            case "inputNumber":
              return (
                <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                   <InputQuantity field={field} value={value} handleChange={handleChange} context={context} advanced={advanced}/>
                </Form.Item>
              );            
          case "transferData":
            return (
              <Form.Item label={field.label} {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <TransferData field={field} handleChange={handleChange} defaultValue={value} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced} />
              </Form.Item>
            );
            case "dataMapping":
              return (
                <Form.Item label={field.label} {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                  <DataMapping data={data} field={field} handleChange={handleChange} defaultValue={values} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced} />
                </Form.Item>
              );
              case "info":
                const { Paragraph } = Typography;
                return (
                  <Paragraph style={{ padding: '5px' }}>
                    {field.text}
                  </Paragraph>
                );
          default:
            return null;
        }
      })}
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
  return (
    <>
      <Modal
        title={name}
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
          {generateUIInputs({ name, nodeId, form, data, context, componentService, manager, commands, handleChange, advanced: true })}
        </Form>
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
}

interface ConfigModalProps {
  name: string;
  nodeId: string;
  form: object;
  data: object;
  context: any;
  componentService: any;
  manager: any
  commands: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  advanced: boolean;
  modalOpen: any;
  setModalOpen: any;
}