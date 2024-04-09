import React, { Fragment, useEffect, useState } from 'react';
import { Button, Form, Input, Radio, Tag, Select, Space, Switch, Mentions, Modal } from 'antd';
import { CheckOutlined, CloseOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons';

import { PathExt } from '@jupyterlab/coreutils';

import { showBrowseFileDialog } from './BrowseFileDialog';
import { KeyValueForm } from './forms/keyValueForm';
import { ValuesListForm } from './forms/valuesListForm';
import { crosshairIcon, playCircleIcon, searchIcon, settingsIcon, warningIcon } from './icons';
import SelectCustomizable from './forms/selectCustomizable';
import SelectTokenization from './forms/selectTokenization';
import SelectRegular from './forms/selectRegular';
import SelectColumns from './forms/selectColumns';
import TransferData from './forms/transferData';

export const setDefaultConfig = ({ nodeId, store, setNodes, defaultConfig }: SetDefaultConfigProps): void => {
  const { nodeInternals } = store.getState();
  setNodes(
    Array.from(nodeInternals.values()).map((node) => {
      if (node.id === nodeId && Object.keys(node.data).length === 0) {
        node.data = {
          ...defaultConfig
        };
      }
      return node;
    })
  );
};

export const onChange = ({ evtTargetValue, field, nodeId, store, setNodes }: OnChangeProps): void => {

  const newValue = evtTargetValue;
  const { nodeInternals } = store.getState();

  setNodes(
    Array.from(nodeInternals.values()).map((node) => {
      if (node.id === nodeId) {
        let fieldParts = field.split('.');

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

  const [modal2Open, setModal2Open] = useState(false);

  const executeUntilComponent = () => {
    commands.execute('pipeline-editor:run-pipeline-until', { nodeId: nodeId, });
  };

  return (
    <Form       
      layout="vertical" 
      size="small">
      {generateUIInputs({ name, nodeId, form, data, context, componentService, manager, commands, handleChange, advanced: false })}
      <div className="flex justify-center mt-1 pt-1.5 space-x-4">
        <span onClick={() => setModal2Open(true)}
          className="inline-flex items-center justify-center cursor-pointer group">
          <settingsIcon.react className="h-3 w-3 group-hover:text-primary" />
        </span>
        {!type.includes('output') && (
          <span onClick={executeUntilComponent} className="inline-flex items-center justify-center cursor-pointer group">
            <playCircleIcon.react className="h-3 w-3 group-hover:text-primary" />
          </span>
        )}
      </div>
      <ConfigModal modal2Open={modal2Open} setModal2Open={setModal2Open} name={name} nodeId={nodeId} form={form} data={data} context={context} componentService={componentService} manager={manager} commands={commands} handleChange={handleChange} advanced />
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

        let rdm = '';

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
              <Form.Item label={field.label} className="nodrag"  {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <Input  
                    id={field.id}
                    size={advanced ? "middle" : "small"}
                    name={field.id} 
                    placeholder={field.placeholder} 
                    onChange={(e: any) => handleChange(e.target.value, field.id)}
                    value={value}
                    autoComplete="off"
                  />
              </Form.Item>
            );
          case "file":
            return (
                <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                  <Space.Compact style={{ width: '100%' }}>
                  <Input  
                    id={field.id}
                    size={advanced ? "middle" : "small"}
                    name={field.id} 
                    placeholder={field.placeholder} 
                    onChange={(e: any) => handleChange(e.target.value, field.id)}
                    value={value}
                    {...(isInvalid ? { status: "warning" } : {})}
                    />
                  <Button type="primary" size={advanced ? "middle" : "small"} onClick={async () => {
                      // TODO, there is something wrong here
                      const workspacePath: string = PathExt.resolve(
                        '/',
                        PathExt.dirname(context.path)
                      );
                      const res = await showBrowseFileDialog(
                        manager,
                        {
                          multiselect: false,
                          includeDir: true,
                          rootPath: PathExt.dirname(context.path),
                          filter: (model: any): boolean => {
                            return model.path !== context.path;
                          }
                        });
                      handleChange(res.value[0].path, field.id);
                    }}><SearchOutlined /></Button>
                   </Space.Compact>
              </Form.Item>
            );
          case "column":
            return (
              <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <SelectColumns field={field} handleChange={handleChange} defaultValue={value} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced}/>
            </Form.Item>
            );
            case "selectCustomizable":
              return (
                  <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                    <SelectCustomizable field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced}/>
                  </Form.Item>
              );
              case "selectTokenization":
                return (
                    <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                      <SelectTokenization field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced}/>
                    </Form.Item>
                );
                case "select":
                  return (
                      <Form.Item label={field.label} className="nodrag" {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                        <SelectRegular field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced}/>
                      </Form.Item>
                  );
          case "textarea":
            return (
              <div key={index} className="col-span-2">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <textarea
                  id={field.id}
                  name={field.id}
                  onChange={(e) => handleChange(e.target.value, field.id)}
                  value={value}
                  className="nodrag mt-2 w-full rounded-sm border-gray-200 align-top shadow-sm sm:text-xs text-sm "
                  placeholder={field.placeholder}
                />
              </div>
            );
          case "boolean":
            return (
            <Form.Item 
              label={field.label} 
              {...(field.required ? { required: field.required } : {})}
              {...(field.tooltip ? { tooltip: field.tooltip } : {})}
            >
              <Switch
                onChange={(e: any) => handleChange(e.target.checked, field.id)}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                defaultChecked={value === true} // Set defaultChecked based on field.value
              />
            </Form.Item>
            );
          case "keyvalue":
            return (
              <div key={index} className="col-span-2">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <KeyValueForm field={field} handleChange={handleChange} initialValues={values} />
              </div>
            );
          case "valuesList":
            return (
              <div key={index} className="col-span-2">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <ValuesListForm field={field} handleChange={handleChange} initialValues={values} />
              </div>
            );
          case "quantity":
            return (
              <div className="col-span-1">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <input
                  id={field.id}
                  name={field.id}
                  onChange={(e) => handleChange(e.target.value, field.id)}
                  value={value}
                  placeholder={field.placeholder}
                  inputMode="numeric"
                  type="number"
                  className="nodrag mt-1 sm:h-6 h-7 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs text-sm"
                />

              </div>
            );
            case "transferData":
              return (
                <Form.Item label={field.label} {...(field.required ? { required: field.required } : {})} {...(field.tooltip ? { tooltip: field.tooltip } : {})}>
                <TransferData field={field} handleChange={handleChange} defaultValue={value} context={context} componentService={componentService} commands={commands} nodeId={nodeId} inDialog={advanced}/>
              </Form.Item>
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
  modal2Open,
  setModal2Open
}: ConfigModalProps) {
  return (
      <>
        <Modal
          title={name}
          centered
          open={modal2Open}
          onOk={() => setModal2Open(false)}
          onCancel={() => setModal2Open(false)}
          width={800}
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
  label: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface FieldDescriptor {
  type: 'file' | 'column' | 'column' | 'keyvalue' | 'valuesList' | 'input' | 'select' | 'textarea' | 'radio' | 'datalist' | 'boolean' | 'quantity' | 'selectCustomizable' | 'selectTokenization' | 'transferData';
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
  modal2Open: any;
  setModal2Open: any;
}