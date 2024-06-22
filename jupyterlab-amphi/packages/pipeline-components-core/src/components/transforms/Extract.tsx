import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { extractIcon } from '../../icons';

export class Extract extends PipelineComponent<ComponentItem>() {

  public _name = "Extract";
  public _id = "extract";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = extractIcon;
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "column",
        label: "Column name",
        id: "column",
        placeholder: "Column name",
      },
      {
        type: "selectCustomizable",
        label: "Regular Expression",
        id: "regex",
        tooltip: "Select of a type of data or add a custom regex",
        placeholder: "Select type or type regex",
        options: [
          { value: "(\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b)", label: "Email" },
          { value: "(https?://(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b(?:[-a-zA-Z0-9@:%_\\+.~#?&//=]*))", label: "URL" },
          { value: "(\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b)", label: "IPv4 Address" },
          { value: "(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})", label: "IPv6 Address" },
          { value: "(\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b)", label: "Credit Card" },
          { value: "(\\b\\d{3}-\\d{2}-\\d{4}\\b)", label: "SSN" },
          { value: "(\\b\\d{1,3}(\\.\\d{1,2})?%\\b)", label: "Percentage" },
          { value: "(\"([^\"\\\\]*(\\\\.[^\"\\\\]*)*))", label: "JSON String" },
          { value: "(\\b\\d{3}-\\d{10}\\b)", label: "ISBN" }
        ]
      },
      {
        type: "select",
        label: "Flags",
        id: "flags",
        placeholder: "Type or select",
        options: [
          { value: "IGNORECASE", label: "Makes the match case-insensitive. For example, it will match both 'abc' and 'ABC'." },
          { value: "MULTILINE", label: "Changes the behavior of ^ and $ to match the start and end of each line, not just the start and end of the whole string." },
          { value: "DOTALL", label: "Makes the . match any character at all, including a newline; without this flag, . will match anything except a newline." },
          { value: "UNICODE", label: "Makes \\w, \\W, \\b, \\B, \\d, \\D, \\s, and \\S sequences dependent on the Unicode character properties database. This is the default behavior in Python 3 for strings." },
          { value: "ASCII", label: "Makes \\w, \\W, \\b, \\B, \\d, \\D, \\s, and \\S perform ASCII-only matching instead of full Unicode matching." },
          { value: "VERBOSE", label: "Allows you to write regular expressions that are more readable by permitting whitespace and comments within the pattern string." }
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
      type: Extract.Type,
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
          name: Extract.Name,
          ConfigForm: Extract.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: Extract.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import re"];
  }


  public generateComponentCode({ config, inputName, outputName }): string {
    const columnName = config.column.value; // name of the column
    const columnType = config.column.type; // current type of the column (e.g., 'int', 'string')
    const columnNamed = config.column.named; // boolean, true if column is named, false if index is used
  
    const columnAccess = columnNamed ? `'${columnName}'` : `${columnName}`;

    const regex = config.regex;
    let flagsCode = '';

    // Check if flags are not empty before formatting
    if (config.falgs && config.flags.trim() !== '') {
      const flags = config.flags.split(',')
        .filter(flag => flag.trim() !== '')
        .map(flag => `re.${flag}`)
        .join(' | ');
      flagsCode = `, flags=${flags}`;
    }

    // Count the number of capturing groups in the regex
    const groupCount = (new RegExp(regex + '|')).exec('').length - 1;
    const columnNames = Array.from({ length: groupCount }, (_, i) => `"${outputName}_${i + 1}"`).join(', ');

    // Use outputName to create unique names for the extracted data
    const extractedVarName = `${outputName}_extracted`;

    // Generate the final code string
    const code = `
# Extract data using regex
${extractedVarName} = ${inputName}[${columnAccess}].str.extract(r"${regex}"${flagsCode})
${extractedVarName}.columns = [${columnNames}]
${outputName} = ${inputName}.join(${extractedVarName}, rsuffix="_extracted")
`;
    return code;
  }
}