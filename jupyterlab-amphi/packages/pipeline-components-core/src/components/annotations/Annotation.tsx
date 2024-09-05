import React, { useCallback, useState, useEffect } from 'react';
import { type NodeProps, useReactFlow, useStore, useStoreApi, NodeResizer, NodeToolbar, Position, useKeyPress } from 'reactflow';
import { Remark } from "react-remark";
import type { GetRef, InputRef, ColorPickerProps, GetProp } from 'antd';
import { CodeTextarea } from '@amphi/pipeline-components-manager';

import { Form, ConfigProvider, ColorPicker, Row, Col, Slider, Modal, InputNumber } from 'antd';

import { ComponentItem, PipelineComponent, InputFile, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { annotationIcon } from '../../icons';

import { bracesIcon, settingsIcon } from '../../icons';
import { generate, green, presetPalettes, red } from '@ant-design/colors';

type Color = Extract<GetProp<ColorPickerProps, 'value'>, string | { cleared: any }>;
type Format = GetProp<ColorPickerProps, 'format'>;

export type AnnotationData = {
  content: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
};

export class Annotation extends PipelineComponent<ComponentItem>() {

  public _name = "Annotation";
  public _id = "annotation";
  public _type = "annotation";
  public _icon = annotationIcon;
  public _category = "documentation";
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

    const handleColorChange = useCallback((colorObj, setColor, field) => {
      const colorValue = colorObj.toRgbString();
      setColor(colorValue);
      handleChange(colorValue, field);
    }, [handleChange]);

    const handleBorderRadiusChange = useCallback((newValue: number) => {
      setBorderRadius(newValue);
      handleChange(newValue, 'borderRadius');
    }, [handleChange]);

    const handleBorderWidthChange = useCallback((newValue: number) => {
      setBorderWidth(newValue);
      handleChange(newValue, 'borderWidth');
    }, [handleChange]);

    const [content, setContent] = useState<string>(data.content || '# Annotation');
    const [backgroundColor, setBackgroundColor] = useState<Color>(data.backgroundColor || '#fff');
    const [borderColor, setBorderColor] = useState<Color>(data.borderColor || '#42766D');
    const [borderWidth, setBorderWidth] = useState<number>(data.borderWidth || 5);
    const [textColor, setTextColor] = useState<Color>(data.textColor || '#000');
    const [borderRadius, setBorderRadius] = useState<number>(data.borderRadius || 0);

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
            <Form layout="vertical">
              <Form.Item label="Background Color">
                <ColorPicker
                  allowClear
                  placement={"topRight"}
                  defaultFormat={"hex"}
                  format={"hex"}
                  showText
                  value={backgroundColor}
                  onChange={(color) => handleColorChange(color, setBackgroundColor, 'backgroundColor')}
                />
              </Form.Item>
              <Form.Item label="Border Color">
                <ColorPicker
                  placement={"topRight"}
                  defaultFormat={"hex"}
                  format={"hex"}
                  showText
                  value={borderColor}
                  onChange={(color) => handleColorChange(color, setBorderColor, 'borderColor')}
                />
              </Form.Item>
              <Form.Item label="Border Width">
                <Row>
                  <Col span={12}>
                    <Slider
                      min={0}
                      max={20}
                      onChange={handleBorderWidthChange}
                      value={typeof borderWidth === 'number' ? borderWidth : 5}
                    />
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      min={0}
                      max={20}
                      style={{ margin: '0 16px' }}
                      value={borderWidth}
                      onChange={handleBorderWidthChange}
                    />
                  </Col>
                </Row>
              </Form.Item>
              <Form.Item label="Text Color">
                <ColorPicker
                  placement={"topRight"}
                  defaultFormat={"hex"}
                  format={"hex"}
                  showText
                  value={textColor}
                  onChange={(color) => handleColorChange(color, setTextColor, 'textColor')}
                />
              </Form.Item>
              <Form.Item label="Border Radius">
                <Row>
                  <Col span={12}>
                    <Slider
                      min={0}
                      max={50}
                      onChange={handleBorderRadiusChange}
                      value={typeof borderRadius === 'number' ? borderRadius : 0}
                    />
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      min={0}
                      max={50}
                      style={{ margin: '0 16px' }}
                      value={borderRadius}
                      onChange={handleBorderRadiusChange}
                    />
                  </Col>
                </Row>
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
    const { setNodes } = useReactFlow();
    const store = useStoreApi();
    const isSelected = useStore((state) => !!state.nodeInternals.get(id)?.selected);

    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId: id, store, setNodes });
    }, [id, store, setNodes]);

    const shiftKeyPressed = useKeyPress('Shift');

    const [modalOpen, setModalOpen] = useState(false);

    const backgroundColorStyle = data.backgroundColor || 'transparent';
    const borderColorStyle = data.borderColor || '#42766D';
    const borderWidthStyle = data.borderWidth || 2;
    const textColorStyle = data.textColor || 'rgba(0, 0, 0, 1)';
    const borderRadiusStyle = data.borderRadius || 0;

    return (
      <>
        <div style={{
          height: '100%',
          backgroundColor: backgroundColorStyle,
          paddingLeft: '40px',
          paddingRight: '40px',
          paddingTop: '20px',
          paddingBottom: '20px',
          position: 'relative',
          zIndex: 0,
          borderRadius: `${borderRadiusStyle}px`,
          border: `${borderWidthStyle}px solid ${borderColorStyle}`, // Apply the border style
        }}>
          <NodeResizer
            keepAspectRatio={shiftKeyPressed}
            isVisible={isSelected}
            color={"#000000"}
            minWidth={50}
            minHeight={50}
          />
          <div style={{ color: textColorStyle }}>
            <Remark>{data.content}</Remark>
          </div>
        
        <NodeToolbar isVisible={isSelected} position={Position.Bottom}>
          <button onClick={() => setModalOpen(true)}><settingsIcon.react /></button>
        </NodeToolbar></div>

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
