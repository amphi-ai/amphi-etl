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
import { JSONObject } from '@lumino/coreutils';
import { useCopyPaste } from './Commands';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { LIB_VERSION } from './version';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { createAboutDialog } from './AboutDialog';
import { RunService } from './RunService'

import { ComponentManager, CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import { pipelineCategoryIcon, pipelineBrandIcon, componentIcon } from './icons';
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
  export const runIncrementalPipelineUntil = 'pipeline-editor:run-incremental-pipeline-until';
}

const PIPELINE_FACTORY = 'Pipeline Editor';
const PIPELINE = 'amphi-pipeline';
const PIPELINE_EDITOR_NAMESPACE = 'amphi-pipeline-editor';
const EXTENSION_ID = '@amphi/pipeline-editor:extension';
const EXTENSION_TRACKER = 'pipeline-editor-tracker';

// Export a token so other extensions can require it
export const IPipelineTracker = new Token<IWidgetTracker<DocumentWidget>>(
  EXTENSION_TRACKER
);

/**
 * Initialization data for the Pipeline Editor (DocumentWidget) extension.
 */
const pipelineEditor: JupyterFrontEndPlugin<WidgetTracker<DocumentWidget>> = {
  id: EXTENSION_ID,
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
    IDocumentManager,
    ComponentManager
  ],
  provides: IPipelineTracker,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    rendermimeRegistry: IRenderMimeRegistry,
    launcher: ILauncher,
    browserFactory: IFileBrowserFactory,
    defaultFileBrowser: IDefaultFileBrowser,
    statusBar: IStatusBar,
    restorer: ILayoutRestorer,
    menu: IMainMenu,
    settings: ISettingRegistry,
    toolbarRegistry: IToolbarWidgetRegistry,
    sessionDialogs: ISessionContextDialogs,
    manager: IDocumentManager,
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

    let enableExecution: boolean;
    let enableDebugMode: boolean;

    // Fetch the initial state of the settings.
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      enableExecution = setting.get('enableExecution').composite as boolean;
      console.log(
        `Settings extension: enableExecution is set to '${enableExecution}'`
      );
      enableDebugMode = setting.get('enableDebugMode').composite as boolean;
      console.log(
        `Settings extension: enableDebugMode is set to '${enableDebugMode}'`
      );
    }

    Promise.all([app.restored, settings.load(EXTENSION_ID)])
      .then(([, settings]) => {
        // Read the settings
        loadSetting(settings);

        // Listen for your plugin setting changes using Signal
        settings.changed.connect(loadSetting);

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
          rendermime: rendermimeRegistry,
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

        app.docRegistry.addFileType(
          {
            name: 'amphi-component',
            displayName: 'component',
            extensions: ['.amcpn'],
            icon: componentIcon,
            fileFormat: 'text'
          },
          ['JSON']
        );

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
                          x: 0,
                          y: 0,
                          zoom: 1
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
        // Command Registration
        commands.addCommand(CommandIDs.runPipeline, {
          label: 'Run Pipeline',
          execute: async args => { // Make the execute function async
            try {
              // Main Execution Flow
              if (args.datapanel) {
                RunService.executeCommand(commands, 'metadatapanel:open');
              } else {
                RunService.executeCommand(commands, 'pipeline-console:open');
              }
        
              const current = getCurrent(args);
              if (!current) {
                return;
              }
        
              if (!RunService.checkSessionAndKernel(Notification, current)) {
                return;
              }
        
              // Install dependencies if needed
              await current.context.sessionContext.ready; // Await the readiness
        
              const code = args.code.toString();
              const packages = RunService.extractDependencies(code);
        
              if (packages.length > 0 && packages[0] !== '') {
                const pips_code = PipelineService.getInstallCommandsFromPackageNames(packages).join('\n');
                console.log('pips_code: ' + pips_code);
        
                const enableDebugMode = settings.get('enableDebugMode').composite as boolean;
                if (enableDebugMode) {
                  console.log('Dependencies to be installed: %o', pips_code);
                }
        
                await RunService.executeKernelCode(
                  current.context.sessionContext.session,
                  pips_code
                );
              }
        
              // Run pipeline code
              const pythonCodeWithSleep = `
import time
time.sleep(0.25)
${args.code}
`;
        
              const notificationOptions = {
                pending: { message: 'Running...', options: { autoClose: false } },
                success: {
                  message: (result: any) =>
                    `Pipeline execution successful after ${result.delayInSeconds} seconds.`,
                  options: {
                    autoClose: 3000
                  }
                },
                error: {
                  message: () =>
                    'Pipeline execution failed. Check error messages in the Log Console.',
                  options: {
                    actions: [
                      {
                        label: 'Log Console',
                        callback: () => {
                          RunService.executeCommand(commands, 'pipeline-console:open');
                        }
                      }
                    ],
                    autoClose: 5000
                  }
                }
              };
        
              await RunService.executeKernelCodeWithNotifications(
                Notification,
                current.context.sessionContext.session,
                pythonCodeWithSleep,
                notificationOptions
              );
        
            } catch (error) {
              console.error('Error in runPipeline command:', error);
              throw error; // Propagate the error to allow .catch() to handle it
            }
          },
          isEnabled
        });
        

        commands.addCommand(CommandIDs.runPipelineUntil, {
          label: 'Run pipeline until ...',

          execute: async args => {

            const current = getCurrent(args);
            if (!current) {
              return;
            }

            const nodeId = args.nodeId.toString();
            const context = args.context;
            const codeList = CodeGenerator.generateCodeUntil(current.context.model.toString(), commands, componentService, nodeId, false, false);
            const code = codeList.join('\n');

            commands.execute('pipeline-editor:run-pipeline', { code }).then(result => {
              // This block runs only if the pipeline succeeds
              console.log('Pipeline executed successfully:', result);



            }).catch(reason => {
              console.error(
                `An error occurred during the execution of 'pipeline-editor:run-pipeline'.\n${reason}`
              );
            });
          }
        });

        commands.addCommand(CommandIDs.runIncrementalPipelineUntil, {
          label: 'Run incremental pipeline until ...',
        
          execute: async args => {
        
            const current = getCurrent(args);
            if (!current) {
              return;
            }
        
            const nodeId = args.nodeId.toString();
            const context = args.context;
        
            // Generate the incremental list of code to run
            const incrementalCodeList  = CodeGenerator.generateCodeUntil(
              current.context.model.toString(), 
              commands, 
              componentService, 
              nodeId, 
              true,
              false
            );

            console.log("incrementalCodeList 2 %o", incrementalCodeList)
        
            // Notification options
            const notificationOptions = {
              pending: { message: 'Running incremental code...', options: { autoClose: false } },
              success: { message: 'Code block executed successfully.', options: { autoClose: 3000 } },
              error: { 
                message: () => 'Execution failed. Stopping pipeline.',
                options: { 
                  actions: [{
                    label: 'Log Console', 
                    callback: () => RunService.executeCommand(commands, 'pipeline-console:open') 
                  }],
                  autoClose: 5000 
                }
              }
            };

            const flow = PipelineService.filterPipeline(current.context.context.model.toJSON());
        
            // Iterate over each incremental code block and execute
            for (const codeBlock of incrementalCodeList) {
              const code = codeBlock.code;

              const pythonCodeWithSleep = `
import time
time.sleep(0.25)
${code}
`;
              try {
                console.log("pythonCodeWithSleep %o", pythonCodeWithSleep)

                await RunService.executeKernelCodeWithNotifications(
                  Notification,
                  current.context.sessionContext.session,
                  pythonCodeWithSleep,
                  notificationOptions
                );
                const nodeId = codeBlock.nodeId;

                console.log(`Executed code block: ${pythonCodeWithSleep}`);
              } catch (error) {
                console.error(`Execution failed for code block: ${pythonCodeWithSleep}`, error);
                // Stop execution if a block fails
                break;
              }
            }
          }
        });

        commands.addCommand('pipeline-editor:version', {
          label: 'About Amphi',
          execute: () => {
            const { title, body } = createAboutDialog(LIB_VERSION);

            return showDialog({
              title,
              body,
              buttons: [
                Dialog.createButton({
                  label: 'Close',
                  className: 'jp-About-button jp-mod-reject jp-mod-styled',
                }),
              ],
            });
          },
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

        palette.addItem({
          command: 'pipeline-editor:version',
          category: 'Help',
          args: { isPalette: true }
        });

        // Components //
        // ----
        // ----
        // Copy Paste
        //const { cut, copy, paste, bufferedNodes } = useCopyPaste();
        // const canCopy = nodes.some(({ selected }) => selected);
        // const canPaste = bufferedNodes.length > 0;

        commands.addCommand('pipeline-editor-component:save-as-file', {
          execute: async args => {
            const current = getCurrent(args);
            if (!current) {
              return;
            }

            const contextNode: HTMLElement | undefined = app.contextMenuHitTest(
              node => !!node.dataset.id
            );

            if (contextNode) {
              const nodeId = contextNode.dataset.id; // Extract the node ID

              // Assuming PipelineService.getNodeById is available
              const nodeJson = PipelineService.getNodeById(current.context.model.toString(), nodeId);

              // Extract data and type attributes
              const { data, type } = nodeJson;
              const { lastUpdated, lastExecuted, ...filteredData } = data;
              const componentJson = JSON.stringify({ component: { data: filteredData, type } });
              const file = await commands.execute('docmanager:new-untitled', { path: '/', type: 'file', ext: '.amcpn' });
              const doc = await commands.execute('docmanager:open', { path: file.path });

              // Ensure the document context model is loaded
              await doc.context.ready;

              // Save componentJson string to the file
              doc.context.model.fromString(componentJson);
              await doc.context.save();
              await commands.execute('docmanager:reload', { path: file.path });
              await commands.execute('docmanager:rename');
              // await commands.execute('docmanager:save', { path: file.path });
            }
          },
          label: 'Save component'
        });


        commands.addCommand('pipeline-editor-component:copy', {
          execute: async args => {
            const contextNode: HTMLElement | undefined = app.contextMenuHitTest(
              node => !!node.dataset.id
            );
            if (contextNode) {
              const nodeId = contextNode.getAttribute('data-id');
              console.log(nodeId);
            }
          },
          label: 'Copy'
        });

        commands.addCommand('pipeline-editor-component:cut', {
          execute: args => {
            const contextNode: HTMLElement | undefined = app.contextMenuHitTest(
              node => !!node.dataset.id
            );
            if (contextNode) {
              console.log(contextNode)
            }
          },
          label: 'Cut'
        });

        commands.addCommand('pipeline-editor-component:paste', {
          execute: async args => {

          },
          label: 'Paste'
        });

        const contextMenuItems = [
          /*
          {
            command: 'pipeline-editor-component:copy',
            selector: '.component',
            rank: 1,
          },
          {
            command: 'pipeline-editor-component:cut',
            selector: '.component',
            rank: 2,
          },
          {
            command: 'pipeline-editor-component:paste',
            selector: '.component',
            rank: 3,
          },
          */
          {
            command: 'pipeline-editor-component:save-as-file',
            selector: '.component',
            rank: 3,
          },
        ];

        // Add each context menu item with the args function
        contextMenuItems.forEach(item => {
          app.contextMenu.addItem({
            command: item.command,
            selector: item.selector,
            rank: item.rank
          });
        });

        // ----
        // ----


        // Add launcher
        if (launcher) {
          launcher.add({
            command: CommandIDs.create,
            category: 'Amphi',
            rank: 3
          });
        }

      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });

    // Handle state restoration.
    if (restorer) {
      // When restoring the app, if the document was open, reopen it
      restorer.restore(pipelineEditortracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: PIPELINE_FACTORY }),
        name: widget => widget.context.path
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

