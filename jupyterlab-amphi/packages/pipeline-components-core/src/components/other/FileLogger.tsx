import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filterIcon } from '../../icons';

export class FileLogger extends PipelineComponent<ComponentItem>() {

  public _name = "File Logger";
  public _id = "fileLogger";
  public _type = "logger";
  public _category = "other";
  public _icon = filterIcon;
  public _default = { filePath: "pipeline.log", logLevel: "INFO", logMessage: "An error occurred in the script:\n\n{error_message}" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "Log File Path",
        id: "filePath",
        placeholder: "pipeline.log"
      },
      {
        type: "select",
        label: "Log Level",
        id: "logLevel",
        placeholder: "default: ,",
        options: [
          { value: "DEBUG", label: "DEBUG" },
          { value: "INFO", label: "INFO" },
          { value: "WARNING", label: "WARNING" },
          { value: "ERROR", label: "ERROR" },
          { value: "CRITICAL", label: "CRITICAL" }
        ],
        advanced: true
      },
      {
        type: "textarea",
        label: "Log Message",
        id: "logMessage",
        placeholder: "An error occurred in the script:\n\n{error_message}",
        advanced: true
      },
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

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId, componentService }
  
  const handleElement = React.createElement(renderHandle, {
    type: FileLogger.Type,
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
        name: FileLogger.Name,
        ConfigForm: FileLogger.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: FileLogger.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["import logging"];
  }

  public provideFunctions({config}): string[] {
    let functions = [];
    const code = `
logger = logging.getLogger('PipelineLogger')
logging.basicConfig(filename="${config.filePath}", level=logging.${config.logLevel}, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
`;
    functions.push(code);
    return functions;
  }

  public generateComponentCode({config}): string {
    const code = `
logger.info(str(e))
`;
    return code;
  }

}
