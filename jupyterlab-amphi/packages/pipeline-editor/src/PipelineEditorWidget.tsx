import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, IToolbarWidgetRegistry, ReactWidget, Toolbar, ToolbarButton, showDialog } from '@jupyterlab/apputils';
import {
  ABCWidgetFactory,
  Context,
  DocumentRegistry,
  DocumentWidget
} from '@jupyterlab/docregistry';
import { IDefaultFileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ContentsManager } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Toolbar as UIToolbar, codeIcon, listIcon, runIcon, saveIcon } from '@jupyterlab/ui-components';
import { Drag } from '@lumino/dragdrop';
import { Widget } from '@lumino/widgets';
import { useUndoRedo } from './Commands';
import DownloadImageButton from './ExportToImage';
import Sidebar from './Sidebar';

import React, { useCallback, useRef, useState, Profiler } from 'react';
import ReactFlow, {
  Background,
  Controls,
  NodeDragHandler,
  OnConnect,
  OnEdgesDelete,
  Panel,
  ReactFlowProvider,
  SelectionDragHandler,
  addEdge,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi
} from 'reactflow';
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'


import { ConfigProvider } from 'antd';
import { CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import ReactDOM from 'react-dom';
import 'reactflow/dist/style.css';
import CustomEdge from './customEdge';
import { Dropzone } from './Dropzone';
import { pipelineIcon } from './icons';

import CodeEditor from './CodeEditor';

const PIPELINE_CLASS = 'amphi-PipelineEditor';

export const commandIDs = {
  openDocManager: 'docmanager:open',
  newDocManager: 'docmanager:new-untitled',
  saveDocManager: 'docmanager:save',
};



export const FitViewOptions = {
  padding: 10,
  maxZoom: 1.0
}

/**
 * Initialization: The class extends ReactWidget and initializes the pipeline editor widget. It sets up the initial properties and state for the widget.
 */
export class PipelineEditorWidget extends ReactWidget {
  app: JupyterFrontEnd;
  browserFactory: IFileBrowserFactory;
  defaultFileBrowser: IDefaultFileBrowser;
  shell: ILabShell;
  toolbarRegistry: IToolbarWidgetRegistry;
  commands: any;
  rendermimeRegistry: IRenderMimeRegistry;
  context: Context;
  settings: ISettingRegistry.ISettings;
  componentService: any;

  // Constructor
  constructor(options: any) {
    super();
    this.app = options.app;
    this.browserFactory = options.browserFactory;
    this.defaultFileBrowser = options.defaultFileBrowser;
    this.shell = options.shell;
    this.toolbarRegistry = options.toolbarRegistry;
    this.commands = options.commands;
    this.rendermimeRegistry = options.rendermimeRegistry;
    this.context = options.context;
    this.settings = options.settings;
    this.componentService = options.componentService;
    let nullPipeline = this.context.model.toJSON() === null;
    this.context.model.contentChanged.connect(() => {
      if (nullPipeline) {
        nullPipeline = false;
        this.update();
      }
    });
  }

  /*
  * Rendering: The render() method is responsible for rendering the widget's UI. 
  * It uses various components and elements to display the pipeline editor's interface.
  */

  render(): any {

    if (this.context.model.toJSON() === null) {
      return <div className="amphi-loader"></div>;
    }

    return (
      <PipelineWrapper
        app={this.app}
        context={this.context}
        browserFactory={this.browserFactory}
        defaultFileBrowser={this.defaultFileBrowser}
        shell={this.shell}
        toolbarRegistry={this.toolbarRegistry}
        commands={this.commands}
        rendermimeRegistry={this.rendermimeRegistry}
        widgetId={this.parent?.id}
        settings={this.settings}
        componentService={this.componentService}
      />
    );
  }
}

/*
 * 
 * The IProps interface in the PipelineEditorWidget.tsx file defines the expected properties (props)
 * that the PipelineEditorWidget component should receive when it's instantiated or used within another component.
 */
interface IProps {
  app: JupyterFrontEnd;
  context: DocumentRegistry.Context;
  browserFactory: IFileBrowserFactory;
  defaultFileBrowser: IDefaultFileBrowser;
  shell: ILabShell;
  toolbarRegistry: IToolbarWidgetRegistry;
  commands: any;
  rendermimeRegistry: IRenderMimeRegistry;
  settings?: ISettingRegistry.ISettings;
  widgetId?: string;
  componentService: any;
}

const PipelineWrapper: React.FC<IProps> = ({
  app,
  context,
  browserFactory,
  defaultFileBrowser,
  shell,
  toolbarRegistry,
  commands,
  rendermimeRegistry,
  settings,
  widgetId,
  componentService,
}) => {


  const manager = defaultFileBrowser.model.manager;

  const edgeTypes = {
    'custom-edge': CustomEdge
  }

  const nodeTypes = {
    ...componentService.getComponents().reduce((acc, component: any) => {
      const id = component._id;
      const ComponentUI = (props) => (
        <component.UIComponent
          context={context}
          componentService={componentService}
          manager={manager}
          commands={commands}
          rendermimeRegistry={rendermimeRegistry}
          settings={settings}
          {...props}
        />
      );

      acc[id] = (props) => (
        <ComponentUI
          context={context}
          componentService={componentService}
          manager={manager}
          commands={commands}
          {...props}
        />
      );
      return acc;
    }, {})
  };

  const getNodeId = () => `node_${+new Date()}`;
  let defaultEngineBackend = settings.get('defaultEngineBackend').composite as string;
  console.log(
    `Settings extension in PipelineEditor: defaultEngineBackend is set to '${defaultEngineBackend}'`
  );

  let enableTelemetry = settings.get('enableTelemetry').composite as boolean;
  if (enableTelemetry) {

    function maskedSensitiveParams(url) {
      try {
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.host}`;
      } catch (error) {
        // Return original URL if parsing fails
        return url;
      }
    }
    

    posthog.init('phc_V56mYhYAQdzJl5tMM2RFedJWbXlbyxDnSj2KMbUX8x3', {
      api_host: 'https://us.i.posthog.com',
      autocapture: false,
      person_profiles: 'always',
      sanitize_properties: function (properties, _event) {
        // Sanitize current url
        if (properties[`$current_url`]) {
          properties[`$current_url`] = maskedSensitiveParams(properties[`$current_url`]);
        }

        // Remove path name
        if (properties[`$path_name`]) {
          properties[`$path_name`] = '';
        }
        return properties;
      }
        
    })
  }

  function PipelineFlow(context) {

    const model = context.context.model;
    const reactFlowWrapper = useRef(null);
    const [pipeline, setPipeline] = useState<any>(context.context.model.toJSON());

    const pipelineId = pipeline['id']
    const initialNodes = pipeline['pipelines'][0]['flow']['nodes'].map(node => ({
      ...node,
      data: {
        ...node.data,
        lastUpdated: 0,
        lastExecuted: 0
      }
    }));
    const initialEdges = pipeline['pipelines'][0]['flow']['edges'];
    const initialViewport = pipeline['pipelines'][0]['flow']['viewport'];
    const defaultViewport = { x: 0, y: 0, zoom: 1 };
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setRfInstance] = useState(null);
    const { getViewport, setViewport } = useReactFlow();
    const store = useStoreApi();


    // Copy paste
    // const { cut, copy, paste, bufferedNodes } = useCopyPaste();

    // Undo and Redo
    const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo();

    const onNodeDragStart: NodeDragHandler = useCallback(() => {
      // 👇 make dragging a node undoable
      takeSnapshot();
      // 👉 you can place your event handlers here
    }, [takeSnapshot]);

    const onSelectionDragStart: SelectionDragHandler = useCallback(() => {
      // 👇 make dragging a selection undoable
      takeSnapshot();
    }, [takeSnapshot]);

    const onEdgesDelete: OnEdgesDelete = useCallback(() => {
      // 👇 make deleting edges undoable
      takeSnapshot();
    }, [takeSnapshot]);

    const updatedPipeline = pipeline;
    updatedPipeline['pipelines'][0]['flow']['nodes'] = nodes;
    updatedPipeline['pipelines'][0]['flow']['edges'] = edges;
    updatedPipeline['pipelines'][0]['flow']['viewport'] = getViewport();

    // Save pipeline in current model
    // This means the file can then been save on "disk"
    context.context.model.fromJSON(updatedPipeline);

    // const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'custom-edge' }, eds)), [setEdges]);

    const onConnect: OnConnect = useCallback(
      (connection) => {
        takeSnapshot();

        // Find source and target nodes
        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode = nodes.find(node => node.id === connection.target);

        // Check if both sourceNode and targetNode exist
        if (sourceNode && targetNode) {
          // Check if source node has data.backend.engine
          const sourceBackend = sourceNode.data?.backend;
          if (sourceBackend?.engine) {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === targetNode.id
                  ? {
                    ...node,
                    data: {
                      ...node.data,
                      backend: {
                        ...node.data.backend,
                        engine:
                          node.data?.backend?.prefix &&
                            node.data.backend.prefix !== sourceBackend.prefix
                            ? node.data.backend.engine
                            : sourceBackend.engine,
                        prefix:
                          node.data?.backend?.prefix &&
                            node.data.backend.prefix !== sourceBackend.prefix
                            ? node.data.backend.prefix
                            : sourceBackend.prefix
                      }
                    }
                  }
                  : node
              )
            );
          }
        }

        // Add the edge to the flow
        setEdges((edges) => addEdge({ ...connection, type: 'custom-edge' }, edges));
      },
      [nodes, takeSnapshot]
    );

    const getCategory = (nodeId: string): string | undefined => {
      const node = nodes.find(node => node.id === nodeId);
      if (node) {
        return componentService.getComponent(node.type)._type;
      }
      return undefined;
    };

    const isValidConnection = (connection): boolean => {

      const sourceCategory = getCategory(connection.source);
      const targetCategory = getCategory(connection.target);

      if ((sourceCategory === "pandas_df_to_documents_processor")) {
        return targetCategory.startsWith("documents");
      } else if (sourceCategory.startsWith("documents")) {
        return targetCategory.startsWith("documents");
      } else if (sourceCategory.startsWith("pandas_df")) {
        return targetCategory.startsWith("pandas_df");
      } else if (sourceCategory.startsWith("ibis_df")) {
        return targetCategory.startsWith("ibis_df");
      } else {
        return false;
      }
    };

    const onNodesDelete = useCallback(
      (deleted) => {
        setEdges(
          deleted.reduce((acc, node) => {
            const incomers = getIncomers(node, nodes, edges);
            const outgoers = getOutgoers(node, nodes, edges);
            const connectedEdges = getConnectedEdges([node], edges);

            const remainingEdges = acc.filter((edge) => !connectedEdges.includes(edge));

            const createdEdges = incomers.flatMap(({ id: source }) =>
              outgoers.map(({ id: target }) => ({ id: `${source}->${target}`, source, target, type: 'custom-edge' }))
            );

            return [...remainingEdges, ...createdEdges];
          }, edges)
        );
        takeSnapshot();
      },
      [nodes, edges, takeSnapshot]
    );

    function generateUniqueNodeName(type: string, nodes: any): string {

      // Filter nodes of the same type with a name
      const existingNodesOfType = nodes.filter(
        node => node.type === type && node.data?.nameId
      );

      // Extract numbers from the node names
      const numbers = existingNodesOfType.map(node => {
        const regex = new RegExp(`^${type}(\\d+)$`);
        const match = node.data.nameId.match(regex);
        return match ? parseInt(match[1], 10) : 0;
      });

      const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

      // Create a new name by incrementing the highest number
      const nameId = `${type}${maxNumber + 1}`;

      return nameId;
    }

    const handleAddFileToPipeline = useCallback(
      (location?: { x: number; y: number }) => {
        const fileBrowser = defaultFileBrowser;

        // Only add file to pipeline if it is currently in focus
        if (shell.currentWidget?.id !== widgetId) {
          return;
        }

        if (reactFlowInstance && location) {
          const {
            height,
            width,
            transform: [transformX, transformY, zoomLevel]
          } = store.getState();
          const zoomMultiplier = 1 / zoomLevel;

          // Calculate the adjusted position based on the transformation values and zoom level
          const adjustedPosition = {
            x: (location.x - transformX) * zoomMultiplier,
            y: (location.y - transformY) * zoomMultiplier,
          };

          Array.from(fileBrowser.selectedItems()).forEach(async (item: any) => {
            const filePath = item.path;
            const fileExtension = item.name.split('.').pop();
            const fileName = item.name.split('/').pop();

            if (fileExtension === "amcpn") {
              const contentsManager = new ContentsManager();
              try {
                const file = await contentsManager.get(filePath);

                const content = file.content;

                const fileData = JSON.parse(content);

                const { type: nodeType, data: nodeData } = fileData.component;

                if (nodeType && nodeData) {
                  const newNode = {
                    id: getNodeId(),
                    type: nodeType,
                    position: adjustedPosition,
                    data: {
                      nameId: generateUniqueNodeName(nodeType, nodes),
                      ...nodeData,
                      lastUpdated: Date.now()
                    }
                  };

                  setNodes((nds) => nds.concat(newNode));
                } else {
                  showDialog({
                    title: 'Invalid Component',
                    body: 'The selected file does not contain valid component data.',
                    buttons: [Dialog.okButton()]
                  });
                }
              } catch (error) {
                showDialog({
                  title: 'Error Reading File',
                  body: `There was an error reading the file.`,
                  buttons: [Dialog.okButton()]
                });
              }
              return;
            }

            const { id: nodeType, default: nodeDefaults } = PipelineService.getComponentIdForFileExtension(fileExtension, componentService, defaultEngineBackend);
            const defaultConfig = componentService.getComponent(nodeType)['_default']

            // Check if nodeType exists
            if (nodeType) {
              const newNode = {
                id: getNodeId(),
                type: nodeType,
                position: adjustedPosition,
                data: {
                  ...defaultConfig,
                  nameId: generateUniqueNodeName(nodeType, nodes),
                  filePath: PipelineService.getRelativePath(context.context.sessionContext.path, filePath), // Relative path
                  lastUpdated: Date.now(),
                  customTitle: fileName,
                  ...(nodeDefaults || {}), // Merge nodeDefaults into the data field
                }
              };

              // Anonymous telemetry
              if (enableTelemetry) {
                posthog.capture('component_drop', {
                  drag_type: "file browser",
                  node_type: nodeType
                })
              }

              // Add the new node to the pipeline
              setNodes((nds) => nds.concat(newNode));
            } else {
              // If nodeType doesn't exist, show the dialog
              showDialog({
                title: 'Unsupported File(s)',
                body: 'Only supported files can be added to a pipeline.',
                buttons: [Dialog.okButton()]
              });
            }
          });
        }
        return;
      },
      [defaultFileBrowser, shell, widgetId, reactFlowInstance, nodes]
    );

    const handleFileDrop = async (e: Drag.Event): Promise<void> => {
      takeSnapshot();
      handleAddFileToPipeline({ x: e.offsetX, y: e.offsetY });
    };

    const onDragOver = useCallback((event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
      (event) => {
        takeSnapshot();
        event.preventDefault();

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');
        const config = JSON.parse(event.dataTransfer.getData('additionalData'));
        const nodeId = getNodeId();

        const defaultConfig = componentService.getComponent(type)['_default']

        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
          return;
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
          id: nodeId,
          type,
          position,
          data: {
            ...defaultConfig,
            nameId: generateUniqueNodeName(type, nodes),
            ...config,
            lastUpdated: Date.now(), // current timestamp in milliseconds
          }
        };

        setNodes((nds) => nds.concat(newNode));

        // Anonymous telemetry
        if (enableTelemetry) {
          posthog.capture('component_drop', {
            drag_type: "palette",
            node_type: type
          })
        }
      },
      [reactFlowInstance, nodes]
    );

    const onViewportChange = useCallback(
      (viewport) => {
        const updatedPipeline = { ...pipeline };
        updatedPipeline['pipelines'][0]['flow']['viewport'] = viewport;
        context.context.model.fromJSON(updatedPipeline);
      },
      [pipeline, context]
    );

    const proOptions = { hideAttribution: true };

    return (
      <div className="reactflow-wrapper" data-id={pipelineId} ref={reactFlowWrapper}>
        <Profiler id={pipelineId} onRender={(id, phase, actualDuration) => {
          console.log({ id, phase, actualDuration });
        }}>
          <Dropzone onDrop={handleFileDrop}>
            <ReactFlow
              id={pipelineId}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onNodesDelete={onNodesDelete}
              onEdgesDelete={onEdgesDelete}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStart={onNodeDragStart}
              onSelectionDragStart={onSelectionDragStart}
              isValidConnection={isValidConnection}
              onDrop={onDrop}
              onDragOver={onDragOver}
              // onNodeDrag={onNodeDrag}
              // onNodeDragStop={onNodeDragStop}
              onInit={setRfInstance}
              edgeTypes={edgeTypes}
              nodeTypes={nodeTypes}
              snapToGrid={true}
              snapGrid={[15, 15]}
              fitViewOptions={{ minZoom: 0.5, maxZoom: 1.0, padding: 0.4 }}
              defaultViewport={initialViewport}
              // viewport={initialViewport}
              // onViewportChange={onViewportChange}
              deleteKeyCode={["Delete", "Backspace"]}
              proOptions={proOptions}
            >
              <Panel position="top-right">
              </Panel>
              <Controls>
                <DownloadImageButton pipelineName={context.context.sessionContext.path} pipelineId={pipelineId} />
              </Controls>
              <Background color="#aaa" gap={20} />
            </ReactFlow>
          </Dropzone>
        </Profiler>
      </div >
    );
  }


  return (
    <div className="canvas" id="pipeline-panel">
      <ConfigProvider
        theme={{
          token: {
            // Seed Token
            colorPrimary: '#5F9B97',
          },
        }}
      >
        <ReactFlowProvider>
          <PipelineFlow context={context} />
          <Sidebar componentService={componentService} />
        </ReactFlowProvider>
      </ConfigProvider>
    </div>
  );
}

export class PipelineEditorFactory extends ABCWidgetFactory<DocumentWidget> {
  app: JupyterFrontEnd;
  browserFactory: IFileBrowserFactory;
  defaultFileBrowser: IDefaultFileBrowser
  shell: ILabShell;
  toolbarRegistry: IToolbarWidgetRegistry;
  commands: any;
  settings: ISettingRegistry.ISettings;
  componentService: any;

  constructor(options: any) {
    super(options);
    this.app = options.app;
    this.browserFactory = options.browserFactory;
    this.defaultFileBrowser = options.defaultFileBrowser;
    this.shell = options.app.shell;
    this.toolbarRegistry = options.toolbarRegistry;
    this.commands = options.app.commands;
    this.settings = options.settings;
    this.componentService = options.componentService;
  }

  protected createNewWidget(context: DocumentRegistry.Context): DocumentWidget {

    // Creates a blank widget with a DocumentWidget wrapper
    const props = {
      app: this.app,
      shell: this.shell,
      toolbarRegistry: this.toolbarRegistry,
      commands: this.commands,
      browserFactory: this.browserFactory,
      defaultFileBrowser: this.defaultFileBrowser,
      context: context,
      settings: this.settings,
      componentService: this.componentService,
    };

    let enableExecution = this.settings.get('enableExecution').composite as boolean;
    console.log(
      `Settings extension in PipelineEditor: enableExecution is set to '${enableExecution}'`
    );
    if (enableExecution) {
      context.sessionContext.kernelPreference = { autoStartDefault: true, name: 'python', shutdownOnDispose: false };
    } else {
      context.sessionContext.kernelPreference = { shouldStart: false, canStart: false, shutdownOnDispose: true };
    }

    const content = new PipelineEditorWidget(props);
    const widget = new DocumentWidget({ content, context });

    // Add save button
    // const saveButton = DocToolbarItems.createSaveButton(this.commands, context.fileChanged);
    const saveButton = new ToolbarButton({
      label: 'Save Pipeline', // Your desired label
      icon: saveIcon, // Assuming you have a save icon
      onClick: () => {
        this.commands.execute('docmanager:save');
      }
    });
    widget.toolbar.addItem('save', saveButton);

    async function showCodeModal(code: string, commands) {
      const editorDiv = document.createElement('div');
      editorDiv.style.width = '900px';
      editorDiv.style.height = '1000px';

      const widget = new Widget({ node: editorDiv });
      ReactDOM.render(<CodeEditor code={code} />, editorDiv);

      const saveAsFile = async () => {
        const file = await commands.execute('docmanager:new-untitled', { path: '/', type: 'file', ext: '.py' });
        const doc = await commands.execute('docmanager:open', { path: file.path });
        doc.context.model.fromString(code);
      };

      const result = await showDialog({
        title: 'Generated Python Code',
        body: widget,
        buttons: [Dialog.okButton({ label: 'Close' }),
        Dialog.createButton({
          label: 'Open in new file',
          className: '',
          accept: true
        })],
      });

      if (result.button.label === 'Open in new file') {
        await saveAsFile();
      }
      // Render the AceEditor inside the dialog
    }

    // Add generate code button
    const generateCodeButton = new ToolbarButton({
      label: 'Export to Python code',
      iconLabel: 'Export to Python code',
      icon: codeIcon,
      onClick: async () => {
        const code = await CodeGenerator.generateCode(context.model.toString(), this.commands, this.componentService, true);
        showCodeModal(code, this.commands);
      }
    });
    widget.toolbar.addItem('generateCode', generateCodeButton);


    // Add run button
    const runButton = new ToolbarButton({
      label: 'Run Pipeline',
      iconLabel: 'Run Pipeline',
      icon: runIcon,
      onClick: async () => {
        // First save document
        this.commands.execute('docmanager:save');

        // Second, generate code
        const code = CodeGenerator.generateCode(context.model.toString(), this.commands, this.componentService, true);

        this.commands.execute('pipeline-editor:run-pipeline', { code }).catch(reason => {
          console.error(
            `An error occurred during the execution of 'pipeline-editor:run-pipeline'.\n${reason}`
          );
        });
      },
      enabled: enableExecution
    });
    widget.toolbar.addItem('runPipeline', runButton);

    // Add Metadata panel
    /*
    const previewPanel = new ToolbarButton({
      label: 'Metadata Panel',
      iconLabel: 'Metadata Panel',
      icon: inspectorIcon,
      onClick: async () => {
        // Call the command execution
        const command = 'metadatapanel:open';
        this.commands.execute(command, {}).catch(reason => {
          console.error(
            `An error occurred during the execution of ${command}.\n${reason}`
          );
        });
      }
    });
    widget.toolbar.addItem('openPreviewPanel', previewPanel);
    */

    // Add Log panel
    const logconsole = new ToolbarButton({
      label: 'Console',
      iconLabel: 'Console',
      icon: listIcon,
      onClick: async () => {
        // Call the command execution
        const command = 'pipeline-console:open';
        this.commands.execute(command, {}).catch(reason => {
          console.error(
            `An error occurred during the execution of ${command}.\n${reason}`
          );
        });
      },
      enabled: enableExecution
    });


    widget.toolbar.addItem('openlogconsole', logconsole);

    const kernelName = Toolbar.createKernelNameItem(
      props.context.sessionContext
    )
    const spacer = UIToolbar.createSpacerItem();
    widget.toolbar.addItem('spacer', spacer);
    widget.toolbar.addItem('kernelName', kernelName);

    // add restart runtime button
    /*
    const restartButton = new ToolbarButton({
        label: 'Restart Runtime',
        iconLabel: 'Restart Runtime',
        icon: refreshIcon,
        onClick: async () => {
          // Call the command execution
          const command = 'pipeline-editor:restart-kernel';
          this.commands.execute(command, {}).catch(reason => {
          
          console.error(
            `An error occurred during the execution of ${command}.\n${reason}`
          );
        });
        }
    });
    widget.toolbar.addItem('restartKernel', restartButton);
    */

    widget.addClass(PIPELINE_CLASS);
    widget.title.icon = pipelineIcon;
    return widget;
  }
}
