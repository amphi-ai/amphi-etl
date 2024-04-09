import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { filePlusIcon } from '../icons';

export class ExcelFileOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Excel File Output";
  public _id = "excelFileOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = filePlusIcon;
  public _default = { excelOptions: {} };
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
        id: "excelOptions.sheet",
        placeholder: "default: Sheet1"
      },
      {
        type: "radio",
        label: "Mode",
        id: "mode",
        options: [
          { key: "write", value: "WRITE", text: "WRITE", selected: true },
          { key: "append", value: "APPEND", text: "APPEND" }
        ],
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

    const zoomSelector = (s) => s.transform[2] >= 1;
    const showContent = useStore(zoomSelector);

    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: ExcelFileOutput.Type,
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

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName }): string {
    // Initialize an object to modify without affecting the original config
    let excelOptions = { ...config.excelOptions };

    // Validate and set the service account file path
    const serviceAccountFilePath = config.filePath ? `'${config.filePath}'` : 'None';

    // Setup common parts of the Python code
    const scope = "['https://spreadsheets.google.com/feeds','https://www.googleapis.com/auth/drive']";
    const credentialsCode = `ServiceAccountCredentials.from_json_keyfile_name(${serviceAccountFilePath}, ${scope})`;
    const authorizeCode = `gspread.authorize(${credentialsCode})`;
    const openSpreadsheetCode = `open_by_key(${excelOptions.spreadsheetId ? `'${excelOptions.spreadsheetId}'` : 'None'})`;
    const selectWorksheetCode = `.worksheet(${excelOptions.range ? `'${excelOptions.range.split('!')[0]}'` : 'None'})`;

    // Determine the unique variables for each instance
    const uniqueClientVar = `${inputName}Client`;
    const uniqueSheetVar = `${inputName}Sheet`;

    // Generate the Python code for operations based on the mode
    let operationCode;
    if (config.mode === 'APPEND') {
      operationCode = `${uniqueSheetVar}.append_rows(${inputName}.values.tolist(), value_input_option='RAW', insert_data_option='INSERT_ROWS', table_range='${excelOptions.range}')`;
    } else { // Default to 'WRITE'
      operationCode = `${uniqueSheetVar}.update([${inputName}.columns.values.tolist()] + ${inputName}.values.tolist())`;
    }

    // Combine the parts to form the complete Python code
    const code = `
# Setting up the Google Sheets client
scope = ${scope}
creds = ${credentialsCode}
${uniqueClientVar} = ${authorizeCode}

# Opening the spreadsheet and selecting the correct worksheet
${uniqueSheetVar} = ${uniqueClientVar}.${openSpreadsheetCode}.${selectWorksheetCode}

# Performing the selected operation on the sheet
${operationCode}
`;

    return code;
  }
}
