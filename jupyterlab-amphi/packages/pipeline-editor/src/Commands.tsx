import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Node,
  useKeyPress,
  useReactFlow,
  getConnectedEdges,
  KeyCode,
  Edge,
  XYPosition,
  useStore,
} from 'reactflow';

const Format = "application/react-flow-format";

export function useCopyPaste<NodeData, EdgeData>() {
  const mousePosRef = useRef<XYPosition>({ x: 0, y: 0 });
  const rfDomNode = useStore((state) => state.domNode);

  const { getNodes, setNodes, getEdges, setEdges, screenToFlowPosition } =
    useReactFlow<NodeData, EdgeData>();

  const [bufferedNodes, setBufferedNodes] = useState([] as Node<NodeData>[]);
  const [bufferedEdges, setBufferedEdges] = useState([] as Edge<EdgeData>[]);

  useEffect(() => {
    const events = ['cut', 'copy', 'paste'];

    if (rfDomNode) {
      const onMouseMove = (event: MouseEvent) => {
        mousePosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      };

      rfDomNode.addEventListener('mousemove', onMouseMove);

      return () => {
        rfDomNode.removeEventListener('mousemove', onMouseMove);
      };
    }
  }, [rfDomNode]);

  const copy = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    const selectedEdges = getConnectedEdges(selectedNodes, getEdges()).filter(
      (edge) => {
        const isExternalSource = selectedNodes.every(
          (n) => n.id !== edge.source
        );
        const isExternalTarget = selectedNodes.every(
          (n) => n.id !== edge.target
        );

        return !(isExternalSource || isExternalTarget);
      }
    );

    const data = JSON.stringify({
      type: 'nodes-and-edges',
      nodes: selectedNodes,
      edges: selectedEdges,
    });
    navigator.clipboard.writeText(data);
  }, [getNodes, getEdges]);

  const cut = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    const selectedEdges = getConnectedEdges(selectedNodes, getEdges()).filter(
      (edge) => {
        const isExternalSource = selectedNodes.every(
          (n) => n.id !== edge.source
        );
        const isExternalTarget = selectedNodes.every(
          (n) => n.id !== edge.target
        );

        return !(isExternalSource || isExternalTarget);
      }
    );

    const data = JSON.stringify({
      type: 'nodes-and-edges',
      nodes: selectedNodes,
      edges: selectedEdges,
    });
    navigator.clipboard.writeText(data);

    setNodes((nodes) => nodes.filter((node) => !node.selected));
    setEdges((edges) => edges.filter((edge) => !selectedEdges.includes(edge)));
  }, [getNodes, setNodes, getEdges, setEdges]);

  const paste = useCallback(async () => {
    const pastePos = screenToFlowPosition({
      x: mousePosRef.current.x,
      y: mousePosRef.current.y,
    });
  
    try {
      const text = await navigator.clipboard.readText();
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (jsonError) {
        // If JSON parsing fails, it means it's plain text
        parsedData = null;
      }
  
      if (parsedData && parsedData.type === 'nodes-and-edges') {
        const { nodes: bufferedNodes, edges: bufferedEdges } = parsedData;
  
        const minX = Math.min(...bufferedNodes.map((s) => s.position.x));
        const minY = Math.min(...bufferedNodes.map((s) => s.position.y));
  
        const now = Date.now();
  
        const newNodes: Node<NodeData>[] = bufferedNodes.map((node) => {
          const id = `${node.id}-${now}`;
          const x = pastePos.x + (node.position.x - minX);
          const y = pastePos.y + (node.position.y - minY);
  
          return { ...node, id, position: { x, y } };
        });
  
        const newEdges: Edge<EdgeData>[] = bufferedEdges.map((edge) => {
          const id = `${edge.id}-${now}`;
          const source = `${edge.source}-${now}`;
          const target = `${edge.target}-${now}`;
  
          return { ...edge, id, source, target };
        });
  
        setNodes((nodes) => [
          ...nodes.map((node) => ({ ...node, selected: false })),
          ...newNodes,
        ]);
        setEdges((edges) => [
          ...edges.map((edge) => ({ ...edge, selected: false })),
          ...newEdges,
        ]);
      } else if (!parsedData) {
        // Handle plain text paste
        console.log("plain text")
        const activeElement = document.activeElement as HTMLElement;
        console.log("active element %o", activeElement)
        console.log("active element tagname %o", activeElement.tagName)
        console.log("text %o", text)
        

        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          (activeElement as HTMLInputElement | HTMLTextAreaElement).value += text;
  
          // Manually trigger input event to ensure React picks up the change
          const event = new Event('input', { bubbles: true });
          activeElement.dispatchEvent(event);
        } else {
          console.log("Pasted text: ", text);
        }
      } else {
        // Fallback to normal text paste if it's not nodes and edges
        console.log("fallback to normal");
      }
    } catch (error) {
      console.error("Failed to read clipboard contents: ", error);
    }
  }, [screenToFlowPosition, setNodes, setEdges]);
  

  useShortcut(['Meta+x', 'Control+x'], cut);
  useShortcut(['Meta+c', 'Control+c'], copy);
  useShortcut(['Meta+v', 'Control+v'], paste);

  return { cut, copy, paste, bufferedNodes, bufferedEdges };
}


function useShortcut(keyCode: KeyCode, callback: Function): void {
  const [didRun, setDidRun] = useState(false);
  const shouldRun = useKeyPress(keyCode);

  useEffect(() => {
    if (shouldRun && !didRun) {
      callback();
      setDidRun(true);
    } else {
      setDidRun(shouldRun);
    }
  }, [shouldRun, didRun, callback]);
}



type UseUndoRedoOptions = {
  maxHistorySize: number;
  enableShortcuts: boolean;
};

type UseUndoRedo = (options?: UseUndoRedoOptions) => {
  undo: () => void;
  redo: () => void;
  takeSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

type HistoryItem = {
  nodes: Node[];
  edges: Edge[];
};

const defaultOptions: UseUndoRedoOptions = {
  maxHistorySize: 100,
  enableShortcuts: true,
};

// https://redux.js.org/usage/implementing-undo-history
export const useUndoRedo: UseUndoRedo = ({
  maxHistorySize = defaultOptions.maxHistorySize,
  enableShortcuts = defaultOptions.enableShortcuts,
} = defaultOptions) => {
  // the past and future arrays store the states that we can jump to
  const [past, setPast] = useState<HistoryItem[]>([]);
  const [future, setFuture] = useState<HistoryItem[]>([]);

  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

  const takeSnapshot = useCallback(() => {
    // push the current graph to the past state
    setPast((past) => [
      ...past.slice(past.length - maxHistorySize + 1, past.length),
      { nodes: getNodes(), edges: getEdges() },
    ]);

    // whenever we take a new snapshot, the redo operations need to be cleared to avoid state mismatches
    setFuture([]);
  }, [getNodes, getEdges, maxHistorySize]);

  const undo = useCallback(() => {
    // get the last state that we want to go back to
    const pastState = past[past.length - 1];

    if (pastState) {
      // first we remove the state from the history
      setPast((past) => past.slice(0, past.length - 1));
      // we store the current graph for the redo operation
      setFuture((future) => [
        ...future,
        { nodes: getNodes(), edges: getEdges() },
      ]);
      // now we can set the graph to the past state
      setNodes(pastState.nodes);
      setEdges(pastState.edges);
    }
  }, [setNodes, setEdges, getNodes, getEdges, past]);

  const redo = useCallback(() => {
    const futureState = future[future.length - 1];

    if (futureState) {
      setFuture((future) => future.slice(0, future.length - 1));
      setPast((past) => [...past, { nodes: getNodes(), edges: getEdges() }]);
      setNodes(futureState.nodes);
      setEdges(futureState.edges);
    }
  }, [setNodes, setEdges, getNodes, getEdges, future]);

  useEffect(() => {
    // this effect is used to attach the global event handlers
    if (!enableShortcuts) {
      return;
    }

    const keyDownHandler = (event: KeyboardEvent) => {
      if (
        event.key === 'z' &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        redo();
      } else if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        undo();
      }
    };

    document.addEventListener('keydown', keyDownHandler);

    return () => {
      document.removeEventListener('keydown', keyDownHandler);
    };
  }, [undo, redo, enableShortcuts]);

  return {
    undo,
    redo,
    takeSnapshot,
    canUndo: !past.length,
    canRedo: !future.length,
  };
};



export default { useUndoRedo, useCopyPaste };


