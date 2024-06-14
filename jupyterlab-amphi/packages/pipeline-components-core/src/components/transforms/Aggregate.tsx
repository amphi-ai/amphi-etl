import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { aggregateIcon } from '../../icons';

export class Aggregate extends PipelineComponent<ComponentItem>() {

    public _name = "Aggregate";
    public _id = "aggregate";
    public _type = "pandas_df_processor";
    public _icon = aggregateIcon;
    public _category = "transform";
    public _default = { };
    public _form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Group by",
          id: "groupByColumns",
          placeholder: "Select columns"
        },
        {
          type: "keyvalueColumnsSelect",
          label: "Operations",
          id: "columnsOperations",
          placeholder: "Select column",
          options: [
            { value: "min", label: "Min"},
            { value: "max", label: "Max" },
            { value: "sum", label: "Sum" },
            { value: "count", label: "Count" },
            { value: "mean", label: "Mean" }
          ],
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
      type: Aggregate.Type,
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
          name: Aggregate.Name,
          ConfigForm: Aggregate.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: Aggregate.Icon,
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

    public generateComponentCode({ config, inputName, outputName }) {
      const groupColumns = config.groupByColumns.map(col => col.value);
  
      // Start constructing the aggregation arguments dynamically
      let aggArgs = "";
  
      if (config.columnsOperations && config.columnsOperations.length > 0) {
          config.columnsOperations.forEach((op, index) => {
              // Determine how to reference the column based on 'named'
              const columnReference = op.key.named ? `'${op.key.value}'` : op.key.value;
              const operation = op.value.value;
              const columnName = op.key.named ? op.key.value : `col${op.key.value}`;
              const operationName = `${columnName}_${operation}`;
  
              // Construct each aggregation argument
              aggArgs += `${operationName}=(${columnReference}, '${operation}')`;
              if (index < config.columnsOperations.length - 1) {
                  aggArgs += ", ";
              }
          });
      }
  
      // Generate groupby code
      let code = `
${outputName} = ${inputName}.groupby([`;
  
      // Add group columns
      groupColumns.forEach(col => {
          code += `"${col}",`;
      });
  
      // Complete the aggregation function call
      code += `]).agg(${aggArgs}).reset_index()\n`;
  
      return code;
  }
  

}