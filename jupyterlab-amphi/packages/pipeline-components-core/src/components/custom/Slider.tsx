import { ComponentItem, PipelineComponent, onChange, renderComponentUI, renderHandle, CodeTextarea, SelectColumns, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { KernelMessage } from '@jupyterlab/services';

import { Form, Table, ConfigProvider, Card, Input, Select, Row, Button, Typography, Modal, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi, NodeToolbar } from 'reactflow';
import { bracesIcon, settingsIcon, playCircleIcon } from '../../icons';

import { WidgetManager } from '@jupyter-widgets/jupyterlab-manager';

export class Slider extends PipelineComponent<ComponentItem>() {

    public _name = "Slider";
    public _id = "slider";
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
        rendermimeRegistry,
        store,
        setNodes,
        handleChange,
        modalOpen,
        setModalOpen
    }) => {
        const widgetContainerRef = useRef<HTMLDivElement>(null);
        const [widgetManagerReady, setWidgetManagerReady] = useState(false);

        const widgetManagerRef = useRef<WidgetManager | null>(null);

        useEffect(() => {
            const initializeWidgetManager = async () => {
                await context.sessionContext.ready;
                const kernel = context.sessionContext.session?.kernel;
                if (!kernel) {
                    console.log("No kernel available yet");
                    return;
                }
                await kernel.ready;

                if (!widgetManagerRef.current && context.sessionContext) {
                    widgetManagerRef.current = new WidgetManager(
                        rendermimeRegistry,
                        context.sessionContext,
                        { saveState: false }
                    );
                    setWidgetManagerReady(true);
                }
            };
            initializeWidgetManager();
        }, [context.sessionContext.session?.kernel, rendermimeRegistry]);

        useEffect(() => {
            const executeCode = async () => {
                if (!widgetManagerReady) {
                    console.log("WidgetManager not ready yet");
                    return;
                }
                await context.sessionContext.ready;
                const kernel = context.sessionContext.session?.kernel;
                if (!kernel) {
                    console.log("No kernel available");
                    return;
                }
                await kernel.ready;

                if (modalOpen) {
                    const code = `
import pandas as pd
from ipywidgets import IntSlider
slider = IntSlider()
display(slider)
`;

                    try {
                        const future = kernel.requestExecute({ code: code });

                        future.onIOPub = async (msg) => {
                            if (msg.header.msg_type === 'display_data') {
                                const content = msg.content as KernelMessage.IDisplayDataMsg['content'];
                                if (content.data['application/vnd.jupyter.widget-view+json']) {
                                    const widgetData = content.data['application/vnd.jupyter.widget-view+json'] as any;
                                    const modelId = widgetData.model_id;
                                    await renderWidget(modelId);
                                }
                            } else if (msg.header.msg_type === 'error') {
                                console.error(`Kernel Error: ${msg.content.ename}: ${msg.content.evalue}`);
                            }
                        };
                    } catch (error) {
                        console.error("Error executing code:", error);
                    }
                }
            };

            executeCode();
        }, [modalOpen, widgetManagerReady]);

        const renderWidget = async (modelId) => {
            if (!widgetManagerRef.current) {
                console.error('WidgetManager not available');
                return;
            }

            try {
                const model = await widgetManagerRef.current.get_model(modelId);
                if (!model) {
                    console.error('Model not found');
                    return;
                }

                const view = await widgetManagerRef.current.create_view(model, {});
                await widgetManagerRef.current.display_view(undefined, view, { el: widgetContainerRef.current });
            } catch (error) {
                console.error('Error rendering widget:', error);
            }
        };

        return (
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#5F9B97',
                    },
                }}
            >
                <Modal
                    title="Slider"
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

    public UIComponent({ id, data, context, componentService, manager, commands, rendermimeRegistry, settings }) {

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
            type: Slider.Type,
            Handle: Handle,
            Position: Position,
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
                    name: Slider.Name,
                    ConfigForm: Slider.ConfigForm({
                        nodeId: id,
                        data,
                        context,
                        componentService,
                        manager,
                        commands,
                        rendermimeRegistry,
                        store,
                        setNodes,
                        handleChange,
                        modalOpen,
                        setModalOpen
                    }),
                    Icon: Slider.Icon,
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
                        {(Slider.Type.includes('input') || Slider.Type.includes('processor') || Slider.Type.includes('output')) && (
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
