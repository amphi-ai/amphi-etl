// index.ts
import { ICommandPalette, IWidgetTracker, WidgetTracker } from '@jupyterlab/apputils';
import { ILabShell, ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { Sanitizer } from '@jupyterlab/apputils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { renderText } from '@jupyterlab/rendermime';
import { KernelMessage } from '@jupyterlab/services';
import { listIcon } from '@jupyterlab/ui-components';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { IPipelineTracker } from '@amphi/pipeline-editor';
import { PipelineConsoleHandler } from './handler';
import { KernelConnector } from './kernelconnector';
import { PipelineConsolePanel } from './logconsole';
import { LogConsoleManager } from './manager';
import { IPipelineConsole, IPipelineConsoleManager } from './tokens';


namespace CommandIDs {
  export const open = 'pipeline-console:open';
}

/**
 * A service providing variable introspection.
 */
const logsconsole: JupyterFrontEndPlugin<IPipelineConsoleManager> = {
  id: '@amphi/pipeline-log-console:extension',
  requires: [ICommandPalette, ILayoutRestorer, ILabShell, ISettingRegistry, IPipelineTracker],
  provides: IPipelineConsoleManager,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    labShell: ILabShell,
    settings: ISettingRegistry,
    pipelines: IWidgetTracker<DocumentWidget>,
  ): IPipelineConsoleManager => {
    const manager = new LogConsoleManager();

    const category = 'Pipeline Console';
    const command = CommandIDs.open;
    const label = 'Pipeline Console';
    const namespace = 'pipeline-console';
    const tracker = new WidgetTracker<PipelineConsolePanel>({ namespace });
    let maxPreview = 80;

    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      maxPreview = setting.get('maxPreview').composite as number;

      console.log(
        `Settings Example extension: maxPreview is set to '${maxPreview}'`
      );
    }

    Promise.all([app.restored, settings.load('@amphi/pipeline-log-console:extension')])
      .then(([, setting]) => {
        // Read the settings
        loadSetting(setting);

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);

        /**
         * Create and track a new inspector.
         */
        function newPanel(): PipelineConsolePanel {
          // Get the current widget from the lab shell
          const currentWidget = labShell.currentWidget;

          // Ensure the current widget is a pipeline and has a context
          if (!currentWidget || !pipelines.has(currentWidget)) {
            console.warn('No active pipeline to provide context.');
            return;
          }

          const pipelinePanel = currentWidget as DocumentWidget;
          const context = pipelinePanel.context;

          const panel = new PipelineConsolePanel(app, app.commands, context);

          panel.id = 'amphi-logConsole';
          panel.title.label = 'Pipeline Console';
          panel.title.icon = listIcon;
          panel.title.closable = true;
          panel.disposed.connect(() => {
            if (manager.panel === panel) {
              manager.panel = null;
            }
          });

          // Track the inspector panel
          tracker.add(panel);

          return panel;
        }


        // Add command to palette
        app.commands.addCommand(command, {
          label,
          execute: () => {
            const metadataPanelId = 'amphi-metadataPanel'; // Using the provided log console panel ID
            let metadataPanel = null;

            // Iterate over each widget in the 'main' area to find the log console
            for (const widget of app.shell.widgets('main')) {
              if (widget.id === metadataPanelId) {
                metadataPanel = widget;
                break;
              }
            }

            if (!manager.panel || manager.panel.isDisposed) {
              manager.panel = newPanel();
            }

            // Check if the metadata panel is found and is attached
            if (metadataPanel && metadataPanel.isAttached) {
              // If log console panel is open, add the preview panel as a tab next to it
              if (!manager.panel.isAttached) {
                app.shell.add(manager.panel, 'main', { ref: metadataPanel.id, mode: 'tab-after' });
              }
            } else {
              // If log console panel is not open, open the preview panel in split-bottom mode
              if (!manager.panel.isAttached) {
                app.shell.add(manager.panel, 'main', { mode: 'split-bottom' });
              }
            }
            app.shell.activateById(manager.panel.id);
          }
        });

        palette.addItem({ command, category });

        app.commands.addCommand('pipeline-console:clear', {
          execute: () => {
            manager.panel.clearLogs();
          },
          label: 'Clear Console'
        });

        app.commands.addCommand('pipeline-console:settings', {
          execute: () => {

          },
          label: 'Console Settings'
        });

        app.contextMenu.addItem({
          command: 'pipeline-console:clear',
          selector: '.amphi-Console',
          rank: 1
        });

      })
      .catch(reason => {
        console.error(
          `Something went wrong when reading the settings.\n${reason}`
        );
      });


    // Enable state restoration
    restorer.restore(tracker, {
      command,
      args: () => ({}),
      name: () => 'amphi-logConsole'
    });

    console.log('JupyterLab extension @amphi/pipeline-log-console is activated!');
    return manager;

  }
};

/**
 * An extension that registers pipelines for variable inspection.
 */
const pipelines: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-log-console:pipelines',
  requires: [IPipelineConsoleManager, IPipelineTracker, ILabShell],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: LogConsoleManager,
    pipelines: IWidgetTracker<DocumentWidget>,
    labShell: ILabShell
  ): void => {
    const handlers: {
      [id: string]: Promise<IPipelineConsole.ILogging>;
    } = {};

    function formatLogDate(date: Date | string): string {
      const dateObj = new Date(date);
      return `${dateObj.toLocaleDateString()}\n${dateObj.toLocaleTimeString()}`;
    }

    /**
     * Subscribes to the creation of new pipelines. If a new pipeline is created, build a new handler for the pipelines.
     * Adds a promise for a instanced handler to the 'handlers' collection.
     */

    // Function that handles the type of data from the kernel that is displayed in the console and how
    pipelines.widgetAdded.connect((sender, pipelinePanel) => {
      if (manager.hasHandler(pipelinePanel.context.sessionContext.path)) {
        handlers[pipelinePanel.id] = new Promise(resolve => {
          resolve(manager.getHandler(pipelinePanel.context.sessionContext.path));
        });
      } else {
        handlers[pipelinePanel.id] = new Promise(resolve => {
          const session = pipelinePanel.context.sessionContext;

          const connector = new KernelConnector({ session });
          const options: PipelineConsoleHandler.IOptions = {
            connector,
            id: session.path
          };
          const handler = new PipelineConsoleHandler(options);

          manager.addHandler(handler);
          pipelinePanel.disposed.connect(() => {
            delete handlers[pipelinePanel.id];
            handler.dispose();
          });

          handler.ready.then(() => {
            resolve(handler);
            connector.ready.then(async () => {
              session.session.kernel.anyMessage.connect((sender, args) => {
                if (!manager.panel) return;
                if (args.direction !== 'recv') return;

                const { msg } = args;
                const type = msg.header.msg_type as KernelMessage.MessageType;

                // Only render when we have HTML tables or images
                if (type === 'execute_result' || type === 'display_data') {
                  const content =
                    msg.content as
                    | KernelMessage.IExecuteResultMsg['content']
                    | KernelMessage.IDisplayDataMsg['content'];
                  const data = content.data as Record<string, any>;

                  // HTML tables or custom HTML blocks
                  if (data['text/html']) {
                    manager.panel.onNewLog(
                      formatLogDate(msg.header.date),
                      session.name,
                      'data',
                      data['text/html'],
                      content.metadata
                    );
                    return;
                  } else if (data['image/png']) {
                    const b64 = data['image/png'] as string;
                    const html = `<img alt="plot" style="max-width:100%;height:auto;" src="data:image/png;base64,${b64}" />`;
                    manager.panel.onNewLog(
                      formatLogDate(msg.header.date),
                      session.name,
                      'rich',
                      html,
                      content.metadata
                    );
                    return;
                  } if (data['image/svg+xml']) {
                    const svgRaw = data['image/svg+xml'];
                    const svg =
                      typeof svgRaw === 'string' ? svgRaw : (svgRaw as string[]).join('\n');
                    manager.panel.onNewLog(
                      formatLogDate(msg.header.date),
                      session.name,
                      'rich',
                      svg,
                      content.metadata
                    );
                    return;
                  }

                  // Ignore text/plain or other mime types on purpose
                  return;
                }

                
                if (type === 'stream') {
                  const streamMsg = msg as KernelMessage.IStreamMsg;
                  const text = streamMsg.content?.text ?? '';
                  if (!text || text === '\n') return;

                  const level = streamMsg.content.name === 'stderr' ? 'warning' : 'info';

                  const html = `<div>${text.replace(/\n/g, '<br>')}</div>`;
                  manager.panel.onNewLog(
                    formatLogDate(msg.header.date),
                    session.name,
                    level,
                    html,
                    null
                  );
                  return;
                }

                // Still show errors with traceback
                if (type === 'error') {
                  const errorMsg = msg as KernelMessage.IErrorMsg;
                  const traceback = errorMsg.content.traceback?.join('\n') ?? '';
                  const errorId = `traceback-${Date.now()}`;

                  const errorContainer = document.createElement('div');
                  const errorMessageText = `${errorMsg.content.evalue}`;
                  errorContainer.innerHTML = `<pre><span>${errorMessageText}</span><br><a href="#" style="text-decoration: underline; color: grey;" id="link-${errorId}" onClick="document.getElementById('${errorId}').style.display = document.getElementById('${errorId}').style.display === 'none' ? 'block' : 'none'; return false;">Show Traceback</a></pre>`;

                  const tracebackContainer = document.createElement('pre');
                  tracebackContainer.id = errorId;
                  tracebackContainer.style.display = 'none';
                  errorContainer.appendChild(tracebackContainer);

                  const options = {
                    host: tracebackContainer,
                    source: traceback,
                    sanitizer: new Sanitizer()
                  };

                  renderText(options).then(() => {
                    const errorHTML = errorContainer.outerHTML;
                    manager.panel.onNewLog(
                      formatLogDate(errorMsg.header.date),
                      session.name,
                      'error',
                      errorHTML,
                      null
                    );
                  });
                }
              });
            });
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

      future.then((source: IPipelineConsole.ILogging) => {
        if (source) {
          manager.source = source;
          // manager.source.performInspection();
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
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  logsconsole,
  pipelines
];
export default plugins;