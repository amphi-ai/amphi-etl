import { ComponentItem, PipelineComponent, onChange, renderComponentUI, renderHandle, CodeTextarea, SelectColumns, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { KernelMessage } from '@jupyterlab/services';

import { Form, Table, ConfigProvider, Card, Input, Select, Row, Button, Typography, Modal, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi, NodeToolbar } from 'reactflow';
import { bracesIcon, settingsIcon, playCircleIcon } from '../../icons';


export class PyGWalker extends PipelineComponent<ComponentItem>() {

    public _name = "PyGWalker";
    public _id = "pygWalker";
    public _type = "pandas_df_processor";
    public _category = "transform";
    public _description = "";
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
        const widgetContainerRef = useRef<HTMLDivElement>(null);
        const [widgetView, setWidgetView] = useState(null);
    
        useEffect(() => {
            if (modalOpen && context.sessionContext.session.kernel) {
                const code = `
!pip install pygwalker
import pygwalker as pyg
import pandas as pd
    
df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
w = pyg.walk(df, return_widget=True)
display(w)
                `;
    
                try {
                    const future = context.sessionContext.session.kernel.requestExecute({ code: code });
    
                    future.onIOPub = (msg) => {
                        if (msg.header.msg_type === 'display_data') {
                            const content = msg.content;
                            if (content.data['application/vnd.jupyter.widget-view+json']) {
                                const widgetData = content.data['application/vnd.jupyter.widget-view+json'];
                                const modelId = widgetData.model_id;
                                renderWidget(modelId);
                            }
                        } else if (msg.header.msg_type === 'error') {
                            console.error(`Kernel Error: ${msg.content.ename}: ${msg.content.evalue}`);
                        }
                    };
    
                } catch (error) {
                    console.error("Error executing code:", error);
                }
            }
        }, [modalOpen, context.sessionContext.session.kernel]);
    
        const renderWidget = async (modelId) => {
            if (!context.rendermime) {
                console.error('Rendermime not available');
                return;
            }
    
            try {
                const model = await context.sessionContext.sessionManager.widgetManager.get_model(modelId);
                if (!model) {
                    console.error('Model not found');
                    return;
                }
    
                const renderer = context.rendermime.createRenderer('application/vnd.jupyter.widget-view+json');
                const widgetView = await renderer.renderModel({
                    data: {'application/vnd.jupyter.widget-view+json': {model_id: modelId}},
                    metadata: {}
                });
    
                setWidgetView(widgetView);
            } catch (error) {
                console.error('Error rendering widget:', error);
            }
        };
    
        useEffect(() => {
            if (widgetView && widgetContainerRef.current) {
                widgetContainerRef.current.innerHTML = '';
                widgetContainerRef.current.appendChild(widgetView.node);
            }
        }, [widgetView]);
    
        return (
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#5F9B97',
                    },
                }}
            >
                <Modal
                    title="PyGWalker"
                    open={modalOpen}
                    onOk={() => setModalOpen(false)}
                    onCancel={() => setModalOpen(false)}
                    width={900}
                    footer={(_, { OkBtn }) => (
                        <>
                            <OkBtn />
                        </>
                    )}
                >
                    <div ref={widgetContainerRef} />
                </Modal>
            </ConfigProvider>
        );
    };

    public UIComponent({ id, data, context, componentService, manager, commands, settings }) {

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
            type: PyGWalker.Type,
            Handle: Handle, // Make sure Handle is imported or defined
            Position: Position, // Make sure Position is imported or defined
            internals: internals
        });

        const handleChange = useCallback((evtTargetValue: any, field: string) => {

            onChange({ evtTargetValue, field, nodeId, store, setNodes });
        }, [nodeId, store, setNodes]);

        // Selector to determine if the node is selected
        const isSelected = useStore((state) => !!state.nodeInternals.get(id)?.selected);

        const executeUntilComponent = () => {
            commands.execute('pipeline-editor:run-pipeline-until', { nodeId: nodeId, context: context });
            handleChange(Date.now(), 'lastExecuted');
        };

        const [modalOpen, setModalOpen] = useState(false);

        let enableExecution = settings.get('enableExecution').composite as boolean;

        return (
            <>
                {renderComponentUI({
                    id: id,
                    data: data,
                    context: context,
                    manager: manager,
                    commands: commands,
                    name: PyGWalker.Name,
                    ConfigForm: PyGWalker.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes, handleChange, modalOpen, setModalOpen }),
                    Icon: PyGWalker.Icon,
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
                        {(PyGWalker.Type.includes('input') || PyGWalker.Type.includes('processor') || PyGWalker.Type.includes('output')) && (
                            <button onClick={() => executeUntilComponent()} disabled={!enableExecution}
                                style={{ opacity: enableExecution ? 1 : 0.5, cursor: enableExecution ? 'pointer' : 'not-allowed' }}>
                                <playCircleIcon.react />
                            </button>
                        )}
                    </NodeToolbar>
                )}
            </>
        );
    }

    public provideImports({ config }): string[] {
        return ["import pandas as pd"];
    }


    public provideFunctions({ config }): string[] {
        let functions = [];

        return functions;
    }

    public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
        return "";
    }

}