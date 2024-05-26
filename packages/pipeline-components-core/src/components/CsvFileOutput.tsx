import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filePlusIcon } from '../icons';

export class CsvFileOutput extends PipelineComponent<ComponentItem>() {

  public _name = "CSV File Output";
  public _id = "csvFileOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = filePlusIcon;
  public _default = { csvOptions: { sep: ","} };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.(csv|tsv|txt)$",
        validationMessage: "This field expects a file with a csv, tsv or txt extension such as output.csv."
      },
      {
        type: "selectCustomizable",
        label: "Separator",
        id: "csvOptions.sep",
        placeholder: "auto",
        options: [
          { value: ",", label: "comma (,)" },
          { value: ";", label: "semicolon (;)" },
          { value: " ", label: "space" },
          { value: "  ", label: "tab" },
          { value: "|", label: "pipe (|)" }
        ],
      },
      {
        type: "radio",
        label: "Mode",
        id: "csvOptions.mode",
        options: [
          { value: "w", label: "Write" },
          { value: "x", label: "Exclusive Creation" },
          { value: "a", label: "Append" }
        ],
        advanced: true
      },
      {
        type: "boolean",
        label: "Header",
        id: "csvOptions.header",
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

  const zoomSelector = createZoomSelector();
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
      type: CsvFileOutput.Type,
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
          name: CsvFileOutput.Name,
          ConfigForm: CsvFileOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: CsvFileOutput.Icon,
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

  public generateComponentCode({ config, inputName }): string {

    let optionsString = Object.entries(config.csvOptions)
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => `${key}='${value}'`)
      .join(', ');

    // Add comma only if optionsString is not empty
    optionsString = optionsString ? `, ${optionsString}` : '';

    const code = `
${inputName}.to_csv("${config.filePath}", index=False${optionsString})
`;
    return code;
  }
}
