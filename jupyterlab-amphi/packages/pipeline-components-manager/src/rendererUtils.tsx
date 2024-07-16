// ConfigForm.tsx

// Import necessary hooks and other dependencies
import { LabIcon } from '@jupyterlab/ui-components';
import { xIcon } from './icons';
import React, { useMemo, useState } from 'react';
import { QuestionCircleOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';

import { getConnectedEdges, Handle, useNodeId, useStore, NodeToolbar } from 'reactflow';
import { Popconfirm, Typography, ConfigProvider } from 'antd';

interface IHandleProps {
  type: string;
  Handle: any;
  Position: any;
  internals: any;
}

export const renderHandle: React.FC<IHandleProps> = ({ type, Handle, Position, internals }) => {

  const LimitedInputHandle = (props) => {
    const { nodeInternals, edges, nodeId, componentService } = internals;
    const isHandleConnectable = useMemo(() => {

      if (typeof props.isConnectable === 'function') {
        const node = nodeInternals.get(nodeId);
        const connectedEdges = getConnectedEdges([node], edges).filter(edge => edge.target === nodeId && props.id === edge.targetHandle); // only count input edges
        return props.isConnectable({ node, connectedEdges });
      }
      if (typeof props.isConnectable === 'number') {
        const node = nodeInternals.get(nodeId);
        const connectedEdges = getConnectedEdges([node], edges).filter(edge => edge.target === nodeId && props.id === edge.targetHandle); // only count input edges
        return connectedEdges.length < props.isConnectable;
      }
      return props.isConnectable;
    }, [nodeInternals, edges, nodeId, props.isConnectable, props.id]);

    return <Handle {...props} isConnectable={isHandleConnectable} />;
  };

  switch (type) {
    case "pandas_df_input":
    case "documents_input":
      return (
        <Handle
          className="handle-right"
          type="source"
          position={Position.Right}
          id="out"
        />
      );
    case "pandas_df_output":
    case "documents_output":
      return (
        <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in" />
      );
    case "pandas_df_processor":
    case 'pandas_df_to_documents_processor':
    case 'documents_processor':
      return (
        <>
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in" />
          <Handle
            className="handle-right"
            type="source"
            position={Position.Right}
            id="out"
          />
        </>
      );
    case 'pandas_df_multi_processor':
      return (
        <>
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={true} className="handle-left" id="in" />
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
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in1" />
          <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="second-handle-left" id="in2" />
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

export const renderComponentUI: React.FC<UIComponentProps> = ({ id, data, context, manager, commands, name, ConfigForm, Icon, showContent, handle, deleteNode, setViewport, handleChange, isSelected }) => {

  const handleDoubleClick = () => {
    // Example: Zoom in 1.2 times the current zoom level
    setViewport({ zoom: 1.1, duration: 500 });
  };

  const { Text } = Typography;
  const initialTitleName = data?.customTitle || name;
  const [titleName, setTitleName] = useState(initialTitleName);

  const onTitleChange = (newTitle: string) => {
    setTitleName(newTitle);
    handleChange(newTitle, 'customTitle');
  };

  const stopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  // Disable dragging
  const disableDrag = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <div className="component" onDoubleClick={handleDoubleClick}>
        <div className="component__header">
          <Text
            onDoubleClick={stopPropagation}
            onDragStart={disableDrag}
            editable={isSelected ? { onChange: onTitleChange, tooltip: false, icon: <EditOutlined style={{ color: '#5F9B97' }} /> } : undefined}
            className='ant-select-sm'
          >
            {titleName}
          </Text>
          <Popconfirm title="Sure to delete?" placement="right" onConfirm={() => deleteNode()} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
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

export const createZoomSelector = () => {
  return (s: { transform: number[] }): boolean => s.transform[2] >= 0.75;
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
  handleChange: any;
  isSelected: boolean;
};

interface ICustomHandleProps {
  props: any;
  nodeId: any;
  nodeInternals: any;
  edges: any;
}
