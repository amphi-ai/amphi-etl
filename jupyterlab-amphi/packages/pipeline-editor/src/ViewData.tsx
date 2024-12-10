// data_viewer.ts
import {
    BasicKeyHandler,
    BasicMouseHandler,
    BasicSelectionModel,
    CellEditor,
    CellGroup,
    CellRenderer,
    DataGrid,
    DataModel,
    HyperlinkRenderer,
    ICellEditor,
    JSONModel,
    MutableDataModel,
    TextRenderer,
    ImageRenderer
} from '@lumino/datagrid';

import { StackedPanel } from '@lumino/widgets';
import { SessionContext } from '@jupyterlab/apputils';
import { KernelMessage } from '@jupyterlab/services';
import { ComponentManager, CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import { gridAltIcon } from './icons'

export async function viewData(
    nodeId: string,
    context: any,
    commands: any,
    app: any
): Promise<void> {
    try {
        // Run the pipeline until the component
        await commands.execute('pipeline-editor:run-pipeline-until', {
            nodeId: nodeId,
            context: context
        });

        // Get the node information
        const nodeJson = PipelineService.getNodeById(context.model.toString(), nodeId);
        // Assume that the node's output variable name is stored in nodeJson.data.varName
        const varName = nodeJson.data.nameId;

        if (!varName) {
            console.error('Variable name not found for the selected component.');
            return;
        }

        // Get the kernel from the context
        const kernel = context.sessionContext.session?.kernel;
        if (!kernel) {
            console.error('Kernel is not available.');
            return;
        }

        // Perform matrix inspection to get the data model
        const dataModel = await performMatrixInspection(varName, kernel);

        // Create a DataGridPanel with the data model
        const panel = new DataGridPanel(dataModel);

        const logConsoleId = 'amphi-logConsole'; // Using the provided log console panel ID
        let logConsolePanel = null;

        // Iterate over each widget in the 'main' area to find the log console
        for (const widget of app.shell.widgets('main')) {
          if (widget.id === logConsoleId) {
            logConsolePanel = widget;
            break;
          }
        }
  
          // Check if the log console panel is found and is attached
          if (logConsolePanel && logConsolePanel.isAttached) {
            // If log console panel is open, add the preview panel as a tab next to it
            if (!panel.isAttached) {
              app.shell.add(panel, 'main', { ref: logConsolePanel.id, mode: 'tab-after' });
            }
          } else {
            // If log console panel is not open, open the preview panel in split-bottom mode
            if (!panel.isAttached) {
              app.shell.add(panel, 'main', { mode: 'split-bottom' });
            }
          }
  

          app.shell.activateById(panel.id);


    } catch (error) {
        console.error('Error viewing data:', error);
    }
}

async function performMatrixInspection(
    varName: string,
    kernel: any,
    maxRows = 10000
): Promise<JSONModel> {
    const code = `_amphi_metadatapanel_getmatrixcontent(${varName}, ${maxRows})`;

    return new Promise((resolve, reject) => {
        const future = kernel.requestExecute({
            code: code,
            stop_on_error: false,
            store_history: false
        });

        future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
            const msgType = msg.header.msg_type;
            switch (msgType) {
                case 'execute_result':
                    const payload = msg.content as any;
                    let content: string = payload.data['text/plain'] as string;
                    content = content.replace(/^'|'$/g, '');
                    content = content.replace(/\\"/g, '"');
                    content = content.replace(/\\'/g, "\\\\'");

                    const modelOptions = JSON.parse(content) as JSONModel.IOptions;
                    const jsonModel = new JSONModel(modelOptions);
                    resolve(jsonModel);
                    break;
                case 'error':
                    reject("Kernel error on 'matrixQuery' call!");
                    break;
                default:
                    break;
            }
        };

        future.onReply = (msg: KernelMessage.IExecuteReplyMsg) => {
            // Handle execute reply if needed
        };

        future.onDone = () => {
            // Handle completion if needed
        };
    });
}

class DataGridPanel extends StackedPanel {
    constructor(dataModel: JSONModel) {
        super();
        this.id = 'datagrid-viewer';
        this.title.label = 'Data Browser';
        this.title.closable = true;
        this.title.icon = gridAltIcon;

        const grid = new DataGrid({
            // stretchLastColumn: true,
            minimumSizes: {
                rowHeight: 30,
                columnWidth: 100,
                rowHeaderWidth: 100,
                columnHeaderHeight: 30
            },
            style: {
                ...DataGrid.defaultStyle,
                backgroundColor: '#fff',
                voidColor: '#fff',
                headerGridLineColor: '#F0F0F0',
                headerHorizontalGridLineColor: '#F0F0F0',
                headerVerticalGridLineColor: '#F0F0F0',
                headerBackgroundColor: '#FAFAFA',  // Background color for the headers
                headerSelectionBorderColor: '#44776D',    // Optional: white border for selected headers
                selectionBorderColor: '#44776D',
                selectionFillColor: 'rgba(68, 119, 109, 0.2)',
                cursorBorderColor: '#44776D',
                gridLineColor: '#F0F0F0'

              }
        });
        grid.dataModel = dataModel;
        grid.keyHandler = new BasicKeyHandler();
        grid.mouseHandler = new BasicMouseHandler();
        grid.selectionModel = new BasicSelectionModel({ dataModel: dataModel });

        this.addWidget(grid);


    }


}
