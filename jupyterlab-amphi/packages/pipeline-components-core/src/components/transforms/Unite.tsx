import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { plusCircleIcon } from '../../icons';

export class Unite extends PipelineComponent<ComponentItem>() {

  public _name = "Unite/Concat Dataset";
  public _id = "concat";
  public _type = "pandas_df_multi_processor";
  public _category = "transform";
  public _icon = plusCircleIcon;
  public _default = { ignoreIndex: true, sort: false };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "boolean",
        label: "Ignore Index",
        tooltip: "Enable this option to reindex the combined dataset.",
        id: "ignoreIndex",
      },
      {
        type: "boolean",
        label: "Sort",
        tooltip: "Disable this option to prevent automatic sorting of columns.",
        id: "sort",
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
      type: Unite.Type,
      Handle: Handle, // Make sure Handle is imported or defined
      Position: Position, // Make sure Position is imported or defined
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
          name: Unite.Name,
          ConfigForm: Unite.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: Unite.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputNames, outputName }): string {

    const ignoreIndex = config.ignoreIndex !== undefined ? `, ignore_index=${config.ignoreIndex ? 'True' : 'False'}` : '';
    const sort = config.sort !== undefined ? `, sort=${config.sort ? 'True' : 'False'}` : '';

    const dataframesList = inputNames.join(', ');

    const code = `
# Concatenate dataframes
${outputName} = pd.concat([${dataframesList}]${ignoreIndex}${sort})
`;
    return code;
}



}