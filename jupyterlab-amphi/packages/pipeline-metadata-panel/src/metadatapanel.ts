import { JupyterFrontEnd } from '@jupyterlab/application';
import { searchIcon } from '@jupyterlab/ui-components';
import { DataGrid, DataModel } from '@lumino/datagrid';
import { DockLayout, Widget } from '@lumino/widgets';

import { IMetadataPanel } from './tokens';

const TITLE_CLASS = 'amphi-MetadataPanel-title';
const PANEL_CLASS = 'amphi-MetadataPanel';
const TABLE_CLASS = 'amphi-MetadataPanel-table';
const TABLE_BODY_CLASS = 'amphi-MetadataPanel-content';
const TABLE_ROW_CLASS = 'amphi-MetadataPanel-table-row';
const TABLE_NAME_CLASS = 'amphi-MetadataPanel-varName';

/**
 * A panel that renders the variables
 */
export class MetadataPanelPanel
  extends Widget
  implements IMetadataPanel
{
  private app: JupyterFrontEnd;
  private _source: IMetadataPanel.IInspectable | null = null;
  private _table: HTMLTableElement;
  private _title: HTMLElement;

  constructor(app: JupyterFrontEnd) {
    super();
    this.app = app;
    this.addClass(PANEL_CLASS);
    this._title = Private.createTitle();
    this._title.className = TITLE_CLASS;
    this._table = Private.createTable();
    this._table.className = TABLE_CLASS;
    this.node.appendChild(this._title as HTMLElement);
    this.node.appendChild(this._table as HTMLElement);
  }

  get source(): IMetadataPanel.IInspectable | null {
    return this._source;
  }

  set source(source: IMetadataPanel.IInspectable | null) {
    if (this._source === source) {
      // this._source.performInspection();
      return;
    }
    //Remove old subscriptions
    if (this._source) {
      this._source.inspected.disconnect(this.onInspectorUpdate, this);
      this._source.disposed.disconnect(this.onSourceDisposed, this);
    }
    this._source = source;
    //Subscribe to new object
    if (this._source) {
      this._source.inspected.connect(this.onInspectorUpdate, this);
      this._source.disposed.connect(this.onSourceDisposed, this);
      this._source.performInspection();
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.source = null;
    super.dispose();
  }

  protected onInspectorUpdate(
    sender: any,
    allArgs: IMetadataPanel.IMetadataPanelUpdate
  ): void {
    console.log("Update detected")
    if (!this.isAttached) {
      return;
    }

    const title = allArgs.title;
    const args = allArgs.payload;

    //Render new variable state
    let row: HTMLTableRowElement;
    this._table.deleteTFoot();
    this._table.createTFoot();
    this._table.tFoot!.className = TABLE_BODY_CLASS;
    let lastNameToPreview = '';
    for (let index = 0; index < args.length; index++) {
      const item = args[index];

      const name = item.varName;
      const varType = item.varType;

      row = this._table.tFoot!.insertRow();
      row.className = TABLE_ROW_CLASS;

      // Add onclick event for PREVIEW
      let previewCell = row.insertCell(0);
      if (item.isMatrix) {
        previewCell.title = 'View Preview';
        previewCell.className = 'amphi-MetadataPanel-previewButton';
        const previewIcon = searchIcon.element();
        previewIcon.onclick = (ev: MouseEvent): any => {

          const command = 'pipeline-console:open';
          this.app.commands.execute(command, {}).catch(reason => {
          console.error(
            `An error occurred during the execution of ${command}.\n${reason}`
            );
          });
          this._source
            ?.performPreview(name)
            .then((htmlData: any) => {
              // this._showSample(htmlData, name);
              // Open new widget rendering htmlData
            });
        };
        previewCell.append(previewIcon);
      } else {
        previewCell.innerHTML = ''; // Or handle non-matrix items differently
      }

      // Correctly assign name to a new cell
      let nameCell = row.insertCell(1);
      nameCell.className = TABLE_NAME_CLASS; // Ensure this is the correct class name
      nameCell.innerHTML = '<b>' + name + '</b><br><small><i>' + item.varShape + '</i></small>';

      let contentCell = row.insertCell(2);
      contentCell.innerHTML = item.varContent.split(',').join('<br>');

      lastNameToPreview = name;
    }



      const tFoot = this._table.tFoot;
      if (tFoot) {
        const rows = Array.from(tFoot.rows);
        for (let i = rows.length - 1; i >= 0; i--) {
          tFoot.appendChild(rows[i]); // Re-append each row in reverse order
        }
        // this._source.performPreview(lastNameToPreview) // Add a name
      }

  }

  /**
   * Handle source disposed signals.
   */
  protected onSourceDisposed(sender: any, args: void): void {
    this.source = null;
  }

  private _showSample(htmlData: string, name: string): void {
    // Create a custom widget to display the HTML content
    const sample = new Widget();
    sample.node.innerHTML = htmlData; // Inject HTML data directly into the widget's node
    sample.node.className = "preview_data";
    sample.title.label = name;
    sample.title.closable = true;
    sample.id = 'widget-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);

    const metadataPanelId = 'amphi-logConsole'; // Using the provided log console panel ID
    let variableInspectorPanel = null;

    // Iterate over each widget in the 'main' area to find the log console
    for (const widget of this.app.shell.widgets('main')) {
      if (widget.id === metadataPanelId) {
        variableInspectorPanel = widget;
        break;
      }
    }

    this.app.shell.add(sample, 'main', { ref: variableInspectorPanel.id, mode: 'tab-after' });
    this.app.shell.activateById(sample.id);
  }

  private _showMatrix(
    dataModel: DataModel,
    name: string,
    varType: string
  ): void {

    const datagrid = new DataGrid();
    datagrid.dataModel = dataModel;
    datagrid.title.label = varType + ': ' + name;
    datagrid.title.closable = true;
    const lout: DockLayout = this.parent!.layout as DockLayout;
    lout.addWidget(datagrid);
    // lout.addWidget(datagrid, { mode: 'split-right' });
    //todo activate/focus matrix widget
  }
}

namespace Private {
  const entityMap = new Map<string, string>(
    Object.entries({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    })
  );

  export function escapeHtml(source: string): string {
    return String(source).replace(
      /[&<>"'/]/g,
      (s: string) => entityMap.get(s)!
    );
  }

  export function createTable(): HTMLTableElement {
    const table = document.createElement('table');
    table.createTHead();
    const hrow = table.tHead!.insertRow(0) as HTMLTableRowElement;

    const cell2 = hrow.insertCell(0);
    cell2.innerHTML = '';
    const cell3 = hrow.insertCell(1);
    cell3.innerHTML = 'Component Output';
    /*
    const cell4 = hrow.insertCell(2);
    cell4.innerHTML = 'Rows';
    */
    const cell5 = hrow.insertCell(2);
    cell5.innerHTML = 'Schema';
    return table;
  }

  export function createTitle(header = ''): HTMLParagraphElement {
    const title = document.createElement('p');
    title.innerHTML = header;
    return title;
  }
}