import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { mergeIcon } from '../icons';

export class Join extends PipelineComponent<ComponentItem>() {

  public _name = "Join Datasets";
  public _id = "join";
  public _type = "pandas_df_double_processor";
  public _category = "transform";
  public _icon = mergeIcon;
  public _default = { condition: "=="};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "column",
        label: "First Input Column",
        id: "leftKeyColumn",
        placeholder: "Column name",
        inputNb: 1
      },
      {
        type: "column",
        label: "Second Input Column",
        id: "rightKeyColumn",
        placeholder: "Column name",
        inputNb: 2
      },
      {
        type: "select",
        label: "Join type",
        id: "how",
        placeholder: "Default: Inner",
        options: [
          { value: "inner", label: "Inner: return only the rows with matching keys in both data frames (intersection)." },
          { value: "left", label: "Left: return all rows from the left data frame and matched rows from the right data frame (including NaN for no match)." },
          { value: "right", label: "Right: return all rows from the right data frame and matched rows from the left data frame (including NaN for no match)." },
          { value: "outer", label: "Outer: return all rows from both data frames, with matches where available and NaN for no match (union)." }
        ],
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
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }

  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: Join.Type,
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
        name: Join.Name,
        ConfigForm: Join.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: Join.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({config, inputName1, inputName2, outputName}): string {

    // column.value = name, column.type = type, column.name = boolean if column is named or false if numeric index
    const { value: leftKeyColumnValue, type: leftKeyColumnType, named: leftKeyColumnNamed } = config.leftKeyColumn;
    const { value: rightKeyColumnValue, type: rightKeyColumnType, named: rightKeyColumnNamed } = config.rightKeyColumn;

    // Modify to handle non-named (numeric index) columns by removing quotes
    const leftKey = leftKeyColumnNamed ? `'${leftKeyColumnValue}'` : leftKeyColumnValue;
    const rightKey = rightKeyColumnNamed ? `'${rightKeyColumnValue}'` : rightKeyColumnValue;

    const joinType = config.how ? `, how='${config.how}'` : '';
    const code = `
# Join ${inputName1} and ${inputName2}
${outputName} = pd.merge(${inputName1}, ${inputName2}, left_on=${leftKey}, right_on=${rightKey}${joinType})
`;

    return code;
}



}