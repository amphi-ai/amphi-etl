import { ComponentItem, PipelineComponent, createZoomSelector, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect, useState } from 'react';
import { Handle, NodeToolbar, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { playCircleIcon, settingsIcon } from '../icons';

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
    handleChange,
    modalOpen,
    setModalOpen
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
          modalOpen,
          setModalOpen
        })}
      </>
    );
  }

  public UIComponent = ({ id, data, context, componentService, manager, commands, settings }) => {
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
            handleChange,
            modalOpen,
            setModalOpen
          }),
          Icon: this._icon,
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
            {(this._type.includes('input') || this._type.includes('processor') || this._type.includes('output')) && (
              <button onClick={() => executeUntilComponent()} disabled={!enableExecution}
                style={{ opacity: enableExecution ? 1 : 0.5, cursor: enableExecution ? 'pointer' : 'not-allowed' }}>
                <playCircleIcon.react /></button>
            )}
          </NodeToolbar>
        )}
      </>
    );
  }
}
