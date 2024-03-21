import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../icons';

export class ExcelFileInput extends PipelineComponent<ComponentItem>() {

  public _name = "Excel File Input";
  public _id = "excelfileInput";
  public _type = "pandas_df_input";
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
        type: "datalist",
        label: "Sheets",
        id: "excelOptions.sheet",
        placeholder: "default: 0 (1st sheet)",
        options: [
          { key: "0", value: "0", text: "1st sheet" },
          { key: "1", value: "1", text: "2nd sheet" },
          { key: "dict", value: "[0, 1, 'Sheet5']", text: "Load first, second and sheet named 'Sheet5'" },
          { key: "none", value: "None", text: "All worksheets" }
        ],
      },
      {
        type: "datalist",
        label: "Header",
        id: "excelOptions.header",
        placeholder: "default: 0 (first row)",
        options: [
          { key: "0", value: "0", text: "1st row" },
          { key: "none", value: "None", text: "None if there is no header." }
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
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, manager, commands }) {

    const { setNodes, deleteElements, setViewport } = useReactFlow();
    const store = useStoreApi();

    const deleteNode = useCallback(() => {
      deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

    const zoomSelector = (s) => s.transform[2] >= 1;
    const showContent = useStore(zoomSelector);

    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: ExcelFileInput.Type,
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
          name: ExcelFileInput.Name,
          ConfigForm: ExcelFileInput.ConfigForm({ nodeId: id, data, context, manager, commands, store, setNodes }),
          Icon: ExcelFileInput.Icon,
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

  public generateComponentCode({ config, outputName }): string {
    let optionsString = config.excelOptions ?
      Object.entries(config.excelOptions)
        .filter(([key, value]) => value !== null && value !== '')
        .map(([key, value]) => `${key}='${value}'`)
        .join(', ')
      : null;

    const code = optionsString
      ? `${outputName} = pd.read_excel('${config.filePath}', ${optionsString}).convert_dtypes()
`
      : `${outputName} = pd.read_excel('${config.filePath}').convert_dtypes()
`;

    return code;
  }

}
