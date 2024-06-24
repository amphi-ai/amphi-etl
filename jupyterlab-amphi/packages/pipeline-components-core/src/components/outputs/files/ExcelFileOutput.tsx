import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filePlusIcon } from '../../../icons';

export class ExcelFileOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Excel File Output";
  public _id = "excelFileOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = filePlusIcon;
  public _default = { excelOptions: { header: true}, engine: 'xlsxwriter' };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.(xlsx)$",
        validationMessage: "This field expects a file with a xlsx extension such as output.xlsx."
      },
      {
        type: "input",
        label: "Sheet",
        id: "excelOptions.sheet_name",
        placeholder: "default: Sheet1"
      },
      {
        type: "boolean",
        label: "Create folders if don't exist",
        id: "createFoldersIfNotExist",
        advanced: true
      },
      {
        type: "radio",
        label: "Mode",
        id: "mode",
        options: [
          { value: "write", label: "Write"},
          { value: "append", label: "Append" }
        ],
        advanced: true
      },
      {
        type: "boolean",
        label: "Header",
        id: "csvOptions.header",
        advanced: true
      },
      {
        type: "boolean",
        label: "Row index",
        tooltip: "Write row names (index).",
        id: "csvOptions.index",
        advanced: true
      },
      {
        type: "select",
        label: "Engine",
        id: "engine",
        tooltip: "Depending on the file format, different engines might be used.\nopenpyxl supports newer Excel file formats.\n calamine supports Excel (.xls, .xlsx, .xlsm, .xlsb) and OpenDocument (.ods) file formats.\n odf supports OpenDocument file formats (.odf, .ods, .odt).\n pyxlsb supports Binary Excel files.\n xlrd supports old-style Excel files (.xls).",
        options: [
          { value: "openpyxl", label: "openpyxl" },
          { value: "xlsxwriter", label: "xlsxwriter" }
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
      type: ExcelFileOutput.Type,
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
          name: ExcelFileOutput.Name,
          ConfigForm: ExcelFileOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: ExcelFileOutput.Icon,
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
    } if (engine === 'xlsxwriter') {
      deps.push('xlsxwriter');
    }

    return deps;
  }

  public provideImports({ config }): string[] {
    let imports = ["import pandas as pd"];
    if (config.createFoldersIfNotExist) {
      imports.push("import os");
    }
    return imports;
  }

  public generateComponentCode({config, inputName}): string {
    let excelWriterNeeded = config.excelOptions.mode === 'a';
    let options = {...config.excelOptions};
  
    // Remove mode from options as it's handled separately
    delete options.mode;
    
    let optionsString = Object.entries(config.excelOptions)
    .filter(([key, value]) => value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}=${value ? 'True' : 'False'}`;
      }
      return `${key}='${value}'`;
    })
    .join(', ');
  
    optionsString = optionsString ? `, ${optionsString}` : '';
  
    const createFoldersCode = config.createFoldersIfNotExist ? `os.makedirs(os.path.dirname("${config.filePath}"), exist_ok=True)\n` : '';
    const engine = config.engine !== 'None' ? `'${config.engine}'` : config.engine;

    let code = '';
    if (excelWriterNeeded) {
      code = `with pd.ExcelWriter("${config.filePath}", mode="a") as writer:\n` +
             `    ${inputName}.to_excel(writer${optionsString})
  `;
    } else {
      code = `
${inputName}.to_excel("${config.filePath}", engine=${engine}${optionsString})
  `;
    }

    return `${createFoldersCode}${code}`;
  }
}
