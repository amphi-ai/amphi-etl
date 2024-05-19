import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  ISessionContextDialogs,
  IToolbarWidgetRegistry,
  IWidgetTracker,
  Notification,
  WidgetTracker
} from '@jupyterlab/apputils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { KernelMessage } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ILauncher } from '@jupyterlab/launcher';
import { IDefaultFileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IStatusBar } from '@jupyterlab/statusbar';
import { PromiseDelegate, ReadonlyJSONValue, ReadonlyPartialJSONObject, Token } from '@lumino/coreutils';

import { ComponentManager, CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import { pipelineCategoryIcon, pipelineBrandIcon } from './icons';
import { PipelineEditorFactory, commandIDs } from './PipelineEditorWidget';

import { LabIcon } from '@jupyterlab/ui-components';
import React from 'react';

/**
 * The command IDs used by the Amphi pipeline editor plugin.
 */
namespace CommandIDs {
  export const create = 'pipeline-editor:create-new';
  export const restartPipelineKernel = 'pipeline-editor:restart-kernel';
  export const runPipeline = 'pipeline-editor:run-pipeline';
  export const runPipelineUntil = 'pipeline-editor:run-pipeline-until';
}

const PIPELINE_FACTORY = 'Pipeline Editor';
const PIPELINE = 'amphi-pipeline';
const PIPELINE_EDITOR_NAMESPACE = 'amphi-pipeline-editor';
const PLUGIN_ID = '@amphi/pipeline-editor:extension';

// Export a token so other extensions can require it
export const IPipelineTracker = new Token<IWidgetTracker<DocumentWidget>>(
  'pipeline-editor-tracker'
);



/**
 * Initialization data for the react-widget extension.
 */
const pipelineEditor: JupyterFrontEndPlugin<WidgetTracker<DocumentWidget>> = {
  id: '@amphi/pipeline-editor:plugin',
  autoStart: true,
  requires: [
    ICommandPalette,
    IRenderMimeRegistry,
    ILauncher,
    IFileBrowserFactory,
    IDefaultFileBrowser,
    IStatusBar,
    ILayoutRestorer,
    IMainMenu,
    ISettingRegistry,
    IToolbarWidgetRegistry,
    ISessionContextDialogs,
    ComponentManager
  ],
  provides: IPipelineTracker,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    rendermime: IRenderMimeRegistry,
    launcher: ILauncher,
    browserFactory: IFileBrowserFactory,
    defaultFileBrowser: IDefaultFileBrowser,
    statusBar: IStatusBar,
    restorer: ILayoutRestorer,
    menu: IMainMenu,
    registry: ISettingRegistry,
    toolbarRegistry: IToolbarWidgetRegistry,
    sessionDialogs: ISessionContextDialogs,
    componentService: any
  ): WidgetTracker<DocumentWidget> => {
    console.log("Amphi Pipeline Extension activation...")

    // Get app commands and define create-pipeline command
    const { commands } = app;
    const command = CommandIDs.create;

    // Pipeline Tracker
    const pipelineEditortracker = new WidgetTracker<DocumentWidget>({
      namespace: PIPELINE_EDITOR_NAMESPACE
    });

    // Fetch the initial state of the settings.
    const settings = registry.load(PLUGIN_ID).catch(error => console.log(error));

    // Handle state restoration.
    if (restorer) {
      // When restoring the app, if the document was open, reopen it
      restorer.restore(pipelineEditortracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: PIPELINE_FACTORY }),
        name: widget => widget.context.path
      });
    }

    // Set up new widget Factory for .ampln files
    const pipelineEditorFactory = new PipelineEditorFactory({
      name: PIPELINE_FACTORY,
      fileTypes: [PIPELINE],
      defaultFor: [PIPELINE],
      canStartKernel: true,
      preferKernel: true,
      shutdownOnClose: true,
      shell: app.shell,
      toolbarRegistry: toolbarRegistry,
      commands: app.commands,
      browserFactory: browserFactory,
      defaultFileBrowser: defaultFileBrowser,
      serviceManager: app.serviceManager,
      settings: settings,
      componentService: componentService
    });

    // Add the widget to the tracker when it's created
    pipelineEditorFactory.widgetCreated.connect((sender, widget) => {
      pipelineEditortracker.add(widget);

      // Notify the widget tracker if restore data needs to update
      widget.context.pathChanged.connect(() => {
        pipelineEditortracker.save(widget);
      });

    });

    // Add the default behavior of opening the widget for .ampln files
    // First the Pipeline and then JSON (available)
    app.docRegistry.addFileType(
      {
        name: 'amphi-pipeline',
        displayName: 'pipeline',
        extensions: ['.ampln'],
        icon: pipelineBrandIcon,
        fileFormat: 'text'
      },
      [PIPELINE_FACTORY, 'JSON']
    );
    app.docRegistry.addWidgetFactory(pipelineEditorFactory);

    // Add command to create new Pipeline
    commands.addCommand(command, {
      label: args =>
        args['isPalette'] || args['isContextMenu']
          ? 'New Pipeline'
          : 'New Pipeline',
      caption: 'Create a new pipeline',
      icon: (args) => (args['isPalette'] ? null : pipelineCategoryIcon),
      execute: async args => {

        return commands.execute(commandIDs.newDocManager, {
          type: 'file',
          path: defaultFileBrowser.model.path,
          ext: '.ampln'
        })
          .then(async model => {
            const runtime_type = 'LOCAL';

            const getPipelineId = () => `pipeline_${+new Date()}`;

            const pipelineJson = {
              doc_type: 'Amphi Pipeline',
              version: '1',
              json_schema:
                'http://docs.amphi.ai/schemas/pipeline-v1-schema.json',
              id: getPipelineId(),
              pipelines: [
                {
                  id: 'primary',
                  flow: {
                    nodes: [
                    ],
                    edges: [
                    ],
                    viewport: {
                      x: 86,
                      y: 38,
                      zoom: 0.5
                    }
                  },
                  app_data: {
                    ui_data: {
                      comments: []
                    },
                    version: 1,
                    runtime_type
                  },
                  runtime_ref: 'python'
                }
              ]
            };

            // Open Pipeline using Pipeline EditorFactory
            const newWidget = await app.commands.execute(
              commandIDs.openDocManager,
              {
                path: model.path,
                factory: PIPELINE_FACTORY // Use PipelineEditorFactory
              }
            );

            // Assign to the new widget context the pipeline JSON from above
            newWidget.context.ready.then(() => {

              newWidget.context.model.fromJSON(pipelineJson);

              // Save this in the file
              app.commands.execute(commandIDs.saveDocManager, {
                path: model.path
              });

            });
          });

      }
    });

    // Get the current widget and activate unless the args specify otherwise.
    function getCurrent(args: ReadonlyPartialJSONObject): any | null {
      const widget = pipelineEditortracker.currentWidget;
      const activate = args['activate'] !== false;

      if (activate && widget) {
        app.shell.activateById(widget.id);
      }

      return widget ?? null;
    }

    function isEnabled(): boolean {
      return (
        pipelineEditortracker.currentWidget !== null &&
        pipelineEditortracker.currentWidget === app.shell.currentWidget
      );
    }

    /**
     * Restart the Pipeline Kernel linked to the current Editor
     */
    commands.addCommand(CommandIDs.restartPipelineKernel, {
      label: 'Restart Runtime…',
      execute: async args => {
        const current = getCurrent({ activate: false, ...args });
        if (!current) {
          return;
        }
        console.log(current.context.sessionContext);

        try {
          await current.context.sessionContext.restartKernel();
        } catch (error) {
          console.error("Failed to restart runtime: ", error);
        }
      },
      isEnabled
    });

    /**
     * Run Pipeline on Kernel linked to the current Editor
     */
    commands.addCommand(CommandIDs.runPipeline, {

      label: 'Run Pipeline',
      execute: args => {

        // Delete Python variables for the metadata panel (reinitialization)
        /*
        const command = 'pipeline-metadata-panel:delete-all';
        commands.execute(command, {}).catch(reason => {
          console.error(
            `An error occurred during the execution of ${command}.\n${reason}`
          );
        });
        */

        // First open log console
        // Open in same panel as metadata panel is openned
        if (args.datapanel) {
          const command = 'metadatapanel:open';
          commands.execute(command, {}).catch(reason => {
            console.error(
              `An error occurred during the execution of ${command}.\n${reason}`
            );
          });
        } else {
          commands.execute('pipeline-console:open', {}).catch(reason => {
            console.error(
              `An error occurred during the execution of ${command}.\n${reason}`
            );
          });
        }



        const current = getCurrent(args);
        if (!current) {
          return;
        }

        if (!current.context.sessionContext.session) {
          Notification.error('The pipeline cannot be run because the local Python engine cannot be found.', {
            actions: [
              { label: 'Try to reload the application and run again.', callback: () => location.reload() }
            ],
            autoClose: 6000
          });
          return;
        }

        if (current.context.sessionContext.hasNoKernel) {
          Notification.error('The pipeline cannot be run because no processing engine can be found.', {
            actions: [
              { label: 'Try to reload the application and run again.', callback: () => location.reload() }
            ],
            autoClose: 6000
          });
          return;
        }

        if (!current.context.sessionContext) {
          Notification.error('The pipeline cannot be run because the local Python engine cannot be found.', {
            actions: [
              { label: 'Try to reload the application and run again.', callback: () => location.reload() }
            ],
            autoClose: 6000
          });
          return;
        }

        // Second, install dependencies packages if needed
        current.context.sessionContext.ready.then(async () => {

          const code = args.code.toString();
          let packages: string[];
          const imports = PipelineService.extractPythonImportPackages(code);
          packages = PipelineService.extractPackageNames(imports);
          const lines = code.split(/\r?\n/); // Split the code into lines
          const dependencyLine = lines[2]; // Extract dependencies from the third line (index 2, as arrays are zero-indexed)
          const dependencies = dependencyLine.startsWith("# Additional dependencies: ") // Assuming the structure is "# Additional imports: package1, package2, ..."
            ? dependencyLine.split(': ')[1].split(',').map(pkg => pkg.trim())
            : [];
          packages = [...packages, ...dependencies];

          if (packages.length > 0 && packages[0] != null && packages[0] !== '') {

            const pips_code = PipelineService.getInstallCommandsFromPackageNames(packages).join('\n');
            // Install packages
            try {

              const future = current.context.sessionContext.session.kernel!.requestExecute({ code: pips_code });

              future.onIOPub = msg => {
                if (msg.header.msg_type === 'stream') {
                  // Handle stream messages if necessary
                } else if (msg.header.msg_type === 'error') {
                  // Handle error messages
                  const errorMsg = msg as KernelMessage.IErrorMsg;
                  const errorOutput = errorMsg.content;
          
                  console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
                }
              };
          
              future.onDone = () => {
                console.log("Dependencies installed.")
              };
          
              await future.done;

            } catch (error) {
              console.error(error);
            }
          }
        });

        // Third, run pipeline code
        current.context.sessionContext.ready.then(async () => {

          try {
            // Create promise to track success or failure of the request
            const delegate = new PromiseDelegate<ReadonlyJSONValue>();
            const start = performance.now();

            Notification.promise(delegate.promise, {
              // Message when the task is pending
              pending: { message: 'Running...', options: { autoClose: false } },
              // Message when the task finished successfully
              success: {
                message: (result: any) => `Pipeline execution successful after ${result.delayInSeconds} seconds.`,
                options: {
                  autoClose: 3000
                }
              },
              // Message when the task finished with errors
              error: {
                message: () => 'Pipeline execution failed. Check error messages in the Log Console.',
                options: {
                  actions: [
                    {
                      label: 'Log Console',
                      callback: () => {
                        const command = 'pipeline-console:open';
                        commands.execute(command, {}).catch(reason => {
                          console.error(
                            `An error occurred during the execution of ${command}.\n${reason}`
                          );
                        });
                      }
                    }
                  ],
                  autoClose: 5000
                }
              }
            });

            const future = current.context.sessionContext.session.kernel!.requestExecute({ code: args.code });

            future.onReply = reply => {
              const end = performance.now();
              const delay = end - start;
              const delayInSeconds = (delay / 1000).toFixed(1);
        
              if (reply.content.status === "ok") {
                delegate.resolve({ delayInSeconds });
              } else {
                delegate.reject({ delayInSeconds });
              }
            };
        
            future.onIOPub = msg => {
              if (msg.header.msg_type === 'stream') {
                // Handle stream messages if necessary
              } else if (msg.header.msg_type === 'error') {
                // Handle error messages
                const errorMsg = msg as KernelMessage.IErrorMsg;
                const errorOutput = errorMsg.content;
        
                console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
              }
            };
        
            future.onDone = () => {
              const end = performance.now();
              const delay = end - start;
              const delayInSeconds = (delay / 1000).toFixed(1);
        
              delegate.resolve({ delayInSeconds });
            };
        
            await future.done;

          } catch (error) {
            console.error(error);
          }

        });

      },
      isEnabled
    });

    commands.addCommand('pipeline-editor:run-pipeline-until', {
      label: 'Run pipeline until ...',

      execute: async args => {

        const current = getCurrent(args);
        if (!current) {
          return;
        }

        const nodeId = args.nodeId.toString();
        const context = args.context;
        const code = CodeGenerator.generateCodeUntil(current.context.model.toString(), commands, componentService, nodeId, context);


        commands.execute('pipeline-editor:run-pipeline', { code }).catch(reason => {
          console.error(
            `An error occurred during the execution of 'pipeline-editor:run-pipeline'.\n${reason}`
          );
        });
      }
    });

    // Add the command to the context menu
    app.contextMenu.addItem({
      command: CommandIDs.create,
      selector: '.jp-DirListing-content',
      rank: 100,
    });

    // Add to palette
    palette.addItem({
      command: CommandIDs.create,
      category: 'Pipeline',
      args: { isPalette: true }
    });

    /*
    function replaceCategoryIcon(
      category: React.ReactElement,
      icon: LabIcon,
    ): React.ReactElement {
      const children = React.Children.map(category.props.children, (child) => {
        if (child.props.className === 'jp-Launcher-sectionHeader') {
          const grandchildren = React.Children.map(
            child.props.children,
            (grandchild) => {
              if (grandchild.props.className !== 'jp-Launcher-sectionTitle') {
                return <icon.react stylesheet="launcherSection" />;
              } else {
                return grandchild;
              }
            },
          );
    
          return React.cloneElement(child, child.props, grandchildren);
        } else {
          return child;
        }
      });
    
      return React.cloneElement(category, category.props, children);
    }
    */

    // Add launcher
    if (launcher) {
      launcher.add({
        command: CommandIDs.create,
        category: 'Amphi',
        rank: 3
      });
    }

    return pipelineEditortracker;
  },
};

/**
 * Export the plugins as default.
 */
const extensions: JupyterFrontEndPlugin<any>[] = [
  pipelineEditor
];

export default extensions;

