import { VariableInspectionHandler } from './handler';

import { MetadataPanelPanel } from './metadatapanel';

import { IMetadataPanel, IMetadataPanelManager } from './tokens';
import { JupyterFrontEnd } from '@jupyterlab/application';

/**
 * A class that manages variable inspector widget instances and offers persistent
 * `IMetadataPanel` instance that other plugins can communicate with.
 */
export class MetadataPanelManager implements IMetadataPanelManager {
  private _source: IMetadataPanel.IInspectable | null = null;
  private _panel: MetadataPanelPanel | null = null;
  private _handlers: { [id: string]: VariableInspectionHandler } = {};

  hasHandler(id: string): boolean {
    if (this._handlers[id]) {
      return true;
    } else {
      return false;
    }
  }

  getHandler(id: string): VariableInspectionHandler {
    return this._handlers[id];
  }

  addHandler(handler: VariableInspectionHandler): void {
    this._handlers[handler.id] = handler;
  }

  /**
   * The current inspector panel.
   */
  get panel(): MetadataPanelPanel | null {
    return this._panel;
  }

  set panel(panel: MetadataPanelPanel | null) {
    if (this.panel === panel) {
      return;
    }
    this._panel = panel;

    if (panel && !panel.source) {
      panel.source = this._source;
    }
  }

  /**
   * The source of events the inspector panel listens for.
   */
  get source(): IMetadataPanel.IInspectable | null {
    return this._source;
  }

  set source(source: IMetadataPanel.IInspectable | null) {
    if (this._source === source) {
      return;
    }

    // remove subscriptions
    if (this._source) {
      this._source.disposed.disconnect(this._onSourceDisposed, this);
    }

    this._source = source;

    if (this._panel && !this._panel.isDisposed) {
      this._panel.source = this._source;
    }
    // Subscribe to new source
    if (this._source) {
      this._source.disposed.connect(this._onSourceDisposed, this);
    }
  }

  private _onSourceDisposed(): void {
    this._source = null;
  }
}