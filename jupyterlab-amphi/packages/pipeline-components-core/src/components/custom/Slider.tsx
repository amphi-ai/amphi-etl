import { ComponentItem, PipelineComponent, onChange, renderComponentUI, renderHandle, CodeTextarea, SelectColumns, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { KernelMessage } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';
import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';

import { Form, Table, ConfigProvider, Card, Input, Select, Row, Button, Typography, Modal, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi, NodeToolbar } from 'reactflow';
import { bracesIcon, settingsIcon, playCircleIcon } from '../../icons';

import { WidgetManager, WidgetRenderer } from '@jupyter-widgets/jupyterlab-manager';

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
        setModalOpen,
    }) => {
        const outputAreaRef = useRef(null);

        useEffect(() => {
            if (modalOpen && context.sessionContext) {
                const sessionContext = context.sessionContext;

                // Create an OutputAreaModel
                const model = new OutputAreaModel();

                // Initialize rendermime
                const rendermime = rendermimeRegistry || new RenderMimeRegistry();

                // Create a WidgetManager and link it to the session and rendermime
                const widgetManager = new WidgetManager(context.sessionContext, rendermime, {saveState: false});

                // Add the widget renderer to rendermime
                const outputArea = new OutputArea({
                    model: model,
                    rendermime: rendermimeRegistry || new RenderMimeRegistry(),
                });
                
                // Attach the OutputArea to the DOM
                if (outputAreaRef.current) {
                    outputAreaRef.current.appendChild(outputArea.node);
                }

                // Execute code to create and display the slider
                const code = `
from ipywidgets import widgets
slider = widgets.IntSlider(value=50, min=0, max=100, step=1, description='Test:')
display(slider)
            `;

                // Execute the code and display the output
                const future = sessionContext.session.kernel.requestExecute({ code });
                outputArea.future = future;

                future.done
                    .then((reply) => {
                        if (reply.content.status === 'ok') {
                            console.log('Slider widget created successfully');
                        } else {
                            console.error('Failed to create slider widget:', reply.content);
                        }
                    })
                    .catch((error) => {
                        console.error('Execution failed', error);
                    });

                // Cleanup function
                return () => {
                    outputArea.dispose();
                };
            }
        }, [modalOpen, context.sessionContext, rendermimeRegistry]);

        return (
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#5F9B97',
                    },
                }}
            >
                <Modal
                    title="Kernel Slider"
                    open={modalOpen}
                    onOk={() => setModalOpen(false)}
                    onCancel={() => setModalOpen(false)}
                    width={900}
                    footer={null}
                >
                    <div ref={outputAreaRef}>
                        {/* This div will contain the output from the kernel, including the slider */}
                    </div>
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
