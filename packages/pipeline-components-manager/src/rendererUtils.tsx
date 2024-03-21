// ConfigForm.tsx

import React from 'react';
// Import necessary hooks and other dependencies
import { LabIcon } from '@jupyterlab/ui-components';
import { xIcon } from './icons';

interface IHandleProps {
  type: string;
  Handle: any;
  Position: any;
}

export const renderHandle: React.FC<IHandleProps> = ({ type, Handle, Position }) => {
  switch (type) {
    case "pandas_df_input":
      return (
        <Handle
          className="handle-right"
          type="source"
          position={Position.Right}
          id="out"
        />
      );

    case "pandas_df_output":
      return (
        <Handle
          className="handle-left"
          type="target"
          position={Position.Left}
          id="int"
        />
      );

    case "pandas_df_processor":
      return (
        <>
          <Handle
            className="handle-left"
            type="target"
            position={Position.Left}
            id="in"
          />
          <Handle
            className="handle-right"
            type="source"
            position={Position.Right}
            id="out"
          />
        </>
      );

    default:
      return null;
  }
};

export const renderComponentUI: React.FC<UIComponentProps> = ({ id, data, context, manager, commands, name, ConfigForm, Icon, showContent, handle, deleteNode, setViewport }) => {

  const handleDoubleClick = () => {
    // Example: Zoom in 1.2 times the current zoom level
    setViewport({ zoom: 1.2, duration: 500 });
  };

  return (
    <>
      <div className="component" onDoubleClick={handleDoubleClick}>
        <div className="component__header">
          {name}
          <div onClick={deleteNode} className='deletebutton'>
            <xIcon.react className="group-hover:text-primary" />
          </div>
        </div>
        <div className="component__body">
          <form>
            {showContent ? (
              ConfigForm
            ) : (
              <div className="placeholder">
                <Icon.react top="8px" height="32px" width="32px;" color="#5A8F7B" verticalAlign="middle" />
              </div>
            )}
          </form>
        </div>
        {handle}

      </div>
    </>
  );
};

export interface UIComponentProps {
  id: string;
  data: any; // Replace 'any' with a more specific type if possible
  context: any;
  manager: any; // Replace 'any' with a more specific type if possible
  commands: any;
  name: string;
  ConfigForm: any;
  Icon: LabIcon;
  showContent: boolean;
  handle: React.JSX.Element;
  deleteNode: any;
  setViewport: any;
};