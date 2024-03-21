import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { filePlusIcon } from '../icons';

export class ParquetFileOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Parquet File Output";
  public _id = "parquetFileOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = filePlusIcon;
  public _default = {}; // No default options for Parquet as of now
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        validation: "\\.(parquet)$",
        validationMessage: "This field expects a file with a .parquet extension such as output.parquet."
      },
      {
        type: "radio",
        label: "Compression",
        id: "parquetOptions.compression",
        options: [
          { key: "snappy", value: "snappy", text: "Snappy", selected: true },
          { key: "gzip", value: "gzip", text: "GZip" },
          { key: "brotli", value: "brotli", text: "Brotli" },
          { key: "none", value: "None", text: "None" }
        ],
        advanced: true
      }
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
      type: ParquetFileOutput.Type,
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
          name: ParquetFileOutput.Name,
          ConfigForm: ParquetFileOutput.ConfigForm({ nodeId: id, data, context, manager, commands, store, setNodes }),
          Icon: ParquetFileOutput.Icon,
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

    let optionsString = Object.entries(config.parquetOptions || {})
      .filter(([key, value]) => value !== null && value !== '')
      .map(([key, value]) => `${key}='${value}'`)
      .join(', ');

    // Add comma only if optionsString is not empty
    optionsString = optionsString ? `, ${optionsString}` : '';

    const code = `
${inputName}.to_parquet('${config.filePath}'${optionsString})
`;
    return code;
  }

}
