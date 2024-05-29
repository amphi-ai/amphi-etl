import { ISessionContext } from '@jupyterlab/apputils';

import { KernelMessage } from '@jupyterlab/services';

import { IShellFuture } from '@jupyterlab/services/lib/kernel/kernel';

import {
  IExecuteReplyMsg,
  IExecuteRequestMsg
} from '@jupyterlab/services/lib/kernel/messages';

import { ISignal, Signal } from '@lumino/signaling';

/**
 * Connector class that handles execute request to a kernel
 */
export class KernelConnector {
  private _session: ISessionContext;
  private _kernelRestarted = new Signal<this, Promise<void>>(this);

  constructor(options: KernelConnector.IOptions) {
    this._session = options.session;
    this._session.statusChanged.connect(
      (sender: ISessionContext, newStatus: KernelMessage.Status) => {
        switch (newStatus) {
          case 'restarting':
            this._kernelRestarted.emit(this._session.ready);
            break;
          case 'autorestarting':
            this._kernelRestarted.emit(this._session.ready);
            break;
          default:
            break;
        }
      }
    );
  }

  get kernelRestarted(): ISignal<KernelConnector, Promise<void>> {
    return this._kernelRestarted;
  }

  get kernelLanguage(): Promise<string> {
    if (!this._session.session?.kernel) {
      return Promise.resolve('');
    }

    return this._session.session.kernel.info.then(infoReply => {
      return infoReply.language_info.name;
    });
  }

  get kernelName(): string {
    return this._session.kernelDisplayName;
  }

  /**
   *  A Promise that is fulfilled when the session associated w/ the connector is ready.
   */
  get ready(): Promise<void> {
    return this._session.ready;
  }

  /**
   *  A signal emitted for iopub messages of the kernel associated with the kernel.
   */
  get iopubMessage(): ISignal<ISessionContext, KernelMessage.IMessage> {
    return this._session.iopubMessage;
  }

  /**
   * Executes the given request on the kernel associated with the connector.
   * @param content: IExecuteRequestMsg to forward to the kernel.
   * @param ioCallback: Callable to forward IOPub messages of the kernel to.
   * @returns Promise<KernelMessage.IExecuteReplyMsg>
   */
  fetch(
    content: KernelMessage.IExecuteRequestMsg['content'],
    ioCallback: (msg: KernelMessage.IIOPubMessage) => any
  ): Promise<KernelMessage.IExecuteReplyMsg> {
    const kernel = this._session.session?.kernel;
    if (!kernel) {
      return Promise.reject(
        new Error('Require kernel to perform variable inspection!')
      );
    }    
    const future = kernel.requestExecute(content);
    future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      ioCallback(msg);
    };
    return future.done as Promise<KernelMessage.IExecuteReplyMsg>;
  }

  execute(
    content: KernelMessage.IExecuteRequestMsg['content']
  ): IShellFuture<IExecuteRequestMsg, IExecuteReplyMsg> {
    if (!this._session.session?.kernel) {
      throw new Error('No session available.');
    }
    return this._session.session.kernel.requestExecute(content);
  }
}

export namespace KernelConnector {
  export interface IOptions {
    session: ISessionContext;
  }
}