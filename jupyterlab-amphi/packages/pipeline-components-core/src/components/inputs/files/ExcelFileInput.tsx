import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../../../icons';

export class ExcelFileInput extends PipelineComponent<ComponentItem>() {

  public _name = "Excel File Input";
  public _id = "excelfileInput";
  public _type = "pandas_df_input";
  public _fileDrop = [ "xlsx" ];
  public _category = "input";
  public _icon = fileTextIcon;
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.(xlsx)$",
        validationMessage: "This field expects a file with a xlsx extension such as input.xlsx."
      },
      {
        type: "selectCustomizable",
        label: "Sheets",
        id: "excelOptions.sheet",
        placeholder: "Default: O (first sheet)",
        options: [
          { value: "0", label: "0" },
          { value: "1", label: "1t" },
          { value: "[0, 1, 'Sheet5']", label: "[0, 1, 'Sheet5']" },
          { value: "None", label: "All" }
        ],
      },
      {
        type: "selectCustomizable",
        label: "Header",
        id: "excelOptions.header",
        placeholder: "default: 0 (first row)",
        options: [
          { value: "0", label: "0 (1st row)" },
          { value: "1", label: "1 (2nd row)" },
          { value: "None", label: "None (No header)" }
        ],
        advanced: true
      },
      {
        type: "boolean",
        label: "Verbose",
        id: "excelOptions.verbose",
        placeholder: "false",
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


    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: ExcelFileInput.Type,
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
          name: ExcelFileInput.Name,
          ConfigForm: ExcelFileInput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: ExcelFileInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('openpyxl');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {
    let optionsString = config.excelOptions ?
      Object.entries(config.excelOptions)
        .filter(([key, value]) => value !== null && value !== '')
        .map(([key, value]) => `${key}='${value}'`)
        .join(', ')
      : null;

    const code = optionsString
      ? `${outputName} = pd.read_excel("${config.filePath}", ${optionsString}).convert_dtypes()
`
      : `${outputName} = pd.read_excel("${config.filePath}").convert_dtypes()
`;

    return code;
  }

}
