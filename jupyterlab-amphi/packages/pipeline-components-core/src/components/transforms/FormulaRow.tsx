import { ComponentItem, PipelineComponent, onChange, renderComponentUI, renderHandle, CodeTextarea, SelectColumns, SelectRegular, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import { Form, Table, ConfigProvider, Card, Input, Select, Row, Button, Typography, Modal, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi, NodeToolbar } from 'reactflow';
import { sumIcon, settingsIcon, playCircleIcon } from '../../icons';


export class FormulaRow extends PipelineComponent<ComponentItem>() {

    public _name = "Formula Row";
    public _id = "formulaRow";
    public _type = "pandas_df_processor";
    public _category = "transforms";
    public _description = "Use Formula Row to update existing columns or create new columns using expressions and functions.";
    public _icon = sumIcon;
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
        const [formulas, setFormulas] = useState(data.formulas || [{ columns: [], formula: '', type: 'expr' }]);

        useEffect(() => {
        }, [formulas]);

        const handleAddFormula = () => {
            setFormulas([...formulas, { columns: [], formula: '', type: 'expr' }]);
            handleChange(formulas, 'formulas');
        };

        const handleRemoveFormula = (index: number) => {
            const updatedFormulas = formulas.filter((_, i) => i !== index);


            setFormulas(updatedFormulas);
            handleChange(updatedFormulas, 'formulas');
        };

        const handleFormulaChange = (value: any, index: number, field: string) => {
            const updatedFormulas = [...formulas];
            updatedFormulas[index] = {
                ...updatedFormulas[index],
                [field]: value
            };
            setFormulas(updatedFormulas);
            handleChange(updatedFormulas, 'formulas');
        };

        return (
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#5F9B97',
                    },
                }}>
                <Modal
                    title="Formula Row"
                    open={modalOpen}
                    onOk={() => setModalOpen(false)}
                    onCancel={() => setModalOpen(false)}
                    width={900}
                    footer={(_, { OkBtn }) => (
                        <>
                            <OkBtn />
                        </>
                    )}>
                    <Form
                        labelCol={{ span: 6 }}
                        wrapperCol={{ span: 18 }}
                        name="dynamic_form_complex"
                        autoComplete="off"
                        initialValues={{ items: formulas }}>
                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <div style={{ display: 'flex', rowGap: 16, flexDirection: 'column' }}>
                                    {formulas.map((formula, index) => (

                                        <Card
                                            size="small"
                                            title={`Formula ${index + 1}`}
                                            key={`formula-${index}`}
                                            extra={
                                                <CloseOutlined
                                                    onClick={() => handleRemoveFormula(index)}
                                                />
                                            }>
                                            <Form.Item
                                                label="Columns"
                                                name={[index, 'columns']}
                                                key={`formula-columns-${index}`}
                                            >
                                                <SelectColumns
                                                    field={{
                                                        type: 'columns',
                                                        id: 'columns',
                                                        label: "Columns (Existing or new)",
                                                        placeholder: "Select columns",
                                                    }}
                                                    handleChange={(value) => handleFormulaChange(value, index, 'columns')}
                                                    defaultValues={formula.columns}
                                                    context={context}
                                                    commands={commands}
                                                    componentService={componentService}
                                                    nodeId={nodeId}
                                                    advanced={true}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                label="Formula Type"
                                                name={[index, 'type']}
                                                key={`formula-type-${index}`}
                                            >
                                                <SelectRegular
                                                    field={{
                                                        type: 'select',
                                                        id: 'type',
                                                        label: "Formula Type",
                                                        placeholder: "Select columns",
                                                        options: [
                                                            { value: "expr", label: "Python Expression", tooltip: "Combine variables and operators to compute a value for the selected column(s).\nExample: row['column1'].upper()" },
                                                            { value: "function", label: "Python Function", tooltip: "Apply a Python function to the selected column(s), with the row passed as a parameter." },
                                                            { value: "lambda", label: "Lambda Expression", tooltip: "Use a Python lambda expression, an anonymous function, to process the row and apply it to the selected column(s)." }
                                                        ],
                                                    }}
                                                    handleChange={(value) => handleFormulaChange(value, index, 'type')}
                                                    defaultValue={formula.type}
                                                    advanced={true}
                                                />

                                            </Form.Item>

                                            <Form.Item
                                                label="Python Code"
                                                name={[index, 'formula']}
                                                key={`formula-code-${index}`}
                                            >
                                                <CodeTextarea
                                                    field={{
                                                        type: "codeTextarea",
                                                        id: 'formula',
                                                        label: "Python Formula",
                                                        placeholder: "row['column1'] + row['column2']",
                                                        height: "80px",
                                                        mode: 'python'
                                                    }}
                                                    handleChange={(value) => handleFormulaChange(value, index, 'formula')}
                                                    value={formula.formula}
                                                    advanced={true}
                                                />
                                            </Form.Item>
                                        </Card>


                                    ))}
                                    <Button type="dashed" onClick={handleAddFormula} block>
                                        + Add formula
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                    </Form>
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
            type: FormulaRow.Type,
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
                    name: FormulaRow.Name,
                    ConfigForm: FormulaRow.ConfigForm, // Pass the component itself
                    configFormProps: { // Provide props separately
                        nodeId: id,
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
                    },
                    Icon: FormulaRow.Icon,
                    showContent: showContent,
                    handle: handleElement,
                    deleteNode: deleteNode,
                    setViewport: setViewport,
                    handleChange,
                    isSelected
                })}
                {(showContent || isSelected) && (
                    <NodeToolbar isVisible position={Position.Bottom}>
                        <button onClick={() => setModalOpen(true)}><settingsIcon.react /></button>
                        {(FormulaRow.Type.includes('input') || FormulaRow.Type.includes('processor') || FormulaRow.Type.includes('output')) && (
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
        return [];
    }


    public provideFunctions({ config }): string[] {
        let functions = [];
        config.formulas.forEach((formula, index) => {
            const functionName = `formula_${index + 1}`;
            const formulaCode = formula.formula.trim();
            const formulaType = formula.type;

            let code = '';

            if (formulaType === 'function') {
                // Python function, add it as is
                code = `
${formulaCode}
`;
            }

            functions.push(code);
        });
        return functions;
    }

    public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
        let code = `${outputName} = ${inputName}.copy()\n`;

        config.formulas.forEach((formula, index) => {
            const columns = formula.columns.map(column => {
                const columnName = column.value;
                const columnIsNamed = column.named;
                return columnIsNamed ? `'${columnName}'` : columnName;
            });

            const columnsStr = columns.join(', ');

            let applyFunction = '';

            if (formula.type === 'function') {
                // Extract function name using a regex
                const functionNameMatch = formula.formula.match(/def\s+(\w+)\s*\(/);
                const extractedFunctionName = functionNameMatch ? functionNameMatch[1] : `formula_${index + 1}`;

                applyFunction = extractedFunctionName;
            } else if (formula.type === 'lambda') {
                // Use lambda expression directly
                applyFunction = formula.formula.trim();
            } else if (formula.type === 'expr') {
                // Use Python expression directly inline
                applyFunction = `(lambda row: ${formula.formula.trim()})`;
            }

            if (columns.length > 1) {
                // Use .loc with applymap if more than one column is present
                code += `${outputName}.loc[:, [${columnsStr}]] = ${outputName}.loc[:, [${columnsStr}]].applymap(${applyFunction})\n`;
            } else {
                // Use apply if only one column
                code += `${outputName}[${columnsStr}] = ${outputName}.apply(${applyFunction}, axis=1)\n`;
            }
        });

        return code;
    }




}