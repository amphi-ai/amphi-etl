import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { DataModel } from '@lumino/datagrid';
import { IObservableDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import type { VariableInspectionHandler } from './handler';

export const IMetadataPanelManager = new Token<IMetadataPanelManager>(
  'jupyterlab_extension/metadatapanel:IMetadataPanelManager'
);

export interface IMetadataPanelManager {
  source: IMetadataPanel.IInspectable | null;
  hasHandler(id: string): boolean;
  getHandler(id: string): VariableInspectionHandler;
  addHandler(handler: VariableInspectionHandler): void;
}

/**
 * The inspector panel token.
 */
export const IMetadataPanel = new Token<IMetadataPanel>(
  'jupyterlab_extension/metadatapanel:IMetadataPanel'
);

/**
 * An interface for an inspector.
 */
export interface IMetadataPanel {
  source: IMetadataPanel.IInspectable | null;
}

/**
 * A namespace for inspector interfaces.
 */
export namespace IMetadataPanel {
  export interface IInspectable extends IObservableDisposable {
    inspected: ISignal<IInspectable, IMetadataPanelUpdate>;
    rendermime: IRenderMimeRegistry | null;
    performInspection(): void;
    performPreview(
      varName: string
    ): any;
    performMatrixInspection(
      varName: string,
      maxRows?: number
    ): Promise<DataModel>;
    performWidgetInspection(
      varName: string
    ): Kernel.IShellFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    >;
    performDelete(varName: string): void;
    performAllDelete(): void;
  }

  export interface IMetadataPanelUpdate {
    title: IVariableTitle;
    payload: Array<IVariable>;
  }

  export interface IVariable {
    varName: string;
    varSize: string;
    varShape: string;
    varContent: string;
    varType: string;
    isMatrix: boolean;
    isWidget: boolean;
  }
  export interface IVariableTitle {
    kernelName?: string;
    contextName?: string; //Context currently reserved for special information.
  }
}