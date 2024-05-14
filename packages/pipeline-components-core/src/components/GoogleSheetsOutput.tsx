import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { googleSheetsIcon } from '../icons';

export class GoogleSheetsOutput extends PipelineComponent<ComponentItem>() {

  public _name = "G. Sheets Output";
  public _id = "googleSheetsOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = googleSheetsIcon; // Replace with your actual icon
  public _default = { sheetOptions: { spreadsheetId: "", range: "Sheet1" } };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "Service Account Key",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.(json)$",
        validationMessage: "This field expects a file with a .json extension such as your-service-account-file.json."
      },
      {
        type: "input",
        label: "Spreadsheet ID",
        id: "sheetOptions.spreadsheetId",
        placeholder: "Enter Google Sheets' name or ID",
        validation: "^[a-zA-Z0-9-_]+$",
        validationMessage: "Invalid Spreadsheet ID."
      },
      {
        type: "input",
        label: "Range",
        id: "sheetOptions.range",
        placeholder: "e.g., Sheet1 or Sheet1!A1:D5",
        validation: "^[a-zA-Z0-9-_!]+$",
        validationMessage: "Invalid Range."
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
      type: GoogleSheetsOutput.Type,
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
          name: GoogleSheetsOutput.Name,
          ConfigForm: GoogleSheetsOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: GoogleSheetsOutput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import gspread", "from oauth2client.service_account import ServiceAccountCredentials"];
  }

  public generateComponentCode({ config, inputName }): string {
    // Initialize an object to modify without affecting the original config
    let sheetOptions = { ...config.sheetOptions };

    // Validate and set the service account file path
    const serviceAccountFilePath = config.filePath ? `"${config.filePath}"` : 'None';

    // Unique variables for each instance
    const uniqueClientVar = `${inputName}Client`;
    const uniqueSheetVar = `${inputName}Sheet`;

    // Generate the Python code for outputting data to Google Sheets
    const code = `
# Outputting data to Google Sheets
scope = ["https://spreadsheets.google.com/feeds","https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name(${serviceAccountFilePath}, scope)
${uniqueClientVar} = gspread.authorize(creds)

# Open the spreadsheet and select the right worksheet
${uniqueSheetVar} = ${uniqueClientVar}.open_by_key(${sheetOptions.spreadsheetId ? `"${sheetOptions.spreadsheetId}"` : 'None'}).worksheet(${sheetOptions.range ? `"${sheetOptions.range.split('!')[0]}"` : 'None'})

# Update the sheet with dataframe's data
${uniqueSheetVar}.update([${inputName}.columns.values.tolist()] + ${inputName}.values.tolist())
`;

    return code;
  }

}
