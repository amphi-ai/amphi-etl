// pipelineUtils.ts
export const lockNode = (nodeId: string, setNodes: React.Dispatch<React.SetStateAction<any>>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, draggable: false } : node
      )
    );
  };