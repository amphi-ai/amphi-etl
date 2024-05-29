import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { DataModel } from '@lumino/datagrid';
import { IObservableDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import type { PipelineConsoleHandler } from './handler';
import { PipelineConsolePanel } from './logconsole';


export const IPipelineConsoleManager = new Token<IPipelineConsoleManager>(
  'jupyterlab_extension/logconsole:IPipelineConsoleManager'
);

export interface IPipelineConsoleManager {
  source: IPipelineConsole.ILogging | null;
  hasHandler(id: string): boolean;
  getHandler(id: string): PipelineConsoleHandler;
  addHandler(handler: PipelineConsoleHandler): void;
}

/**
 * The inspector panel token.
 */
export const IPipelineConsole = new Token<IPipelineConsole>(
  'jupyterlab_extension/logconsole:IPipelineConsole'
);

/**
 * An interface for an inspector.
 */
export interface IPipelineConsole {
  source: IPipelineConsole.ILogging | null;
}

/**
 * A namespace for inspector interfaces.
 */
export namespace IPipelineConsole {
  export interface ILogging extends IObservableDisposable {
    rendermime: IRenderMimeRegistry | null;
  }

  export interface ILogConsoleUpdate {
    title: ILogTitle;
    payload: Array<ILog>;
  }

  export interface ILog {
    varDate: string;
    varLevel: string;
    varContent: string;
  }
  export interface ILogTitle {
    kernelName?: string;
    contextName?: string; //Context currently reserved for special information.
  }
}