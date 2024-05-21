import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import {  Form, Table, ConfigProvider, Divider, Input, Select, Space, Button, Typography, Modal, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { mergeIcon, settingsIcon } from '../icons';


export class EnvFile extends PipelineComponent<ComponentItem>() {

  public _name = "Env. File";
  public _id = "envFile";
  public _type = "env_file";
  public _category = "other";
  public _icon = mergeIcon;
  public _default = { filePath: ".env" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "info",
        label: "Instructions",
        id: "instructions",
        text: "Import an environment file and use the environment variable in components by typing {.",
      },
      {
        type: "file",
        label: "Environment File",
        id: "filePath",
        placeholder: ".env"
      }
    ],
  };

  public static ConfigForm = ({ 
    nodeId, 
    data,
    context,
    componentService,
    manager,
    commands,
    store,
    setNodes
  }) => {
    const defaultConfig = this.Default; // Define your default config

    const handleSetDefaultConfig = useCallback(() => {
      setDefaultConfig({ nodeId, store, setNodes, defaultConfig });
    }, [nodeId, store, setNodes, defaultConfig]);
  
    useEffect(() => {
      handleSetDefaultConfig();
    }, [handleSetDefaultConfig]);
  
    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    return (
      <>
        {generateUIFormComponent({
          nodeId: nodeId,
          type: this.Type,
          name: this.Name,
          form: this.Form,
          data: data,
          context: context,
          componentService: componentService,
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands }) {

  const { setNodes, deleteElements, setViewport } = useReactFlow();
  const store = useStoreApi();

  const deleteNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const zoomSelector = (s) => s.transform[2] >= 1;
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }
  
  const handleElement = React.createElement(renderHandle, {
    type: EnvFile.Type,
    Handle: Handle,
    Position: Position,
    internals: internals
  });
  
  return (
    <>
      {renderComponentUI({
        id: id,
        data: data,
        context: context,
        manager: manager,
        commands: commands,
        name: EnvFile.Name,
        ConfigForm: EnvFile.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: EnvFile.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["from python-dotenv import load_dotenv"];
  }

  public generateComponentCode({config}): string {

    let code = `
# Load environment variables from ${config.filePath}
load_dotenv(dotenv_path="${config.filePath}")
`;

    code += "\n";
    
    return code;
}



}