import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';

export class BaseCoreComponent extends PipelineComponent<ComponentItem>() {
  constructor(name, id, type, fileDrop, category, icon, defaultConfig, form) {
    super();
    this._name = name;
    this._id = id;
    this._type = type;
    this._fileDrop = fileDrop;
    this._category = category;
    this._icon = icon;
    this._default = defaultConfig;
    this._form = form;
  }

  public static ConfigForm = ({
    nodeId,
    data,
    context,
    componentService,
    manager,
    commands,
    store,
    setNodes,
    type,
    name,
    defaultConfig,
    form,
    handleChange
  }) => {
    const handleSetDefaultConfig = useCallback(() => {
      setDefaultConfig({ nodeId, store, setNodes, defaultConfig });
    }, [nodeId, store, setNodes, defaultConfig]);

    useEffect(() => {
      handleSetDefaultConfig();
    }, [handleSetDefaultConfig]);



    return (
      <>
        {generateUIFormComponent({
          nodeId: nodeId,
          type: type,
          name: name,
          form: form,
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

  public UIComponent = ({ id, data, context, componentService, manager, commands }) => {
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
      type: this._type,
      Handle: Handle,
      Position: Position,
      internals: internals    
    });

    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    // Selector to determine if the node is selected
    const isSelected = useStore((state) => !!state.nodeInternals.get(id)?.selected);

    return (
      <>
        {renderComponentUI({
          id: id,
          data: data,
          context: context,
          manager: manager,
          commands: commands,
          name: this._name,
          ConfigForm: BaseCoreComponent.ConfigForm({ 
            nodeId: id, 
            data, 
            context, 
            componentService, 
            manager, 
            commands, 
            store, 
            setNodes,
            type: this._type,
            name: this._name,
            defaultConfig: this._default, 
            form: this._form,
            handleChange
          }),
          Icon: this._icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
          handleChange,
          isSelected
        })}
      </>
    );
  }
}
