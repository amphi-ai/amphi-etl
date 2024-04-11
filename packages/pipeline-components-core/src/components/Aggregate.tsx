import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { aggregateIcon } from '../icons'; // Assuming aggregateIcon is available

export class Aggregate extends PipelineComponent<ComponentItem>() {

    public _name = "Aggregate";
    public _id = "aggregate";
    public _type = "pandas_df_processor";
    public _icon = aggregateIcon;
    public _category = "transform";
    public _default = { csvOptions: { header: "infer"} };
    public _form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Column(s) to group by",
          id: "groupColumn",
          placeholder: "column(s) name",
        },
        {
          type: "input",
          label: "Column(s) to apply operation",
          id: "aggColumns",
          placeholder: "column(s) name",
        },
        {
          type: "datalist",
          label: "Operation function(s)",
          id: "aggFunctions",
          placeholder: "Select function(s) (comma separated for multiple functions",
          options: [
            { key: "min", value: "min", text: "Minimum of each group"},
            { key: "max", value: "max", text: "Maximum of each group" },
            { key: "sum", value: "sum", text: "Sum of each group" },
            { key: "count", value: "count", text: "Count of each group" },
            { key: "mean", value: "mean", text: "Mean" },
            { key: "minmaxsummin", value: "min, max, sum, mean", text: "Multiple functions example" }
          ],
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

      const groupColumns = config.groupColumn.split(',').map(s => s.trim());
      
      const aggColumns = config.aggColumns.split(',').map(s => s.trim());
    
      const aggFunctions = config.aggFunctions.split(',').map(s => s.trim());
    
      // Construct aggregation dict
      let aggDict = {};
      aggColumns.forEach((col, idx) => {
        aggDict[col] = aggFunctions[idx]; 
      });
    
      // Generate groupby code
      let code = `
${outputName} = ${inputName}.groupby([`;
      
      // Add group columns 
      groupColumns.forEach(col => {
        code += `\n'${col}',`; 
      });
      
      code += `\n]).agg(${JSON.stringify(aggDict)}).reset_index()\n`;
    
      return code;
    }

}