import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../../../icons';

export class PdfTablesInput extends PipelineComponent<ComponentItem>() {

  public _name = "PDF Tables Input";
  public _id = "pdfTablesInput";
  public _type = "pandas_df_input";
  public _category = "input";
  public _icon = fileTextIcon;
  public _default = { pageNumber: 0, tableNumber: 0 };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholder: "Type file name",
        tooltip: "This field expects a file path with a csv, tsv or txt extension such as input.csv.",
        validation: "\\.(pdf)$",
      },
      {
        type: "inputNumber",
        label: "Page number",
        id: "pageNumber",
        tooltip: "Page number where table is located starting at 0.",
      },
      {
        type: "inputNumber",
        label: "Table number",
        id: "tableNumber",
        tooltip: "If multiple tables are present on the page, specify the number starting at 0.",
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
      type: PdfTablesInput.Type,
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
          name: PdfTablesInput.Name,
          ConfigForm: PdfTablesInput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: PdfTablesInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
        })}
      </>
    );
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('PyMuPDF');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import fitz"];
  }

  public generateComponentCode({ config, outputName }): string {
  
    // Generate the Python code
    const code = `
# Extract tables from ${config.filePath}
${outputName}_doc = fitz.open("${config.filePath}")
${outputName}_tabs = ${outputName}_doc[${config.pageNumber}].find_tables() # detect the tables
${outputName} = ${outputName}_tabs[${config.tableNumber}].to_pandas()
`;
    return code;
}

}
