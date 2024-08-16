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
        const [widgetHtml, setWidgetHtml] = useState<string | null>(null);
        const widgetContainerRef = useRef<HTMLDivElement>(null);

        console.log("context %o", context)

        useEffect(() => {
            if (modalOpen) {

                console.log("code")
                // Create and initialize the PyGWalker widget
                const code = `
                !pip install pygwalker --disable-pip-version-check
                import pygwalker as pyg
                import pandas as pd
                from IPython.display import display
                
                # Assuming 'df' is the input dataframe
                df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})  # Replace with actual input data
                w = pyg.walk(df, return_widget=True)
                display(w)
                `;

                console.log("try")

                try {
                    const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

                    console.log("future %o", future)

                    future.onReply = reply => {

                        if (reply.content.status === "ok") {
                            context.log("Response is OK")
                            const output = reply.content.data['text/html'];
                            if (output) {
                                setWidgetHtml(output);
                            }
                        } else {
                            context.log("Response is NOK")
                        }
                    };

                    future.onIOPub = msg => {
                        if (msg.header.msg_type === 'stream') {
                            // Handle stream messages if necessary
                        } else if (msg.header.msg_type === 'error') {
                            // Handle error messages
                            const errorMsg = msg as KernelMessage.IErrorMsg;
                            const errorOutput = errorMsg.content;

                            console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
                        }
                    };

                    future.onDone = () => {

                        context.log("Response is DONE")
                    };

                } catch (error) {
                    console.error(error);
                }
            }
        }, [modalOpen, context.kernel]);

        useEffect(() => {
            if (widgetHtml && widgetContainerRef.current) {
                widgetContainerRef.current.innerHTML = widgetHtml;
                // You might need to run any scripts that came with the widget HTML
                const scripts = widgetContainerRef.current.getElementsByTagName('script');
                Array.from(scripts).forEach(script => {
                    const newScript = document.createElement('script');
                    Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                    newScript.appendChild(document.createTextNode(script.innerHTML));
                    script.parentNode.replaceChild(newScript, script);
                });
            }
        }, [widgetHtml]);

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