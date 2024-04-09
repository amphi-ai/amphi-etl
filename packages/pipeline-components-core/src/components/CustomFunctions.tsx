import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { codeIcon } from '../icons';

export class CustomFunctions extends PipelineComponent<ComponentItem>() {

  public _name = "Custom Functions";
  public _id = "customFunctions";
  public _type = "python_standalone";
  public _category = "other";
  public _icon = codeIcon;
  public _default = {
    code: `def example_function(param1, param2):
      """
      Description: This function serves as a generic template for performing a basic operation.
      
      Parameters:
      param1 (Type): Description of param1.
      param2 (Type): Description of param2.
      
      Returns:
      result (Type): Description of the return value.
      """
      
      # Your code here
      result = param1 + param2  # Example operation
      
      return result`
  };  
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "textarea",
        label: "Code",
        id: "code",
        placeholder: "",
      },
      {
        type: "textarea",
        label: "Imports",
        id: "imports",
        placeholder: "import library",
        advanced: true
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
  
  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: CustomFunctions.Type,
    Handle: Handle, // Make sure Handle is imported or defined
    Position: Position // Make sure Position is imported or defined
  });
  
  return (
    <>
      {renderComponentUI({
        id: id,
        data: data,
        context: context,
        manager: manager,
        commands: commands,
        name: CustomFunctions.Name,
        ConfigForm: CustomFunctions.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: CustomFunctions.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
}

  public provideImports(config): string[] {
    return config.imports ? config.imports.split('\n').filter(line => line.startsWith('import ')) : [];
  }

  public generateComponentCode({config, inputName, outputName}): string {
    let code = config.code.replace(/input/g, inputName);
    code = code.replace(/output/g, outputName);
    return code;
  }
}