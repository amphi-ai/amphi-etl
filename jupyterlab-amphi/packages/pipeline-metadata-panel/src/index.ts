import { ICommandPalette, WidgetTracker, IWidgetTracker } from '@jupyterlab/apputils';
import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IConsoleTracker } from '@jupyterlab/console';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { inspectorIcon } from '@jupyterlab/ui-components';

import { IPipelineTracker } from '@amphi/pipeline-editor';
import { DummyHandler, VariableInspectionHandler } from './handler';
import { Languages } from './inspectorscripts';
import { KernelConnector } from './kernelconnector';
import { MetadataPanelManager } from './manager';
import { MetadataPanelPanel } from './metadatapanel';
import { IMetadataPanel, IMetadataPanelManager } from './tokens';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

export { VariableInspectionHandler } from './handler'

namespace CommandIDs {
  export const open = 'metadatapanel:open';
}

/**
 * A service providing variable introspection.
 */
const metadatapanel: JupyterFrontEndPlugin<IMetadataPanelManager> = {
  id: '@amphi/pipeline-metadata-panel',
  requires: [ICommandPalette, ILayoutRestorer, ILabShell, ISettingRegistry],
  provides: IMetadataPanelManager,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    labShell: ILabShell,
    settings: ISettingRegistry
  ): IMetadataPanelManager => {
    const manager = new MetadataPanelManager();
    const category = 'Metadata Panel';
    const command = CommandIDs.open;
    const label = 'Open Metadata Panel';
    const namespace = 'metadatapanel';
    const tracker = new WidgetTracker<MetadataPanelPanel>({ namespace });




    /**
     * Create and track a new inspector.
     */
    function newPanel(): MetadataPanelPanel {
      const panel = new MetadataPanelPanel(app);
      panel.id = 'amphi-metadataPanel';
      panel.title.label = 'Metadata Panel';
      panel.title.icon = inspectorIcon;
      panel.title.closable = true;
      panel.disposed.connect(() => {
        if (manager.panel === panel) {
          manager.panel = null;
        }
      });

      //Track the inspector panel
      tracker.add(panel);

      return panel;
    }



    // Add command to palette
    app.commands.addCommand(command, {
      label,
      execute: () => {
        const logConsoleId = 'amphi-logConsole'; // Using the provided log console panel ID
        let logConsolePanel = null;

        // Iterate over each widget in the 'main' area to find the log console
        for (const widget of app.shell.widgets('main')) {
          if (widget.id === logConsoleId) {
            logConsolePanel = widget;
            break;
          }
        }

        if (!manager.panel || manager.panel.isDisposed) {
          manager.panel = newPanel();
        }

        // Check if the log console panel is found and is attached
        if (logConsolePanel && logConsolePanel.isAttached) {
          // If log console panel is open, add the preview panel as a tab next to it
          if (!manager.panel.isAttached) {
            app.shell.add(manager.panel, 'main', { ref: logConsolePanel.id, mode: 'tab-after' });
          }
        } else {
          // If log console panel is not open, open the preview panel in split-bottom mode
          if (!manager.panel.isAttached) {
            app.shell.add(manager.panel, 'main', { mode: 'split-bottom' });
          }
        }

        if (manager.source) {
          manager.source.performInspection();
        }
        app.shell.activateById(manager.panel.id);
      }
    });

    palette.addItem({ command, category });

    // Add command to palette
    app.commands.addCommand('pipeline-metadata-panel:delete-all', {
      label,
      execute: () => {
        if (manager.source) {
          manager.source.performAllDelete();
        }
      }
    });

    // Enable state restoration
    restorer.restore(tracker, {
      command,
      args: () => ({}),
      name: () => 'metadatapanel'
    });


    console.log('JupyterLab extension @amphi/pipeline-metadata-panel is activated!');
    return manager;
  }

};

/**
 * An extension that registers Pipelines for variable inspection.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-metadata-panel:consoles',
  requires: [IMetadataPanelManager, IConsoleTracker, ILabShell],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IMetadataPanelManager,
    consoles: IConsoleTracker,
    labShell: ILabShell
  ): void => {
    const handlers: {
      [id: string]: Promise<IMetadataPanel.IInspectable>;
    } = {};

    /**
     * Subscribes to the creation of new consoles. If a new notebook is created, build a new handler for the consoles.
     * Adds a promise for a instanced handler to the 'handlers' collection.
     */
    consoles.widgetAdded.connect((sender, consolePanel) => {
      if (manager.hasHandler(consolePanel.sessionContext.path)) {
        handlers[consolePanel.id] = new Promise((resolve, reject) => {
          resolve(manager.getHandler(consolePanel.sessionContext.path));
        });
      } else {
        handlers[consolePanel.id] = new Promise((resolve, reject) => {
          const session = consolePanel.sessionContext;

          // Create connector and init w script if it exists for kernel type.
          const connector = new KernelConnector({ session });
          const scripts: Promise<Languages.LanguageModel> =
            connector.ready.then(() => {
              return connector.kernelLanguage.then(lang => {
                return Languages.getScript(lang);
              });
            });

          scripts.then((result: Languages.LanguageModel) => {
            const initScript = result.initScript;
            const queryCommand = result.queryCommand;
            const matrixQueryCommand = result.matrixQueryCommand;
            const widgetQueryCommand = result.widgetQueryCommand;
            const deleteCommand = result.deleteCommand;
            const deleteAllCommand = result.deleteAllCommand;


            const options: VariableInspectionHandler.IOptions = {
              queryCommand: queryCommand,
              matrixQueryCommand: matrixQueryCommand,
              widgetQueryCommand,
              deleteCommand: deleteCommand,
              deleteAllCommand: deleteAllCommand,
              connector: connector,
              initScript: initScript,
              id: session.path //Using the sessions path as an identifier for now.
            };
            const handler = new VariableInspectionHandler(options);
            manager.addHandler(handler);
            consolePanel.disposed.connect(() => {
              delete handlers[consolePanel.id];
              handler.dispose();
            });

            handler.ready.then(() => {
              resolve(handler);
            });
          });

          //Otherwise log error message.
          scripts.catch((result: string) => {
            const handler = new DummyHandler(connector);
            consolePanel.disposed.connect(() => {
              delete handlers[consolePanel.id];
              handler.dispose();
            });

            resolve(handler);
          });
        });
      }

      setSource(labShell);
    });

    const setSource = (sender: ILabShell, args?: ILabShell.IChangedArgs) => {
      const widget = args?.newValue ?? sender.currentWidget;
      if (!widget || !consoles.has(widget)) {
        return;
      }
      const future = handlers[widget.id];
      future.then((source: IMetadataPanel.IInspectable) => {
        if (source) {
          manager.source = source;
          manager.source.performInspection();
        }
      });
    };
    /**
     * If focus window changes, checks whether new focus widget is a console.
     * In that case, retrieves the handler associated to the console after it has been
     * initialized and updates the manager with it.
     */
    setSource(labShell);
    labShell.currentChanged.connect(setSource);

    app.contextMenu.addItem({
      command: CommandIDs.open,
      selector: '.jp-CodeConsole'
    });
  }
};


/**
 * An extension that registers consoles for variable inspection.
 */
const pipelines: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-metadata-panel:pipelines',
  requires: [IMetadataPanelManager, IPipelineTracker, ILabShell, ISettingRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: IMetadataPanelManager,
    pipelines: IWidgetTracker<DocumentWidget>,
    labShell: ILabShell,
    settings: ISettingRegistry
  ): void => {
    const handlers: {
      [id: string]: Promise<IMetadataPanel.IInspectable>;
    } = {};

    let customCodeInitialization = "";

    function loadSetting(setting: ISettingRegistry.ISettings): void {
      customCodeInitialization = setting.get('customCodeInitialization').composite as string;
      console.log(`Settings: Amphi Metadata extension: customCodeInitialization is set to '${customCodeInitialization}'`);
    }

    settings.load('@amphi/pipeline-metadata-panel:pipelines')
      .then((setting) => {
        // Initial call to loadSetting after the settings are first loaded
        loadSetting(setting);

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);

        /**
         * Subscribes to the creation of new pipelines. If a new notebook is created, build a new handler for the consoles.
         * Adds a promise for a instanced handler to the 'handlers' collection.
         */
        pipelines.widgetAdded.connect((sender, pipelinePanel) => {
          if (manager.hasHandler(pipelinePanel.context.sessionContext.path)) {
            handlers[pipelinePanel.id] = new Promise((resolve, reject) => {
              resolve(manager.getHandler(pipelinePanel.context.sessionContext.path));
            });
          } else {
            handlers[pipelinePanel.id] = new Promise((resolve, reject) => {
              const session = pipelinePanel.context.sessionContext;

              // Create connector and init w script if it exists for kernel type.
              const connector = new KernelConnector({ session });
              const scripts: Promise<Languages.LanguageModel> =
                connector.ready.then(() => {
                  return connector.kernelLanguage.then(lang => {
                    return Languages.getScript(lang);
                  });
                });

              scripts.then((result: Languages.LanguageModel) => {
                const initScript = result.initScript + "\n" + customCodeInitialization;
                const queryCommand = result.queryCommand;
                const matrixQueryCommand = result.matrixQueryCommand;
                const widgetQueryCommand = result.widgetQueryCommand;
                const deleteCommand = result.deleteCommand;
                const deleteAllCommand = result.deleteAllCommand;

                const options: VariableInspectionHandler.IOptions = {
                  queryCommand: queryCommand,
                  matrixQueryCommand: matrixQueryCommand,
                  widgetQueryCommand,
                  deleteCommand: deleteCommand,
                  deleteAllCommand: deleteAllCommand,
                  connector: connector,
                  initScript: initScript,
                  id: session.path //Using the sessions path as an identifier for now.
                };
                const handler = new VariableInspectionHandler(options);
                manager.addHandler(handler);
                pipelinePanel.disposed.connect(() => {
                  delete handlers[pipelinePanel.id];
                  handler.dispose();
                });

                handler.ready.then(() => {
                  resolve(handler);
                });
              });

              //Otherwise log error message.
              scripts.catch((result: string) => {
                const handler = new DummyHandler(connector);
                pipelinePanel.disposed.connect(() => {
                  delete handlers[pipelinePanel.id];
                  handler.dispose();
                });

                resolve(handler);
              });
            });
          }

          setSource(labShell);
        });

        const setSource = (sender: ILabShell, args?: ILabShell.IChangedArgs) => {
          const widget = args?.newValue ?? sender.currentWidget;
          if (!widget || !pipelines.has(widget)) {
            return;
          }
          const future = handlers[widget.id];
          future.then((source: IMetadataPanel.IInspectable) => {
            if (source) {
              manager.source = source;
              manager.source.performInspection();
            }
          });
        };
        /**
         * If focus window changes, checks whether new focus widget is a console.
         * In that case, retrieves the handler associated to the console after it has been
         * initialized and updates the manager with it.
         */
        setSource(labShell);
        labShell.currentChanged.connect(setSource);

      }).catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  metadatapanel,
  consoles,
  pipelines
];
export default plugins;