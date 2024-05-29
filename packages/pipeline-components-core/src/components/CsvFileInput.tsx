import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../icons';

export class CsvFileInput extends PipelineComponent<ComponentItem>() {

  public _name = "CSV File Input";
  public _id = "csvFileInput";
  public _type = "pandas_df_input";
  public _fileDrop = [ "csv", "tsv" ];
  public _category = "input";
  public _icon = fileTextIcon;
  public _default = { csvOptions: { sep: "," } };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        tooltip: "This field expects a file path with a csv, tsv or txt extension such as input.csv.",
        validation: "\\.(csv|tsv|txt)$",
      },
      {
        type: "selectCustomizable",
        label: "Separator",
        id: "csvOptions.sep",
        placeholder: "default: ,",
        tooltip: "Select or provide a custom deilimiter.",
        options: [
          { value: ",", label: "comma (,)" },
          { value: ";", label: "semicolon (;)" },
          { value: " ", label: "space" },
          { value: "  ", label: "tab" },
          { value: "|", label: "pipe (|)" },
          { value: "infer", label: "infer (tries to auto detect)" }
        ],
      },
      {
        type: "selectCustomizable",
        tooltip: "Row number containing column labels and marking the start of the data (zero-indexed).",
        label: "Header",
        id: "csvOptions.header",
        placeholder: "Default: first line",
        options: [
          { value: "None", label: "None" },
          { value: "0", label: "First line" },
          { value: "1", label: "Second Line" }
        ],
        advanced: true
      },
      {
        type: "selectTokenization",
        tooltip: "Sequence of column labels to apply.",
        label: "Column names",
        id: "csvOptions.names",
        placeholder: "Type header fields (ordered and comma-separated)",
        options: [
        ],
        advanced: true
      },
      {
        type: "select",
        label: "On Bad Lines",
        id: "csvOptions.on_bad_lines",
        placeholder: "Error: raise an Exception when a bad line is encountered",
        options: [
          { value: "error", label: "Error: raise an Exception when a bad line is encountered" },
          { value: "warn", label: "Warn: raise a warning when a bad line is encountered and skip that line." },
          { value: "skip", label: "Skip: skip bad lines without raising or warning when they are encountered." }
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
      type: CsvFileInput.Type,
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
          name: CsvFileInput.Name,
          ConfigForm: CsvFileInput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: CsvFileInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, outputName }): string {
    // Initialize an object to modify without affecting the original config
    let csvOptions = { ...config.csvOptions };

    // Handle 'infer' option
    if (csvOptions.sep === 'infer') {
        csvOptions.sep = 'None'; // Set sep to Python's None for code generation
        csvOptions.engine = 'python'; // Ensure engine is set to 'python'
    }

    // Adjust handling for 'header' and 'names'
    if (typeof config.header === 'number' || config.header === 'None') {
        csvOptions.header = config.header; // Use the header value directly if it's a number or 'None'
    }

    if (config.names && Array.isArray(config.names) && config.names.length > 0) {
      csvOptions.names = `['${config.names.join("', '")}']`; // Format names as a Python list
      csvOptions.header = 0; // Set header to 0 if names are provided
    }

    // Prepare options string for pd.read_csv
    let optionsString = Object.entries(csvOptions)
        .filter(([key, value]) => value !== null && value !== '' && !(key === 'sep' && value === 'infer'))
        .map(([key, value]) => {
            if (key === 'header' && (typeof value === 'number' || value === 'None')) {
                return `${key}=${value}`; // Handle header as number or None without quotes
            } else if (key === 'names') {
                return `${key}=${value}`; // Directly use the formatted names list
            } else if (typeof value === 'string' && value !== 'None') {
                return `${key}="${value}"`; // Handle strings with quotes, except for 'None'
            } else {
                return `${key}=${value}`; // Handle numbers and Python's None without quotes
            }
        })
        .join(', ');

    // Generate the Python code
    const code = `
# Reading data from ${config.filePath}
${outputName} = pd.read_csv("${config.filePath}"${optionsString ? `, ${optionsString}` : ''}).convert_dtypes()
`;
    return code;
}

}
