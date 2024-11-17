// ConfigForm.tsx

// Import necessary hooks and other dependencies
import { LabIcon } from '@jupyterlab/ui-components';
import { xIcon } from './icons';
import React, { useMemo, useState } from 'react';
import { QuestionCircleOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useCallback, useEffect } from 'react';

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
    case "ibis_df_input":
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
    case "ibis_df_output":
    case "pandas_df_output":
    case "documents_output":
      return (
        <LimitedInputHandle type="target" position={Position.Left} isConnectable={1} className="handle-left" id="in" />
      );
    case "ibis_df_processor":
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
    case 'ibis_df_multi_processor':
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
    case "ibis_df_double_processor":
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

const MemoizedComponentUI = React.memo(
  ({
    id,
    data,
    context,
    manager,
    commands,
    name,
    ConfigForm,
    configFormProps,
    Icon,
    showContent,
    handle,
    deleteNode,
    setViewport,
    handleChange,
    isSelected
  }: UIComponentProps) => {
    // Track form values and updates
    const [formState, setFormState] = useState(data);

    // Update formState when data changes
    useEffect(() => {
      setFormState(data);
    }, [data]);

    const modifier = useMemo(() => {
      const engine = data.backend?.engine?.toLowerCase() || '';
      if (engine.includes("snowflake")) return "--snowflake";
      if (engine.includes("duckdb")) return "--duckdb";
      if (engine.includes("postgres")) return "--postgres";
      return "--default";
    }, [data.backend?.engine]);

    const colorPrimary = useMemo(() => {
      switch (modifier) {
        case "--snowflake": return "#00ADEF";
        case "--duckdb": return "#45421D";
        case "--postgres": return "#336691";
        default: return "#5F9B97";
      }
    }, [modifier]);

    const isIbis = useMemo(() => {
      return ["--snowflake", "--duckdb", "--postgres"].includes(modifier);
    }, [modifier]);

    const handleDoubleClick = useCallback(() => {
      setViewport({ zoom: 1.1, duration: 500 });
    }, [setViewport]);

    const stopPropagation = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
    }, []);

    const disableDrag = useCallback((event: React.DragEvent) => {
      event.preventDefault();
    }, []);

    const [titleName, setTitleName] = useState(data?.customTitle || name);

    const onTitleChange = useCallback((newTitle: string) => {
      setTitleName(newTitle);
      handleChange(newTitle, 'customTitle');
    }, [handleChange]);

    // Modified ConfigForm props to include formState and update handler
    const enhancedConfigFormProps = {
      ...configFormProps,
      data: formState,
      onValueChange: (newValue: any, fieldId: string) => {
        setFormState(prev => {
          const newState = {
            ...prev,
            [fieldId]: newValue
          };
          handleChange(newValue, fieldId);
          return newState;
        });
      }
    };

    const theme = useMemo(() => ({
      token: {
        colorPrimary: colorPrimary,
      },
    }), [colorPrimary]);

    const componentClassName = useMemo(() => {
      return `component component${modifier} ${isIbis ? "ibis" : ""}`;
    }, [modifier, isIbis]);

    const { Text } = Typography;

    return (
      <ConfigProvider theme={theme}>
        <div className={componentClassName} onDoubleClick={handleDoubleClick}>
          <div className="component__header">
            <Text
              onDoubleClick={stopPropagation}
              onDragStart={disableDrag}
              editable={
                isSelected
                  ? {
                    onChange: onTitleChange,
                    tooltip: false,
                    icon: <EditOutlined style={{ color: '#5F9B97' }} />
                  }
                  : undefined
              }
              className="ant-select-sm"
            >
              {titleName}
            </Text>
            <Popconfirm
              title="Sure to delete?"
              placement="right"
              onConfirm={deleteNode}
              icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
            >
              <div className="deletebutton">
                <xIcon.react className="group-hover:text-primary" />
              </div>
            </Popconfirm>
          </div>
          <div className="component__body">
            <form>
              <div style={{ display: showContent ? 'block' : 'none' }}>
                <ConfigForm {...enhancedConfigFormProps} />
              </div>
              {!showContent && (
                <div className="placeholder">
                  <Icon.react
                    height="42px"
                    width="42px"
                    color={colorPrimary}
                    verticalAlign="middle"
                  />
                </div>
              )}
            </form>
          </div>
          {handle}
        </div>
      </ConfigProvider>
    );
  },
  (prevProps, nextProps) => {
    // Enhanced comparison function that includes form data changes
    return (
      prevProps.id === nextProps.id &&
      prevProps.showContent === nextProps.showContent &&
      prevProps.isSelected === nextProps.isSelected &&
      JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
      prevProps.name === nextProps.name &&
      prevProps.configFormProps.modalOpen === nextProps.configFormProps.modalOpen
    );
  }
);

// Export the function that creates the memoized component
export const renderComponentUI = (props: UIComponentProps) => {
  return <MemoizedComponentUI {...props} />;
};

export const createZoomSelector = () => {
  return (s: { transform: number[] }): boolean => s.transform[2] >= 0.75;
};

export interface UIComponentProps {
  id: string;
  data: any;
  context: any;
  manager: any;
  commands: any;
  name: string;
  ConfigForm: React.ComponentType<any>; // Update the type
  configFormProps: any; // Add configFormProps
  Icon: LabIcon;
  showContent: boolean;
  handle: React.JSX.Element;
  deleteNode: any;
  setViewport: any;
  handleChange: any;
  isSelected: boolean;
}

interface ICustomHandleProps {
  props: any;
  nodeId: any;
  nodeInternals: any;
  edges: any;
}