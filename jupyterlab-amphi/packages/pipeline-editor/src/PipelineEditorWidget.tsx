import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { IToolbarWidgetRegistry, Dialog, showDialog, ReactWidget, Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import {
  ABCWidgetFactory,
  Context,
  DocumentRegistry,
  DocumentWidget
} from '@jupyterlab/docregistry';
import { IDefaultFileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { Toolbar as UIToolbar, buildIcon, listIcon, runIcon, saveIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Drag } from '@lumino/dragdrop';
import { Widget } from '@lumino/widgets';
import DownloadImageButton from './ExportToImage';
import { useUndoRedo } from './Commands';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Panel,
  ReactFlowProvider,
  addEdge,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  OnConnect,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  NodeDragHandler,
  SelectionDragHandler,
  OnEdgesDelete,
  ControlButton
} from 'reactflow';

import { Tree, TabsProps, Tabs, ConfigProvider } from 'antd';

const { DirectoryTree } = Tree;

import { CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import CustomEdge from './customEdge';
import 'reactflow/dist/style.css';
import '../style/output.css';
import { pipelineIcon } from './icons';
import { Dropzone } from './Dropzone';
import ReactDOM from 'react-dom';

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

    acc[id] = (props) => <ComponentUI context={context} componentService={componentService} manager={manager} commands={commands} {...props} />;
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
    const store = useStoreApi();

    // Proximity connect
    /*
    const MIN_DISTANCE = 150;

    const getClosestEdge = useCallback((node) => {
      const { nodeInternals } = store.getState();
      const storeNodes = Array.from(nodeInternals.values());

      const closestNode = storeNodes.reduce(
        (res, n) => {
          if (n.id !== node.id) {
            const dx = n.positionAbsolute.x - node.positionAbsolute.x;
            const dy = n.positionAbsolute.y - node.positionAbsolute.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < res.distance && d < MIN_DISTANCE) {
              res.distance = d;
              res.node = n;
            }
          }

          return res;
        },
        {
          distance: Number.MAX_VALUE,
          node: null,
        },
      );

      if (!closestNode.node) {
        return null;
      }

      const closeNodeIsSource =
        closestNode.node.positionAbsolute.x < node.positionAbsolute.x;

      return {
        id: closeNodeIsSource
          ? `${closestNode.node.id}-${node.id}`
          : `${node.id}-${closestNode.node.id}`,
        source: closeNodeIsSource ? closestNode.node.id : node.id,
        target: closeNodeIsSource ? node.id : closestNode.node.id,
      };
    }, []);

    const onNodeDrag = useCallback(
      (_, node) => {
        const closeEdge = getClosestEdge(node);
  
        setEdges((es) => {
          const nextEdges = es.filter((e) => e.className !== 'temp');
  
          if (
            closeEdge &&
            !nextEdges.find(
              (ne) =>
                ne.source === closeEdge.source && ne.target === closeEdge.target,
            )
          ) {
            // closeEdge.className = 'temp';
            nextEdges.push(closeEdge);
          }
  
          return nextEdges;
        });
      },
      [getClosestEdge, setEdges],
    );
  
    const onNodeDragStop = useCallback(
      (_, node) => {
        const closeEdge = getClosestEdge(node);
  
        setEdges((es) => {
          const nextEdges = es.filter((e) => e.className !== 'temp');
  
          if (
            closeEdge &&
            !nextEdges.find(
              (ne) =>
                ne.source === closeEdge.source && ne.target === closeEdge.target,
            )
          ) {
            nextEdges.push(closeEdge);
          }
  
          return nextEdges;
        });
      },
      [getClosestEdge],
    );
    */

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

    // Save pipeline in current model
    // This means the file can then been save on "disk"
    context.context.model.fromJSON(updatedPipeline);

    // const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'custom-edge' }, eds)), [setEdges]);

    const onConnect: OnConnect = useCallback(
      (connection) => {
        // 👇 make adding edges undoable
        takeSnapshot();
        setEdges((edges) => addEdge({ ...connection, type: 'custom-edge' }, edges));
      },
      [setEdges, takeSnapshot]
    );


    const getCategory = (nodeId: string): string | undefined => {
      const node = nodes.find(node => node.id === nodeId);
      console.log("node %o", node)
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

          Array.from(fileBrowser.selectedItems()).forEach((item: any) => {
            const filePath = item.path;
            const { id: nodeType, default: nodeDefaults } = PipelineService.getComponentIdForFileExtension(item, componentService);

            // Check if nodeType exists
            if (nodeType) {
              const newNode = {
                id: getNodeId(),
                type: nodeType,
                position: adjustedPosition,
                data: {
                  filePath: PipelineService.getRelativePath(context.context.sessionContext.path, filePath), // Relative path
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
                body: 'Only supported files can be added to a pipeline.',
                buttons: [Dialog.okButton()]
              });
            }
          });
        }
        return;
      },
      [defaultFileBrowser, shell, widgetId, reactFlowInstance]
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
      <div className="reactflow-wrapper" data-id={pipelineId} ref={reactFlowWrapper}>
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
            fitViewOptions={{ minZoom: 0.5, maxZoom: 1.0 }}
            defaultViewport={defaultViewport}
            deleteKeyCode={[]}
            >
            <Panel position="top-right">
            </Panel>
            <Controls>
              <DownloadImageButton pipelineName={context.context.sessionContext.path} pipelineId={pipelineId} />
            </Controls>
            <Background color="#aaa" gap={15} />

          </ReactFlow>
        </Dropzone>
      </div >
    );
  }

  function Sidebar() {

    const onDragStart = (event, nodeType, config) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      // Here, you can add more data as needed
      event.dataTransfer.setData('additionalData', config);
      event.dataTransfer.effectAllowed = 'move';
    };


    // Simulating componentService.getComponents()
    const components = componentService.getComponents();

    // Categorizing components with potential subcategories and classifications
    const categorizedComponents: Record<string, Record<string, Record<string, any[]>>> = { structured: {}, unstructured: {} };

    components.forEach(component => {
      let [category, subcategory] = component._category.split('.');
      let classification = component._type.includes('pandas') ? 'structured' : component._type.includes('documents') ? 'unstructured' : null;

      if (classification) {
        if (!categorizedComponents[classification][category]) {
          categorizedComponents[classification][category] = {};
        }
        if (subcategory) {
          if (!categorizedComponents[classification][category][subcategory]) {
            categorizedComponents[classification][category][subcategory] = [];
          }
          categorizedComponents[classification][category][subcategory].push(component);
        } else {
          if (!categorizedComponents[classification][category]['_']) {
            categorizedComponents[classification][category]['_'] = [];
          }
          categorizedComponents[classification][category]['_'].push(component);
        }
      }
    });


    // Transforming categorized components into tree data structure
    const getTreeData = (classification: 'structured' | 'unstructured') => {
      return Object.keys(categorizedComponents[classification]).map((category, index) => {
        const subCategories = Object.keys(categorizedComponents[classification][category]);
        let children = [];

        subCategories.forEach((subCat, subIndex) => {
          if (subCat === '_') {
            children.push(...categorizedComponents[classification][category][subCat].map((component, childIndex) => ({
              title: (
                <span
                  draggable
                  className="palette-component"
                  onDragStart={(event) => onDragStart(event, component._id, component.getDefaultConfig ? component.getDefaultConfig() : '')}
                  key={`category-${index}-item-${childIndex}`}
                >
                  {component._name}
                </span>
              ),
              key: `category-${index}-item-${childIndex}`,
              isLeaf: true,
              icon: <component._icon.react height="14px" width="14px;" />
            })));
          } else {
            children.push({
              title: <span className="palette-component-category">{subCat.charAt(0).toUpperCase() + subCat.slice(1)}</span>,
              key: `category-${index}-sub-${subIndex}`,
              children: categorizedComponents[classification][category][subCat].map((component, childIndex) => ({
                title: (
                  <span
                    draggable
                    className="palette-component"
                    onDragStart={(event) => onDragStart(event, component._id, component.getDefaultConfig ? component.getDefaultConfig() : '')}
                    key={`category-${index}-sub-${subIndex}-item-${childIndex}`}
                  >
                    {component._name}
                  </span>
                ),
                key: `category-${index}-sub-${subIndex}-item-${childIndex}`,
                isLeaf: true,
                icon: <component._icon.react height="14px" width="14px;" />
              }))
            });
          }
        });

        return {
          title: <span className="palette-component-category">{category.charAt(0).toUpperCase() + category.slice(1)}</span>,
          key: `category-${index}`,
          children: children
        };
      });
    };

    // Output tree data (for debugging, you might want to console.log or use it directly in your components)
    console.log(getTreeData('structured'));
    console.log(getTreeData('unstructured'));

    const structuredTreeData = getTreeData('structured');
    const unstructuredTreeData = getTreeData('unstructured');

    // Define the tab items
    const items: TabsProps['items'] = [
      {
        key: '1',
        label: 'Structured',
        children: (
          <DirectoryTree
            selectable={false}
            multiple
            blockNode
            defaultExpandAll
            treeData={structuredTreeData}
            key={"structured-components"}
          />
        ),
      },
      {
        key: '2',
        label: 'Unstructured',
        children: (
          <DirectoryTree
            selectable={false}
            multiple
            blockNode
            defaultExpandAll
            treeData={unstructuredTreeData}
            key={"unstructured-components"}
          />
        ),
      },
    ];

    return (

      <aside title={'Components'}>
        <Tabs defaultActiveKey="1" items={items} tabBarStyle={{ width: '100%', marginLeft: '15px' }} />
      </aside>
    );
  }

  return (
    <div className="palette" id="pipeline-panel">
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
          <Sidebar />
        </ReactFlowProvider>
      </ConfigProvider>
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
      editorDiv.style.width = '100%';
      editorDiv.style.height = '500px';

      const widget = new Widget({ node: editorDiv });
      ReactDOM.render(<CodeEditor code={code} />, editorDiv);

      const saveAsFile = async () => {
        console.log("Before file")

        console.log("context %o", context)
        const file = await commands.execute('docmanager:new-untitled', { path: '/', type: 'file', ext: '.py' });
        console.log("before doc")
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

      console.log("result %o", result)

      if (result.button.label === 'Open in new file') {
        console.log("Before save as")
        await saveAsFile();
      }

      // Render the AceEditor inside the dialog
    }

    // Add generate code button
    const generateCodeButton = new ToolbarButton({
      label: 'Export to Python code',
      iconLabel: 'Export to Python code',
      icon: buildIcon,
      onClick: async () => {
        const code = await CodeGenerator.generateCode(context.model.toString(), this.commands, this.componentService);
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
        const code = CodeGenerator.generateCode(context.model.toString(), this.commands, this.componentService);

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
