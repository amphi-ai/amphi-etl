import { ILabShell } from '@jupyterlab/application';
import { IToolbarWidgetRegistry, Dialog, showDialog, ReactWidget, Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import {
  ABCWidgetFactory,
  Context,
  DocumentRegistry,
  DocumentWidget
} from '@jupyterlab/docregistry';
import { IDefaultFileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { Toolbar as UIToolbar, buildIcon, extensionIcon, inspectorIcon, listIcon, runIcon, saveIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Drag } from '@lumino/dragdrop';

import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Panel,
  ReactFlowProvider,
  addEdge,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  useEdgesState,
  useNodesState,
  useReactFlow
} from 'reactflow';

import { Tree } from 'antd';
import type { GetProps, TreeDataNode } from 'antd';
import { DownOutlined } from '@ant-design/icons';

type DirectoryTreeProps = GetProps<typeof Tree.DirectoryTree>;

const { DirectoryTree } = Tree;

import { CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import CustomEdge from './customEdge';
import 'reactflow/dist/style.css';
import '../style/output.css';
import { pipelineIcon } from './icons';
import { Dropzone } from './Dropzone';

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
  browserFactory: IFileBrowserFactory;
  defaultFileBrowser: IDefaultFileBrowser;
  shell: ILabShell;
  toolbarRegistry: IToolbarWidgetRegistry;
  commands: any;
  context: Context;
  settings: ISettingRegistry.ISettings;
  componentService: any;

  // Constructor
  constructor(options: any) {
    super();
    this.browserFactory = options.browserFactory;
    this.defaultFileBrowser = options.defaultFileBrowser;
    this.shell = options.shell;
    this.toolbarRegistry = options.toolbarRegistry;
    this.commands = options.commands;
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
        context={this.context}
        browserFactory={this.browserFactory}
        defaultFileBrowser={this.defaultFileBrowser}
        shell={this.shell}
        toolbarRegistry={this.toolbarRegistry}
        commands={this.commands}
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
  context: DocumentRegistry.Context;
  browserFactory: IFileBrowserFactory;
  defaultFileBrowser: IDefaultFileBrowser;
  shell: ILabShell;
  toolbarRegistry: IToolbarWidgetRegistry;
  commands: any;
  settings?: ISettingRegistry.ISettings;
  widgetId?: string;
  componentService: any;
}

const PipelineWrapper: React.FC<IProps> = ({
  context,
  browserFactory,
  defaultFileBrowser,
  shell,
  toolbarRegistry,
  commands,
  settings,
  widgetId,
  componentService,
}) => {


  const manager = defaultFileBrowser.model.manager;

  const edgeTypes = {
    'custom-edge': CustomEdge
  }

  const nodeTypes = componentService.getComponents().reduce((acc, component: any) => {
    const id = component._id;
    const ComponentUI = (props) => <component.UIComponent context={context} componentService={componentService} manager={manager} commands={commands} {...props} />;

    acc[id] = (props) => <ComponentUI context={context} componentService={componentService}  manager={manager} commands={commands} {...props} />;
    return acc;
  }, {});


  const getNodeId = () => `node_${+new Date()}`;

  function PipelineFlow(context) {

    const reactFlowWrapper = useRef(null);
    const defaultViewport = { x: 0, y: 0, zoom: 1 };
    const [pipeline, setPipeline] = useState<any>(context.context.model.toJSON());
    const pipelineId = pipeline['id']
    const initialNodes = pipeline['pipelines'][0]['flow']['nodes'];
    const initialEdges = pipeline['pipelines'][0]['flow']['edges'];
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [elements, setElements] = useState([]); // State for elements
    const [reactFlowInstance, setRfInstance] = useState(null);
    const { setViewport } = useReactFlow();

    const updatedPipeline = pipeline;
    updatedPipeline['pipelines'][0]['flow']['nodes'] = nodes;
    updatedPipeline['pipelines'][0]['flow']['edges'] = edges;

    // Save pipeline in current model
    // This means the file can then been save on "disk"
    context.context.model.fromJSON(updatedPipeline);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'custom-edge' }, eds)), [setEdges]);

    /* TODO (edge management)
    const onConnect = (params) => setElements((els) =>
    addEdge({ ...params, type: 'custom-edge' }, els)
    );
    */

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
      },
      [nodes, edges]
    );

    // Manage drag and drop
    const [defaultPosition, setDefaultPosition] = useState(10);

    const handleAddFileToPipeline = useCallback(
      (location?: { x: number; y: number }) => {

        const fileBrowser = defaultFileBrowser;
        
        // Only add file to pipeline if it is currently in focus
        if (shell.currentWidget?.id !== widgetId) {
          return;
        }
  
        if (reactFlowInstance && location) {
          const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
          // Adjust the position based on the React Flow instance's coordinate system
          const adjustedPosition = reactFlowInstance.project({
            x: location.x - reactFlowBounds.left,
            y: location.y - reactFlowBounds.top,
          });

          Array.from(fileBrowser.selectedItems()).forEach((item: any) => {
            const filePath = item.path;
            const { id: nodeType, default: nodeDefaults } = PipelineService.getComponentIdForFileExtension(item, componentService);
          
            // Check if nodeType exists
            if (nodeType) {
              const newNode = {
                id: getNodeId(),
                type: nodeType,
                position: adjustedPosition, // Make sure adjustedPosition is defined earlier as per the previous suggestions
                data: { 
                  filePath: filePath,
                  lastUpdated: Date.now(),
                  ...(nodeDefaults || {}) // Merge nodeDefaults into the data field
                }
              };
          
              // Add the new node to the pipeline
              setNodes((nds) => nds.concat(newNode));
            } else {
              // If nodeType doesn't exist, show the dialog
              showDialog({
                title: 'Unsupported File(s)',
                body: 'Only supported files (CSV, JSON, PDF, HTML, etc...) can be added to a pipeline.',
                buttons: [Dialog.okButton()]
              });
            }
          });
        
        } 
        return;
      },
      [defaultFileBrowser, defaultPosition, shell, widgetId, reactFlowInstance]
    );

    const handleFileDrop = async (e: Drag.Event): Promise<void> => {
      handleAddFileToPipeline({ x: e.offsetX, y: e.offsetY });
    };

    const onDragOver = useCallback((event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
      (event) => {
        event.preventDefault();

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');
        const config = event.dataTransfer.getData('additionalData');

        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
          return;
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        const newNode = {
          id: getNodeId(),
          type,
          position,
          data: {
            ...config,
            lastUpdated: Date.now(), // current timestamp in milliseconds
          }
        };

        setNodes((nds) => nds.concat(newNode));
      },
      [reactFlowInstance]
    );

    return (
      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
       <Dropzone onDrop={handleFileDrop}>
        <ReactFlow
          id={pipelineId}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodesDelete={onNodesDelete}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setRfInstance}
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          snapToGrid={true}
          snapGrid={[15, 15]}
          fitViewOptions={{ minZoom: 0.5, maxZoom: 1.0 }}
          fitView
          defaultViewport={defaultViewport}
          deleteKeyCode={[]}
        > 
          <Panel position="top-right">
          </Panel>
          <Controls />
          <Background color="#aaa" gap={15} />
        </ReactFlow>
        </Dropzone>
      </div>
    );
  }

  function Sidebar() {

    const [sidebarOpen, setSideBarOpen] = useState(false);
    const handleViewSidebar = () => {
      setSideBarOpen(!sidebarOpen);
    };
    const sidebarClass = sidebarOpen ? "" : "open";

    const onDragStart = (event, nodeType, config) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      // Here, you can add more data as needed
      event.dataTransfer.setData('additionalData', config);
      event.dataTransfer.effectAllowed = 'move';
    };

    const categorizedComponents = {
      input: [],
      transform: [],
      output: []
      // other: []
    };

    componentService.getComponents().forEach(component => {
      const category = categorizedComponents[component._category] || categorizedComponents['other'];
      category.push(component);
    });


    const treeData = Object.keys(categorizedComponents).map((category, index) => ({
      title: category.charAt(0).toUpperCase() + category.slice(1),
      key: `${index}`,
      children: categorizedComponents[category].map((component, childIndex) => ({
          title: (
            <span
              draggable
              onDragStart={(event) => onDragStart(event, component._id, component.getDefaultConfig ? component.getDefaultConfig() : '')}
            >
              {component._name}
            </span>
          ),
          key: `${index}-${childIndex}`,
          isLeaf: true,
          icon: <component._icon.react height="14px" width="14px;"/>
      }))
  }));

    return (

      <aside className={sidebarClass} title={'Components'}>

        <div className="description">
          <extensionIcon.react tag="span" width="24px" float="left" marginRight="8px" />
          Drag and drop components.
        </div>
        <DirectoryTree
          selectable={false}
          multiple
          blockNode
          defaultExpandAll
          treeData={treeData}
        />
      </aside>
    );
  }

  return (
    <div className="palette" id="pipeline-panel">
      <ReactFlowProvider>
        <PipelineFlow context={context} />
        <Sidebar/>
      </ReactFlowProvider>
    </div>
  );
}

export class PipelineEditorFactory extends ABCWidgetFactory<DocumentWidget> {
  browserFactory: IFileBrowserFactory;
  defaultFileBrowser: IDefaultFileBrowser
  shell: ILabShell;
  toolbarRegistry: IToolbarWidgetRegistry;
  commands: any;
  settings: ISettingRegistry.ISettings;
  componentService: any;

  constructor(options: any) {
    super(options);
    this.browserFactory = options.browserFactory;
    this.defaultFileBrowser = options.defaultFileBrowser;
    this.shell = options.shell;
    this.toolbarRegistry = options.toolbarRegistry;
    this.commands = options.commands;
    this.settings = options.settings;
    this.componentService = options.componentService;
  }

  protected createNewWidget(context: DocumentRegistry.Context): DocumentWidget {

    // Creates a blank widget with a DocumentWidget wrapper
    const props = {
      shell: this.shell,
      toolbarRegistry: this.toolbarRegistry,
      commands: this.commands,
      browserFactory: this.browserFactory,
      defaultFileBrowser: this.defaultFileBrowser,
      context: context,
      settings: this.settings,
      componentService: this.componentService,
    };

    context.sessionContext.kernelPreference = {autoStartDefault:true, name: 'python', shutdownOnDispose: false};

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

    // Add generate code button
    const generateCodeButton = new ToolbarButton({
      label: 'Export to Python code',
      iconLabel: 'Export to Python code',
      icon: buildIcon,
      onClick: async () => {
        const code = CodeGenerator.generateCode(context.model.toString(), this.commands, this.componentService);
        // Create a new untitled python file
        const file = await this.commands.execute('docmanager:new-untitled', { path: '/', type: 'file', ext: '.py' }); // TODO, create file in same folder
        // Open the newly created python file
        const doc = await this.commands.execute('docmanager:open', { path: file.path });
        // Set the generated code into the file
        doc.context.model.fromString(code);
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
        const code = CodeGenerator.generateCode(context.model.toString(), this.commands, this.componentService);

        this.commands.execute('pipeline-editor:run-pipeline', { code }).catch(reason => {
          console.error(
            `An error occurred during the execution of 'pipeline-editor:run-pipeline'.\n${reason}`
          );
        });
      }
    });
    widget.toolbar.addItem('runPipeline', runButton);

    // Add Metadata panel
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
      }
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
