// ExecutionBadge.tsx
// Visual badge component to display execution status on pipeline components

import React from 'react';
import { Badge } from 'antd';
import { ExecutionMetadata } from './ExecutionTypes';

interface ExecutionBadgeProps {
  execution?: ExecutionMetadata;
}

/**
 * Badge component that displays execution status with colored dots
 */
export const ExecutionBadge: React.FC<ExecutionBadgeProps> = ({ execution }) => {
  if (!execution || execution.status === 'idle') {
    return null;
  }

  const getStatusConfig = () => {
    switch (execution.status) {
      case 'running':
        return { status: 'processing' as const, color: '#1890ff' };
      case 'success':
        return { status: 'success' as const, color: '#52c41a' };
      case 'failed':
        return { status: 'error' as const, color: '#ff4d4f' };
      default:
        return { status: 'default' as const, color: '#d9d9d9' };
    }
  };

  const { status, color } = getStatusConfig();
  console.log(`[ExecutionBadge] Rendering badge for status: ${execution.status}, using badge status: ${status}, color: ${color}`);

  return (
    <Badge status={status} color={color} />
  );
};
