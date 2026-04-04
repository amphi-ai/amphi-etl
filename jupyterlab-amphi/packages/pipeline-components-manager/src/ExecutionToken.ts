// ExecutionToken.ts
// Token for pipeline execution service communication

import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { ExecutionResult } from './ExecutionTypes';

/**
 * Interface for the pipeline execution service
 * Allows components to report and listen to execution status updates
 */
export interface IPipelineExecutionService {
  /**
   * Signal emitted when a component execution status changes
   */
  executionUpdated: ISignal<IPipelineExecutionService, ExecutionResult>;

  /**
   * Signal emitted when all execution data should be cleared
   */
  executionCleared: ISignal<IPipelineExecutionService, void>;

  /**
   * Report execution result for a component
   * @param result The execution result containing nodeId, status, and metadata
   */
  reportExecution(result: ExecutionResult): void;

  /**
   * Clear all execution data for all components
   */
  clearAllExecutionData(): void;
}

/**
 * Token for the pipeline execution service
 */
export const IPipelineExecutionToken = new Token<IPipelineExecutionService>(
  '@amphi/pipeline:execution-service'
);
