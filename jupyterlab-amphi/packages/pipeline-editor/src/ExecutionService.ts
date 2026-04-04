// ExecutionService.ts
// Service for managing and broadcasting pipeline component execution status

import { Signal } from '@lumino/signaling';
import { IPipelineExecutionService, ExecutionResult } from '@amphi/pipeline-components-manager';

/**
 * Implementation of the pipeline execution service
 * Manages execution state and broadcasts updates via signals
 */
export class PipelineExecutionService implements IPipelineExecutionService {
  private _executionUpdated = new Signal<this, ExecutionResult>(this);
  private _executionCleared = new Signal<this, void>(this);

  /**
   * Signal emitted when any component's execution status changes
   */
  get executionUpdated() {
    return this._executionUpdated;
  }

  /**
   * Signal emitted when all execution data should be cleared
   */
  get executionCleared() {
    return this._executionCleared;
  }

  /**
   * Report an execution result
   * This will emit the executionUpdated signal
   */
  reportExecution(result: ExecutionResult): void {
    console.log(`[ExecutionService] Reporting execution for ${result.nodeId}: ${result.status}`);
    this._executionUpdated.emit(result);
  }

  /**
   * Clear all execution data
   * Can be used when starting a new pipeline run
   */
  clearAllExecutionData(): void {
    console.log('[ExecutionService] Clearing all execution data');
    this._executionCleared.emit();
  }
}
