import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../../../icons';

export class ExcelFileInput extends PipelineComponent<ComponentItem>() {

  public _name = "Excel File Input";
  public _id = "excelfileInput";
  public _type = "pandas_df_input";
  public _fileDrop = ["xlsx", "xls", "ods", "xlsb"];
  public _category = "input";
  public _icon = fileTextIcon;
  public _default = { engine: "None" };
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
        tooltip: "Select the sheet number or all of them. Use custom number to select a specific sheet. You can also select multiple sheets if they have the same structure with [0, 1, 2]",
        options: [
          { value: "0", label: "0 (First sheet)" },
          { value: "1", label: "1 (Second sheet)" },
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
      {
        type: "select",
        label: "Engine",
        id: "engine",
        tooltip: "Depending on the file format, different engines might be used.\nopenpyxl supports newer Excel file formats.\n calamine supports Excel (.xls, .xlsx, .xlsm, .xlsb) and OpenDocument (.ods) file formats.\n odf supports OpenDocument file formats (.odf, .ods, .odt).\n pyxlsb supports Binary Excel files.\n xlrd supports old-style Excel files (.xls).",
        options: [
          { value: "openpyxl", label: "openpyxl" },
          { value: "calamine", label: "calamine" },
          { value: "odf", label: "odf (for .ods files)" },
          { value: "pyxlsb", label: "pyxlsb (for *.xlsb)" },
          { value: "xlrd", label: "xlrd (for *.xls)" },
          { value: "None", label: "Default" }
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

    const engine = config.engine;
    
    if (engine === 'None' || engine === 'openpyxl') {
      deps.push('openpyxl');
    } if (engine === 'calamine') {
      deps.push('python-calamine');
    } if (engine === 'odf') {
      deps.push('odfpy');
    } if (engine === 'pyxlsb') {
      deps.push('pyxlsb');
    } if (engine === 'xlrd') {
      deps.push('xlrd');
    }
    else {
      deps.push(config.engine);
    }

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

    const engine = config.engine !== 'None' ? `'${config.engine}'` : config.engine;

    const code = optionsString
      ? `${outputName} = pd.read_excel("${config.filePath}", engine=${engine}, ${optionsString}).convert_dtypes()
`
      : `${outputName} = pd.read_excel("${config.filePath}", engine=${engine}).convert_dtypes()
`;

    return code;
  }

}
