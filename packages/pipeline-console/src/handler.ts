import { ISessionContext } from '@jupyterlab/apputils';

import { IExecuteResult } from '@jupyterlab/nbformat';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { KernelMessage, Kernel } from '@jupyterlab/services';

import {
  IExecuteInputMsg,
  IExecuteReplyMsg,
  IExecuteRequestMsg
} from '@jupyterlab/services/lib/kernel/messages';

import { Signal, ISignal } from '@lumino/signaling';

import { JSONModel, DataModel } from '@lumino/datagrid';

import { IPipelineConsole } from './tokens';

import { KernelConnector } from './kernelconnector';

abstract class AbstractHandler implements IPipelineConsole.ILogging {
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  protected _connector: KernelConnector;
  protected _rendermime: IRenderMimeRegistry | null = null;

  constructor(connector: KernelConnector) {
    this._connector = connector;
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get rendermime(): IRenderMimeRegistry | null {
    return this._rendermime;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
    Signal.clearData(this);
  }

}

/**
 * An object that handles code inspection.
 */
export class PipelineConsoleHandler extends AbstractHandler {
  private _ready: Promise<void>;
  private _id: string;

  constructor(options: PipelineConsoleHandler.IOptions) {
    super(options.connector);
    this._id = options.id;
    this._rendermime = options.rendermime ?? null;

    this._ready = this._connector.ready;

    this._connector.kernelRestarted.connect(
      (sender, kernelReady: Promise<void>) => {
        const title: IPipelineConsole.ILogTitle = {
          contextName: '<b>Restarting kernel...</b> '
        };

        this._ready = this._connector.ready;
      }
    );
  }

  get id(): string {
    return this._id;
  }

  get ready(): Promise<void> {
    return this._ready;
  }

}
/**
 * A name space for inspection handler statics.
 */
export namespace PipelineConsoleHandler {
  /**
   * The instantiation options for an inspection handler.
   */
  export interface IOptions {
    connector: KernelConnector;
    rendermime?: IRenderMimeRegistry;
    id: string;
  }
}