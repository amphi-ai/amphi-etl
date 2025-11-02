// logconsole.tsx
import { Widget, StackedPanel } from '@lumino/widgets';
import { DataGrid, DataModel } from '@lumino/datagrid';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { CommandRegistry } from '@lumino/commands';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IPipelineConsole } from './tokens';
import { Message } from '@lumino/messaging';
import React from 'react';
import ReactDOM from 'react-dom';
import DataView from './DataView';
import DocumentView from './DocumentView';
import { Alert, Tag, Typography, Divider } from 'antd';
import { clockIcon, pipelineIcon, gridIcon, cpuIcon, labelIcon } from './icons';


const TITLE_CLASS = 'amphi-Console-title';
const PANEL_CLASS = 'amphi-Console';
const TABLE_CLASS = 'amphi-Console-table';
const TABLE_BODY_CLASS = 'amphi-Console-content';
const TABLE_ROW_CLASS = 'amphi-Console-table-row';
const SINGLE_COLUMN_CLASS = 'amphi-Console-single-column'; // New class for single column

/**
 * A panel that renders the pipeline logs
 */
export class PipelineConsolePanel
  extends Widget
  implements IPipelineConsole {
  private _app: JupyterFrontEnd; // Store the app object
  private _commands: CommandRegistry;
  private _context: DocumentRegistry.Context;
  private _source: IPipelineConsole.ILogging | null = null;
  private _console: HTMLTableElement;
  private _title: HTMLElement;
  private _unbind: (() => void) | null = null;

 constructor(app: JupyterFrontEnd, commands: CommandRegistry, context: DocumentRegistry.Context) {
    super();
    this._app = app;
    this._commands = commands;
    this._context = context;
    this.addClass(PANEL_CLASS);

    const portalDiv = document.createElement('div');
    portalDiv.id = 'portal';
    portalDiv.style.position = 'absolute';
    portalDiv.style.left = '0';
    portalDiv.style.top = '0';
    portalDiv.style.width = '100%';
    portalDiv.style.height = '100%';
    portalDiv.style.zIndex = '9999';

    this._title = Private.createTitle();
    this._title.className = TITLE_CLASS;
    this._console = Private.createConsole();
    this._console.className = TABLE_CLASS;

    portalDiv.appendChild(this._title);
    portalDiv.appendChild(this._console);
    this.node.appendChild(portalDiv);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);

    const stop = (e: Event) => e.stopPropagation();

    // capture phase so it wins over higher-level listeners
    this.node.addEventListener('keydown', stop, true);
    this.node.addEventListener('copy', stop, true);
    this.node.addEventListener('paste', stop, true);

    this._unbind = () => {
      this.node.removeEventListener('keydown', stop, true);
      this.node.removeEventListener('copy', stop, true);
      this.node.removeEventListener('paste', stop, true);
    };
  }

  protected onBeforeDetach(msg: Message): void {
    if (this._unbind) {
      this._unbind();
      this._unbind = null;
    }
    super.onBeforeDetach(msg);
  }

  get source(): IPipelineConsole.ILogging | null {
    return this._source;
  }

  set source(source: IPipelineConsole.ILogging | null) {
    if (this._source === source) {
      return;
    }
    // Remove old subscriptions
    if (this._source) {
      this._source.disposed.disconnect(this.onSourceDisposed, this);
    }
    this._source = source;
    // Subscribe to new object
    if (this._source) {
      this._source.disposed.connect(this.onSourceDisposed, this);
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

  onNewLog(date: string, pipelineName: string, level: string, content: any, metadata: any): void {
    if (!this.isAttached) {
      return;
    }

    // Ensure the table footer exists
    if (!this._console.tFoot) {
      this._console.createTFoot();
      this._console.tFoot!.className = TABLE_BODY_CLASS;
    }

    // Insert a new row at the beginning of the table footer
    let row = this._console.tFoot!.insertRow(0);
    row.className = `${TABLE_ROW_CLASS} ${SINGLE_COLUMN_CLASS}`; // Add single column class

    // Add a single cell to the new row
    let singleCell = row.insertCell(0);
    singleCell.style.padding = "5px";
    singleCell.className = SINGLE_COLUMN_CLASS;

    let dateTag;
    let pipelineNameTag = <Tag bordered={false} icon={<pipelineIcon.react className="anticon amphi-Console-icon-size" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{pipelineName}</Tag>;
    let dataframeSizeTag = null;
    let dfNameTag = null;
    let runtimeTag = null;
    let contentComponent;
    let viewData = null;

    switch (level) {
      case "info":
        dateTag = <Tag bordered={false} icon={<clockIcon.react className="anticon" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{date}</Tag>;
        contentComponent = (
          <Alert
            showIcon
            banner
            message={<div dangerouslySetInnerHTML={{ __html: content }} />}
            type={/SUCCESS/i.test(content) ? "success" : /ERROR|WARNING/i.test(content) ? "warning" : "info"}
          />
        );
        break;
      case "error":
        dateTag = <Tag bordered={false} icon={<clockIcon.react className="anticon amphi-Console-icon-size" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{date}</Tag>;
        contentComponent = (
          <Alert
            message="Error"
            banner
            showIcon
            description={<div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') }} />}
            type="error"
          />
        );
        break;
      case "data":
        dateTag = <Tag bordered={false} icon={<clockIcon.react className="anticon amphi-Console-icon-size" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{date}</Tag>;
        dfNameTag = <Tag bordered={false} icon={<labelIcon.react className="anticon amphi-Console-icon-size" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{metadata.dfName}</Tag>;
        runtimeTag = <Tag bordered={false} icon={<cpuIcon.react className="anticon amphi-Console-icon-size" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{metadata.runtime}</Tag>;
        viewData = (
          <Tag
            bordered={false}
            onClick={() => this._commands.execute('pipeline-editor-component:view-data', { nodeId: metadata.nodeId, context: this._context as any })} // Use the command here
            icon={<clockIcon.react className="anticon amphi-Console-icon-size" />}
            color="#44776D"
            style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
          >
            View data
          </Tag>
        );

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        console.log(doc);
        const firstDiv = doc.querySelector('div');
        if (firstDiv && firstDiv.id === 'documents') {
          contentComponent = <DocumentView htmlData={content} />;
        } else {
          // Extract dataframe size from the last paragraph if it exists
          const sizeElement = doc.querySelector('p:last-of-type');
          let dataframeSize = null;

          if (sizeElement && sizeElement.textContent.includes('rows ×')) {
            dataframeSize = sizeElement.textContent.trim();
          }

          if (dataframeSize) {
            dataframeSizeTag = <Tag bordered={false} icon={<gridIcon.react className="anticon amphi-Console-icon-size" />} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{dataframeSize}</Tag>;
          }

          contentComponent = (
            <>
              <DataView htmlData={content} />
            </>
          );
        }
        break;
      case 'rich':
        dateTag = <Tag bordered={false} icon={<clockIcon.react className="anticon amphi-Console-icon-size" />}>{date}</Tag>;
        contentComponent = <div dangerouslySetInnerHTML={{ __html: content }} />;
        break;
      default:
        dateTag = <Tag bordered={false} >{date}</Tag>;
        contentComponent = <div>{content}</div>;
    }

    // Render tags and content inside the single cell
    ReactDOM.render(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Tags on the same line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'clip'  }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {dateTag}
            {pipelineNameTag}
            {dfNameTag}
            {dataframeSizeTag}
            {runtimeTag}
          </div>
          {/* Aligned to the right */}
          <div>
          </div>
        </div>
        {/* Content below the tags */}
        <div>
          {contentComponent}
        </div>
        {/* Divider between logs */}
        <Divider style={{ margin: '6px 0' }} />
      </div>,
      singleCell
    );
    // Scroll to the top
    this._console.parentElement.scrollTop = 0;
  }

  clearLogs(): void {
    // Check if table footer exists and remove all its rows
    if (this._console.tFoot) {
      while (this._console.tFoot.rows.length > 0) {
        this._console.tFoot.deleteRow(0);
      }
    }
  }

  /**
   * Handle source disposed signals.
   */
  protected onSourceDisposed(sender: any, args: void): void {
    this.source = null;
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

  export function createConsole(): HTMLTableElement {
    const table = document.createElement('table');
    return table;
  }

  export function createTitle(header = ''): HTMLParagraphElement {
    const title = document.createElement('p');
    title.innerHTML = header;
    return title;
  }
}
