import React, { useCallback, useState, useEffect } from 'react';
import { type NodeProps, useReactFlow, useStore, useStoreApi, NodeResizer, NodeToolbar, Position, useKeyPress } from 'reactflow';
import { Remark } from "react-remark";
import type { GetRef, InputRef, ColorPickerProps, GetProp } from 'antd';
import { CodeTextarea } from '@amphi/pipeline-components-manager';

import { Form, Table, ConfigProvider, ColorPicker, theme, Space, Button, Modal, Popconfirm } from 'antd';

import { ComponentItem, PipelineComponent, InputFile, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { annotationIcon } from '../../icons';

import { bracesIcon, settingsIcon } from '../../icons';
import { generate, green, presetPalettes, red } from '@ant-design/colors';



type Color = Extract<GetProp<ColorPickerProps, 'value'>, string | { cleared: any }>;
type Format = GetProp<ColorPickerProps, 'format'>;



export type AnnotationData = {
  content: string;
  backgroundColor?: string;
};


export class Annotation extends PipelineComponent<ComponentItem>() {

  public _name = "Annotation";
  public _id = "annotation";
  public _type = "annotation";
  public _icon = annotationIcon;
  public _category = "other";
  public _description = "Annotation";
  public _default = { content: "# Annotation" };

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

    const [content, setContent] = useState<Color>(data.content || '# Annotation');

    useEffect(() => {
      setContent(data.content || '# Annotation');
    }, [data.content]);

    useEffect(() => {
      handleChange(content, 'content');
    }, [content]);

    return (
      <>
        <ConfigProvider
          theme={{
            token: {
              // Seed Token
              colorPrimary: '#5F9B97',
            },
          }}
        >
          <Modal
            title={this.Name}
            centered
            open={modalOpen}
            onOk={() => setModalOpen(false)}
            onCancel={() => setModalOpen(false)}
            width={800}
            footer={(_, { OkBtn }) => (
              <>
                <OkBtn />
              </>
            )}
          >
            <Form
              layout="vertical" >
              <Form.Item label="Background Color">
                <ColorPicker
                  allowClear
                  placement={"topRight"}
                  defaultFormat={"hex"}
                  format={"hex"}
                  showText
                  value={data.backgroundColor || "#fff"} // default or existing color
                  onChange={(color) => {
                    handleChange(color, 'backgroundColor'); // Save the color value
                  }}
                />
              </Form.Item>
              <Form.Item label="Text Color">
                <ColorPicker
                  placement={"topRight"}
                  defaultFormat={"hex"}
                  format={"hex"}
                  showText
                  value={data.textColor || "#000"} // default or existing color
                  onChange={(color) => {
                    handleChange(color, 'textColor'); // Save the color value
                  }}
                />
              </Form.Item>
              <Form.Item label="Markdown Content">
                <CodeTextarea field={{
                  type: "code", label: "Markdown Content", id: "content", placeholder: "Markdown",
                }} handleChange={(value) => {
                  handleChange(value, 'content');
                  setContent(value);
                }} advanced={false} value={content} />
              </Form.Item>
            </Form>
          </Modal>
        </ConfigProvider>
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands, settings }) {
    const { setNodes, deleteElements, setViewport } = useReactFlow();
    const store = useStoreApi();
    // Selector to determine if the node is selected
    const isSelected = useStore((state) => !!state.nodeInternals.get(id)?.selected);


    const selector = (s) => ({
      nodeInternals: s.nodeInternals,
      edges: s.edges,
    });

    const { nodeInternals, edges } = useStore(selector);
    const nodeId = id;

    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    const shiftKeyPressed = useKeyPress('Shift');

    const [modalOpen, setModalOpen] = useState(false);

    const backgroundColorStyle = data.backgroundColor?.cleared
      ? 'transparent'
      : data.backgroundColor
        ? `rgba(${data.backgroundColor.metaColor?.r || 0}, ${data.backgroundColor.metaColor?.g || 0}, ${data.backgroundColor.metaColor?.b || 0}, ${data.backgroundColor.metaColor?.roundA || 1})`
        : 'transparent';

    const textColorStyle = data.textColor?.cleared
      ? 'transparent'
      : data.textColor
        ? `rgba(${data.textColor.metaColor?.r || 0}, ${data.textColor.metaColor?.g || 0}, ${data.textColor.metaColor?.b || 0}, ${data.textColor.metaColor?.roundA || 1})`
        : '#000';

    return (
      <>
        <NodeResizer
          keepAspectRatio={shiftKeyPressed}
          isVisible={isSelected}
          color={"#000000"}
          minWidth={50}
          minHeight={50}
        />
        <div style={{ height: '100%', color: textColorStyle, backgroundColor: backgroundColorStyle, paddingRight: '20px', paddingLeft: '20px', zIndex: -1 }}>
          <Remark
            rehypePlugins={[
              function noRefCheck() { },
              function noRefCheck() { }
            ]}
            remarkToRehypeOptions={{
              allowDangerousHtml: true
            }}
          >
            {data.content}
          </Remark>
        </div>
        <NodeToolbar isVisible={isSelected} position={Position.Bottom}>
          <button onClick={() => setModalOpen(true)}><settingsIcon.react /></button>
        </NodeToolbar>

        {/* Render ConfigForm */}
        <Annotation.ConfigForm
          nodeId={id}
          data={data}
          context={context}
          componentService={manager.componentService}
          manager={manager}
          commands={commands}
          store={store}
          setNodes={setNodes}
          handleChange={handleChange}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
        />

      </>
    );
  }
}
