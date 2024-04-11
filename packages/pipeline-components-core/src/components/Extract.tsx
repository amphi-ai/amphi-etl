import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { extractIcon } from '../icons';

export class Extract extends PipelineComponent<ComponentItem>() {

  public _name = "Extract (Regex)";
  public _id = "extract";
  public _type = "pandas_df_processor";
  public _category = "transform";
  public _icon = extractIcon;
  public _default = {};
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Column name",
        id: "columnName",
        placeholder: "Column name",
      },
      {
        "type": "input",
        "label": "Regular Expression",
        "id": "regex",
        "placeholder": "Regular Expression",
      },
      {
        type: "datalist",
        label: "Flags",
        id: "flags",
        placeholder: "Type or select",
        "options": [
          { "key": "IGNORE CASE", "value": "IGNORECASE", "text": "Makes the match case-insensitive. For example, it will match both 'abc' and 'ABC'." },
          { "key": "MULTILINE", "value": "MULTILINE", "text": "Changes the behavior of ^ and $ to match the start and end of each line, not just the start and end of the whole string." },
          { "key": "DOTALL", "value": "DOTALL", "text": "Makes the . match any character at all, including a newline; without this flag, . will match anything except a newline." },
          { "key": "UNICODE", "value": "UNICODE", "text": "Makes \\w, \\W, \\b, \\B, \\d, \\D, \\s, and \\S sequences dependent on the Unicode character properties database. This is the default behavior in Python 3 for strings." },
          { "key": "ASCII", "value": "ASCII", "text": "Makes \\w, \\W, \\b, \\B, \\d, \\D, \\s, and \\S perform ASCII-only matching instead of full Unicode matching." },
          { "key": "VERBOSE", "value": "VERBOSE", "text": "Allows you to write regular expressions that are more readable by permitting whitespace and comments within the pattern string." }
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
    const columnName = config.columnName;
    const regex = config.regex;
    let flagsCode = '';

    // Check if flags are not empty before formatting
    if (config.flags.trim() !== '') {
      const flags = config.flags.split(',')
        .filter(flag => flag.trim() !== '')
        .map(flag => `re.${flag}`)
        .join(' | ');
      flagsCode = `, flags=${flags}`;
    }

    // Count the number of capturing groups in the regex
    const groupCount = (new RegExp(regex + '|')).exec('').length - 1;
    const columnNames = Array.from({ length: groupCount }, (_, i) => `'${outputName}_${i + 1}'`).join(', ');

    // Use outputName to create unique names for the extracted data
    const extractedVarName = `${outputName}_extracted`;

    // Generate the final code string
    const code = `
# Extract data using regex
${extractedVarName} = ${inputName}['${columnName}'].str.extract(r'${regex}'${flagsCode})
${extractedVarName}.columns = [${columnNames}]
${outputName} = ${inputName}.join(${extractedVarName}, rsuffix='_extracted')
`;
    return code;
  }
}