import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useEffect, useState } from 'react';

import { PathExt } from '@jupyterlab/coreutils';

import { showBrowseFileDialog } from './BrowseFileDialog';
import { KeyValueForm } from './forms/keyValueForm';
import { SingleInputCreatableSelectForm } from './forms/singleInputCreatableSelectForm';
import { ValuesListForm } from './forms/valuesListForm';
import { crosshairIcon, playCircleIcon, searchIcon, settingsIcon, warningIcon } from './icons';

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
  manager,
  commands,
  handleChange,
}: FormComponentProps) => {


  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(prev => !prev);
  };

  const executeUntilComponent = () => {
    commands.execute('pipeline-editor:run-pipeline-until', { nodeId: nodeId, });
  };

  return (
    <div className={form.idPrefix}>
      {generateUIInputs({ name, nodeId, form, data, context, manager, commands, handleChange, advanced: false })}
      <div className="flex justify-center mt-1 pt-1.5 space-x-4">
        <span onClick={handleOpen}
          className="inline-flex items-center justify-center cursor-pointer group">
          <settingsIcon.react className="h-3 w-3 group-hover:text-primary" />
        </span>
        {!type.includes('output') && (
          <span onClick={executeUntilComponent} className="inline-flex items-center justify-center cursor-pointer group">
            <playCircleIcon.react className="h-3 w-3 group-hover:text-primary" />
          </span>
        )}
      </div>
      {isOpen && <ConfigModal onClose={handleClose} name={name} nodeId={nodeId} form={form} data={data} context={context} manager={manager} commands={commands} handleChange={handleChange} advanced />}
    </div>
  );
};

export const generateUIInputs = ({
  name,
  nodeId,
  form,
  data,
  context,
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
              <div className="col-span-1">
                <label className="component_label">{field.label}</label>
                <input
                  id={field.id}
                  name={field.id}
                  onChange={(e) => handleChange(e.target.value, field.id)}
                  value={value}
                  className="nodrag mt-1 sm:h-6 h-7 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs text-sm pl-1 pr-1"
                  placeholder={field.placeholder}
                  autoComplete="off"
                />
              </div>
            );
          case "file":
            return (
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <label className="component_label">{field.label}</label>
                  {isInvalid && (
                    <div className="form-indicator relative flex items-center">
                      <warningIcon.react className="w-3 h-3 text-yellow-500 cursor-default self-center" title={field.validationMessage} />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id={field.id}
                    name={field.id}
                    onChange={(e) => {
                      handleChange(e.target.value, field.id);
                    }}
                    value={value}
                    className="nodrag mt-1 sm:h-6 h-7 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs text-sm pl-1 pr-1 ${isInvalid ? 'outline outline-2 outline-yellow-500' : ''"
                    placeholder={field.placeholder}
                    required
                    autoComplete="off"
                  />
                  <button type="button"
                    onClick={async () => {
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
                    }}
                    className="nodrag flex flex-col justify-center items-center mt-1 w-7 sm:h-6 h-7 rounded-sm text-white shadow-sm sm:text-xs text-sm bg-gray-500"
                  >
                    <searchIcon.react className="" />
                  </button>
                </div>
              </div>
            );
          case "column":
            return (
              <div className="col-span-2">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <div className="flex items-center space-x-2">
                  <input
                    id={field.id}
                    name={field.id}
                    onChange={(e) => handleChange(e.target.value, field.id)}
                    value={value}
                    className="nodrag mt-1 sm:h-6 h-7 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs text-sm pl-1 pr-1"
                    placeholder={field.placeholder}
                    autoComplete="off"
                    required
                  />
                  <button type="button"
                    onClick={async () => {
                      // Run pipeline until previous node
                      // handleChange(res.value[0].path, field.id);
                      // TODO
                    }}
                    className="nodrag flex flex-col justify-center items-center mt-1 w-7 sm:h-6 h-7 rounded-sm bg-gray-500 text-white shadow-sm sm:text-xs text-sm"
                  >
                    <crosshairIcon.react className="" />
                  </button>
                </div>
              </div>
            );
          case "select":
            return (
              <div key={index} className="col-span-1">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <select
                  id={field.id}
                  className="nodrag mt-1 sm:h-6 h-7 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs text-sm pl-1 pr-1"
                  onChange={(e) => handleChange(e.target.value, field.id)}
                  value={value}
                >
                  {field.options.map((option: Option) => (
                    <option key={option.key} value={option.value} selected={option.selected}>
                      {option.text}
                    </option>
                  ))}
                </select>
              </div>
            );
          case "singleInputCreatableSelect":
            return (
              <div key={index} className="col-span-2">
                <label className="component_label">{field.label}</label>
                <SingleInputCreatableSelectForm field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced} creatable={true} />
              </div>
            );
          case "singleInputSelect":
            return (
              <div key={index} className="col-span-2">
                <label className="component_label">{field.label}</label>
                <SingleInputCreatableSelectForm field={field} handleChange={handleChange} defaultValue={value} inDialog={advanced} creatable={false} />
              </div>
            );
          case "datalist":
            rdm = Math.random().toString().slice(2);
            return (
              <div key={index} className="col-span-1">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    list={`${field.id}${rdm}`}
                    id={field.id}
                    className="keepDatalist nodrag w-full sm:h-6 h-7 rounded-sm border-gray-300 pe-10 text-gray-700 sm:text-xs text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 pl-1 pr-1"
                    onChange={(e) => handleChange(e.target.value, field.id)}
                    defaultValue={value}
                    autoComplete='off'
                    placeholder={field.placeholder}
                  />
                  <span className="absolute inset-y-0 end-0 flex w-4 items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-5 w-5 text-gray-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                      />
                    </svg>
                  </span>
                </div>
                <datalist className="nodrag" id={`${field.id}${rdm}`}>
                  {field.options.map((option: Option) => (
                    <option value={option.value} selected={option.selected}>
                      {option.text}
                    </option>
                  ))}
                </datalist>
              </div>
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
              <div key={index} className="col-span-1 block">
                <label className="component_label" htmlFor={field.id}>{field.label}</label>
                <label
                  htmlFor={field.id}
                  className="relative h-8 w-14 cursor-pointer rounded-full bg-gray-300 transition [-webkit-tap-highlight-color:_transparent] has-[:checked]:bg-green-500"
                >
                  <input
                    type="checkbox"
                    id={field.id}
                    name={field.id}
                    onChange={(e) => handleChange(e.target.checked, field.id)}
                    className="peer sr-only [&:checked_+_span_svg[data-checked-icon]]:block [&:checked_+_span_svg[data-unchecked-icon]]:hidden"
                    checked={value} // Adjusts based on value being a string or boolean
                  />
                  <span
                    className="absolute inset-y-0 start-0 z-10 m-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 transition-all peer-checked:start-6 peer-checked:text-green-600"
                  >
                    <svg
                      data-unchecked-icon
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>

                    <svg
                      data-checked-icon
                      xmlns="http://www.w3.org/2000/svg"
                      className="hidden h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span
                    className="absolute inset-0 rounded-full bg-grey-300 transition peer-checked:bg-green-500"
                  ></span>
                </label>
              </div>
            );
          case "radio":
            rdm = Math.random().toString().slice(2);
            return (
              <div key={index} className="col-span-2">
                <fieldset className="flex flex-wrap gap-3" >
                  <legend className="sr-only">{`sep${rdm}`}</legend>
                  <label className="component_label" htmlFor={`${field.id}${rdm}`}>{field.label}</label>
                  <div className="grid grid-cols-3 gap-2 w-full max-w-screen-sm">
                    {field.options.map((option: Option, index: number) => (
                      <div key={option.key}>
                        <input
                          type="radio"
                          name={`${field.id}${rdm}`} // Concatenated name
                          value={option.value}
                          id={`${option.key}-${rdm}`}
                          className="peer hidden h-5"
                          onChange={(e) => handleChange(e.target.value, field.id)}
                          checked={value === option.value}
                        />
                        <label
                          htmlFor={`${option.key}-${rdm}`}
                          className="flex cursor-pointer items-center justify-center rounded-sm bg-white px-2 py-1 sm:text-xs text-sm font-medium peer-checked:bg-gray-500 peer-checked:text-white" // Reduced padding and smaller text size
                        >
                          <p>{option.text}</p>
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
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
  manager,
  commands,
  handleChange,
  advanced,
  onClose
}: ConfigModalProps) {

  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div id="advanced-config-dialog" className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="w-full">
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        {name}
                      </Dialog.Title>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        {generateUIInputs({ name, nodeId, form, data, context, manager, commands, handleChange, advanced: true })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-grey-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">

                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary sm:ml-3 sm:w-auto"
                    onClick={handleClose} >
                    OK
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}


/*
class ConfigModalComponent extends React.Component<ConfigModalProps> {
  render() {
    // Destructure the props for easier access
    const { name, nodeId, form, data, context, manager, commands, handleChange, advanced } = this.props;
    
    // Here you will include your form elements
    return (
      <div className="mt-2 grid grid-cols-2 gap-4">
        {generateUIInputs({name, nodeId, form, data, context, manager, commands, handleChange, advanced})}
      </div>
    );
  }
}


export default function ConfigModal({
  name: any,
  nodeId,
  form,
  data,
  context,
  manager,
  commands,
  handleChange,
  advanced,
  onClose  
}):  {

  // Prepare a container for the React component
  const bodyElement = document.createElement('div');

  // Render the React component inside the container, passing the necessary props
  ReactDOM.render(
    <ConfigModalComponent
      name={name}
      nodeId={nodeId}
      form={form}
      data={data}
      context={context}
      manager={manager}
      commands={commands}
      handleChange={handleChange}
      advanced={advanced}
      onClose={onClose}
    />,
    bodyElement
  );

  // Create and configure the JupyterLab dialog
  const dialog = new Dialog({
    title: 'My React Form',
    body: new Widget({ node: bodyElement }), // Use the container as the dialog's body
    buttons: [Dialog.okButton({ label: 'Submit' })],
    focusNodeSelector: 'input, textarea, select', // Adjust if needed
  });

  // Finally, launch the dialog and return the promise it provides
  return dialog.launch();
}
*/

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
  manager: any;
  commands: any;
  // handleChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLDataListElement>, fieldId: string) => void;
  handleChange: any;
  advanced: boolean;
}

export interface Option {
  key: string;
  value: string;
  text: string;
  selected?: boolean;
}

export interface FieldDescriptor {
  type: 'file' | 'keyvalue' | 'valuesList' | 'input' | 'select' | 'textarea' | 'radio' | 'datalist' | 'boolean' | 'quantity' | 'column' | 'singleInputCreatableSelect' | 'singleInputSelect';
  label: string;
  id: string;
  placeholder?: string;
  options?: Option[];
  advanced?: boolean;
  validation?: string;
  validationMessage?: string;

}

interface ConfigModalProps {
  name: string;
  nodeId: string;
  form: object;
  data: object;
  context: any;
  manager: any
  commands: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  advanced: boolean;
  onClose: () => void;
}