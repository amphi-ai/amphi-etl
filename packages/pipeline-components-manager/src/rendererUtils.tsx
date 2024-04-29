// ConfigForm.tsx

// Import necessary hooks and other dependencies
import { LabIcon } from '@jupyterlab/ui-components';
import { xIcon } from './icons';
import React, { useMemo } from 'react';
import { getConnectedEdges, Handle, useNodeId, useStore } from 'reactflow';
import { Popconfirm } from 'antd';

interface IHandleProps {
  type: string;
  Handle: any;
  Position: any;
  internals: any;
}

export const renderHandle: React.FC<IHandleProps> = ({ type, Handle, Position, internals }) => {

  const LimitedInputHandle = (props) => {
    const { nodeInternals, edges, nodeId } = internals;
    const isHandleConnectable = useMemo(() => {
      if (typeof props.isConnectable === 'function') {
        const node = nodeInternals.get(nodeId);
        const connectedEdges = getConnectedEdges([node], edges).filter(edge => edge.target === nodeId && props.id === edge.targetHandle); // only count input edges
        return props.isConnectable({ node, connectedEdges });
      }
      if (typeof props.isConnectable === 'number') {
        const node = nodeInternals.get(nodeId);
        const connectedEdges = getConnectedEdges([node], edges).filter(edge => edge.target === nodeId && props.id === edge.targetHandle) ; // only count input edges
        return connectedEdges.length < props.isConnectable;
      }
      return props.isConnectable;
    }, [nodeInternals, edges, nodeId, props.isConnectable, props.id]);
  
    return <Handle {...props} isConnectable={isHandleConnectable} />;
  };
  
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
        <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in" />
      );
    case "pandas_df_processor":

      return (
        <>
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in"/>
          <Handle
            className="handle-right"
            type="source"
            position={Position.Right}
            id="out"
          />
        </>
      );
      case "pandas_df_double_processor":
      return (
        <>
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in1"/>
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="second-handle-left" id="in2"/>
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
          <Popconfirm title="Sure to delete?" onConfirm={() => deleteNode()}>
            <div className='deletebutton'>
              <xIcon.react className="group-hover:text-primary" />
            </div>
          </Popconfirm>
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

interface ICustomHandleProps {
  props: any;
  nodeId: any;
  nodeInternals: any;
  edges: any;
}
