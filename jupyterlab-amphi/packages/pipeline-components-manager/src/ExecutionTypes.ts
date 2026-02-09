// ExecutionTypes.ts
// Types for component execution metadata and status

export interface ExecutionMetadata {
  status: 'idle' | 'running' | 'success' | 'failed';
  timestamp?: number;
  executionTime?: number;  // in seconds
  rowCount?: number;
  columnCount?: number;
  memorySize?: string;     // e.g., "1.2 MB"
  errorMessage?: string;
  errorType?: string;
}

export interface ExecutionResult {
  nodeId: string;
  status: 'running' | 'success' | 'failed';
  timestamp: number;
  metadata: {
    rowCount?: number;
    columnCount?: number;
    executionTime?: number;
    errorMessage?: string;
    errorType?: string;
  };
}
