import { Widget } from '@lumino/widgets';
import { IPipelineConsole } from './tokens';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import DataView from './DataView';
import DocumentView from './DocumentView'
import { Alert, Spin, DatePicker, Typography, Space } from 'antd';
import { ClockCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const TITLE_CLASS = 'amphi-Console-title';
const PANEL_CLASS = 'amphi-Console';
const TABLE_CLASS = 'amphi-Console-table';
const TABLE_BODY_CLASS = 'amphi-Console-content';
const TABLE_ROW_CLASS = 'amphi-Console-table-row';
const TABLE_DATE_CLASS = 'amphi-Console-date';

/**
 * A panel that renders the pipeline logs
 */
export class PipelineConsolePanel
  extends Widget
  implements IPipelineConsole {
  private _source: IPipelineConsole.ILogging | null = null;
  private _console: HTMLTableElement;
  private _title: HTMLElement;

  constructor() {
    super();
    this.addClass(PANEL_CLASS);
    this._title = Private.createTitle();
    this._title.className = TITLE_CLASS;
    this._console = Private.createConsole();
    this._console.className = TABLE_CLASS;
    this.node.appendChild(this._title as HTMLElement);
    this.node.appendChild(this._console as HTMLElement);
  }


  get source(): IPipelineConsole.ILogging | null {
    return this._source;
  }

  set source(source: IPipelineConsole.ILogging | null) {
    if (this._source === source) {
      return;
    }
    //Remove old subscriptions
    if (this._source) {
      this._source.disposed.disconnect(this.onSourceDisposed, this);
    }
    this._source = source;
    //Subscribe to new object
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

  onNewLog(date: string, level: string, content): void {

    if (!this.isAttached) {
      return;
    }

    // Ensure the table footer exists
    if (!this._console.tFoot) {
      this._console.createTFoot();
      this._console.tFoot!.className = TABLE_BODY_CLASS;
    }

    // Insert a new row at the beginning of the table footer
    let row = this._console.tFoot!.insertRow(0); // Changed from -1 to 0
    row.className = `${TABLE_ROW_CLASS}`;

    // Add cells to the new row
    let cell = row.insertCell(0);
    let container;
    cell.innerHTML = `
    <span>
      ${ReactDOMServer.renderToString(
      <Space>
        <Text>{date}</Text>
      </Space>
    )}
    </span>
  `;
    cell.style.padding = "5px";  // Remove padding from the cell
    cell.className = TABLE_DATE_CLASS;
    const spinIndicator = <LoadingOutlined style={{ fontSize: 24 }} spin />;

    switch (level) {
      case "info":
        cell = row.insertCell(1);
        cell.style.padding = "5px"; // Remove padding from the cell
        container = document.createElement('div'); // Create a container for the React component
        cell.appendChild(container); // Append the container to the cell

        // Determine the alert type based on content
        let alertType: "info" | "warning" | "success" = /SUCCESS/i.test(content)
          ? "success"
          : /ERROR|WARNING/i.test(content)
            ? "warning"
            : "info";

        console.log("content %o", content)

        ReactDOM.render(
          <Alert
            showIcon
            message={<div dangerouslySetInnerHTML={{ __html: content }} />}
            type={alertType}
          />,
          container
        );
        break;
      case "error":
        cell = row.insertCell(1);
        cell.style.padding = "5px";  // Remove padding from the cell
        container = document.createElement('div'); // Create a container for the React component
        cell.appendChild(container);  // Append the container to the cell
        ReactDOM.render(
          <Alert
            message="Error"
            showIcon
            description={<div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') }} />}
            type="error"
          />,
          container
        );
        break;
      case "data":
        cell = row.insertCell(1);
        cell.style.padding = "5";  // Remove padding from the cell
        container = document.createElement('div'); // Create a container for the React component
        cell.appendChild(container);  // Append the container to the cell

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const firstDiv = doc.querySelector('div');

        if (firstDiv && firstDiv.id === 'documents') {
          ReactDOM.render(<DocumentView htmlData={content} />, container);
        } else {
          ReactDOM.render(<DataView htmlData={content} />, container);
        }
        break;
      default:
        // Handle other cases or do nothing
        break;
    }

    // Scroll to the top
    this._console.parentElement.scrollTop = 0; // Changed to scroll to the top
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