import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../icons';

export class PdfFileInput extends PipelineComponent<ComponentItem>() {

  public _name = 'PDF File Input';
  public _id = 'pdfInput';
  public _type = 'pandas_df_input';
  public _fileDrop = [ "pdf" ];
  public _category = 'input';
  public _icon = fileTextIcon;
  public _default = { strategy: "fast" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "file",
        label: "File path",
        id: "filePath",
        placeholders: "Select or type file",
        validation: "\\.(pdf)$",
        validationMessage: "This field expects a file with a pdf extension such as file.pdf."
      },
      {
        type: "singleInputSelect",
        label: "Strategy",
        id: "strategy",
        options: [
          { value: "fast", label: "Fast" }
        ]
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
    
    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: PdfFileInput.Type,
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
          name: PdfFileInput.Name,
          ConfigForm: PdfFileInput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
          Icon: PdfFileInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideDependencies({config}): string[] {
    let deps: string[] = [];
    deps.push('pdf2image');
    deps.push('pdfminer.six');
    deps.push('pillow_heif');
    deps.push('opencv-python');
    deps.push('pikepdf');
    return deps;
  }

  public provideImports({config}): string[] {
    let imports: string[] = [];
    imports.push('import pandas as pd');
    imports.push('from unstructured.partition.pdf import partition_pdf');
    imports.push('from unstructured.staging.base import convert_to_dataframe');

    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    let code = '';

  // Initial code for loading HTML
    code += `
# Read PDF and retrieve text from ${config.filePath}
${outputName}_elements = partition_pdf(
  filename="${config.filePath}",
  strategy="${config.strategy}",
  extract_images_in_pdf=False
)
${outputName} = convert_to_dataframe(${outputName}_elements)
`
return code;
}



}
