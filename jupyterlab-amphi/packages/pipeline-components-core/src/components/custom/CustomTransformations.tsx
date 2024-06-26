import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { codeIcon } from '../../icons';

export class CustomTransformations extends PipelineComponent<ComponentItem>() {

  public _name = "Custom Code";
  public _id = "customTransformations";
  public _type = "pandas_df_processor";
  public _category = "Custom";
  public _icon = codeIcon;
  public _default = { code: "output = input" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "info",
        label: "Instructions",
        id: "instructions",
        text: "Write Python code with 'input' being the input dataframe, and 'output' the output dataframe.",
      },
      {
        type: "codeTextarea",
        label: "Imports",
        id: "imports",
        placeholder: "import pandas as pd",
        height: '50px',
        advanced: true
      },
      {
        type: "codeTextarea",
        label: "Code",
        id: "code",
        mode: "python",
        height: '300px',
        placeholder: "output = input",
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
      type: CustomTransformations.Type,
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
          name: CustomTransformations.Name,
          ConfigForm: CustomTransformations.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: CustomTransformations.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport,
        })}
      </>
    );
  }

  public provideImports(config): string[] {
    let imports: string[] = [];

    // Always add 'import pandas as pd'
    imports.push("import pandas as pd");

    // Check if config.imports exists and is a string
    if (config.imports && typeof config.imports === 'string') {
      // Split config.imports by lines, filter lines starting with 'import '
      const importLines = config.imports.split('\n').filter(line => line.trim().startsWith('import ') || line.trim().startsWith('from '));
      console.log("imports lines: %o ", importLines)

      // Push each filtered import line to the imports array
      imports.push(...importLines);
    }

    return imports;
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    let code = `\n${config.code}`.replace(/input/g, inputName);
    code = code.replace(/output/g, outputName);
    return code;
  }
}