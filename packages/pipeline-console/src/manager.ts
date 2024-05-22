import { PipelineConsoleHandler } from './handler';
import { PipelineConsolePanel } from './logconsole';
import { IPipelineConsole, IPipelineConsoleManager } from './tokens';

/**
 * A class that manages variable inspector widget instances and offers persistent
 * `IMetadataPanel` instance that other plugins can communicate with.
 */
export class LogConsoleManager implements IPipelineConsoleManager {
  private _source: IPipelineConsole.ILogging | null = null;
  private _panel: PipelineConsolePanel | null = null;
  private _handlers: { [id: string]: PipelineConsoleHandler } = {};

  hasHandler(id: string): boolean {
    if (this._handlers[id]) {
      return true;
    } else {
      return false;
    }
  }

  getHandler(id: string): PipelineConsoleHandler {
    return this._handlers[id];
  }

  addHandler(handler: PipelineConsoleHandler): void {
    this._handlers[handler.id] = handler;
  }

  /**
   * The current console panel.
   */
  get panel(): PipelineConsolePanel | null {
    return this._panel;
  }

  set panel(panel: PipelineConsolePanel | null) {
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
  get source(): IPipelineConsole.ILogging | null {
    return this._source;
  }

  set source(source: IPipelineConsole.ILogging  | null) {
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