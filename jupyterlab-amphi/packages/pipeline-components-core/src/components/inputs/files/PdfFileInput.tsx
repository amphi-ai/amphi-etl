import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { fileTextIcon } from '../../../icons';

export class PdfFileInput extends PipelineComponent<ComponentItem>() {

  public _name = 'PDF File Input';
  public _id = 'pdfInput';
  public _type = 'documents_input';
  public _fileDrop = ["pdf"];
  public _category = 'input';
  public _icon = fileTextIcon;
  public _default = { library: "PyPDF" };
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
        type: "select",
        label: "Library",
        id: "library",
        options: [
          { value: "PyPDF", label: "PyPDF" },
          { value: "PyMuPDF", label: "PyMuPDF" }
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
      type: PdfFileInput.Type,
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
          name: PdfFileInput.Name,
          ConfigForm: PdfFileInput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: PdfFileInput.Icon,
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
    switch (config.library) {
      case 'PyPDF':
        deps.push('pypdf');
        break;
      case 'PyMuPDF':
        deps.push('pymupdf');
        break;
      default:
        console.error('Unknown option');
    }

    return deps;
  }

  public provideImports({ config }): string[] {
    let imports: string[] = [];
    switch (config.library) {
      case 'PyPDF':
        imports.push('from langchain_community.document_loaders import PyPDFLoader');
        break;
      case 'PyMuPDF':
        imports.push('from langchain_community.document_loaders import PyMuPDFLoader');
        break;
      default:
        console.error('Unknown option');
    }

    return imports;
  }

  public generateComponentCode({ config, outputName }): string {
    let code = '';
  
    // Initial code for loading HTML
    code += `
# Read PDF and retrieve text from ${config.filePath}
`;
  
    switch (config.library) {
      case 'PyPDF':
        code += `${outputName}_loader = PyPDFLoader("${config.filePath}")\n`;
        break;
      case 'PyMuPDF':
        code += `${outputName}_loader = PyMuPDFLoader("${config.filePath}")\n`;
        break;
      default:
        console.error('Unknown option');
        code += `# Unknown library option\n`;
    }
  
  code += `${outputName} = ${outputName}_loader.load()\n`;
  
    return code;
  }



}
