// src/useCopyPaste.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  type Node,
  type Edge,
  type XYPosition,
  useReactFlow,
  getConnectedEdges,
  useStore,
  useKeyPress,
  type KeyCode
} from 'reactflow';

// are we currently typing in something that should get normal clipboard behavior
function isEditingText(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName;
  const role = el.getAttribute('role');

  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.isContentEditable) return true;
  if (role === 'textbox') return true;

  return false;
}

/**
 * Copy / Cut / Paste for React Flow canvas
 * - Cmd/Ctrl + C/X/V still clones graph selections
 * - Inputs, textareas, code editors keep native clipboard 100 percent
 *
 * Key change: we NO LONGER block the browser 'copy'/'paste'/'cut' events at all.
 * We only listen for keyboard shortcuts and run our own logic when focus is NOT in a text field.
 */
export function useCopyPaste() {
  const mousePosRef = useRef<XYPosition>({ x: 0, y: 0 });

  // React Flow root dom node (for mouse tracking only now)
  const rfDomNode = useStore((state) => state.domNode);

  // React Flow API
  const { getNodes, setNodes, getEdges, setEdges, screenToFlowPosition } =
    useReactFlow();

  // clipboard buffers
  const [bufferedNodes, setBufferedNodes] = useState<Node[]>([]);
  const [bufferedEdges, setBufferedEdges] = useState<Edge[]>([]);

  // track mouse position so paste goes where the cursor is
  useEffect(() => {
    if (!rfDomNode) return;

    const onMouseMove = (event: MouseEvent) => {
      mousePosRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    rfDomNode.addEventListener('mousemove', onMouseMove);

    return () => {
      rfDomNode.removeEventListener('mousemove', onMouseMove);
    };
  }, [rfDomNode]);

  // build list of selected nodes and all edges fully inside that selection
  const getSelectionSnapshot = useCallback(() => {
    const allNodes = getNodes();
    const selectedNodes = allNodes.filter((n) => n.selected);

    const internalEdges = getConnectedEdges(selectedNodes, getEdges()).filter(
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

    return { selectedNodes, internalEdges };
  }, [getNodes, getEdges]);

  // COPY
  const copy = useCallback(() => {
    if (isEditingText()) return; // don't hijack text fields

    const { selectedNodes, internalEdges } = getSelectionSnapshot();
    setBufferedNodes(selectedNodes);
    setBufferedEdges(internalEdges);
  }, [getSelectionSnapshot]);

  // CUT
  const cut = useCallback(() => {
    if (isEditingText()) return;

    const { selectedNodes, internalEdges } = getSelectionSnapshot();

    setBufferedNodes(selectedNodes);
    setBufferedEdges(internalEdges);

    // remove them from the graph
    setNodes((nodes) => nodes.filter((node) => !node.selected));
    setEdges((edges) => edges.filter((edge) => !internalEdges.includes(edge)));
  }, [getSelectionSnapshot, setNodes, setEdges]);

  // PASTE
  const paste = useCallback(
    (
      { x: pasteX, y: pasteY } = screenToFlowPosition({
        x: mousePosRef.current.x,
        y: mousePosRef.current.y
      })
    ) => {
      if (isEditingText()) return;
      if (!bufferedNodes.length) return;

      // anchor = top-left of copied selection
      const minX = Math.min(...bufferedNodes.map((n) => n.position.x));
      const minY = Math.min(...bufferedNodes.map((n) => n.position.y));

      const now = Date.now().toString();

      // clone nodes with new ids and shifted positions
      const newNodes: Node[] = bufferedNodes.map((node) => {
        const newId = `${node.id}-${now}`;
        const x = pasteX + (node.position.x - minX);
        const y = pasteY + (node.position.y - minY);

        return {
          ...node,
          id: newId,
          position: { x, y },
          selected: true
        };
      });

      // clone edges and rewire to new node ids
      const newEdges: Edge[] = bufferedEdges.map((edge) => {
        const newId = `${edge.id}-${now}`;
        const newSource = `${edge.source}-${now}`;
        const newTarget = `${edge.target}-${now}`;

        return {
          ...edge,
          id: newId,
          source: newSource,
          target: newTarget,
          selected: true
        };
      });

      // unselect old graph, then append new
      setNodes((nodes) => [
        ...nodes.map((n) => ({ ...n, selected: false })),
        ...newNodes
      ]);
      setEdges((edges) => [
        ...edges.map((e) => ({ ...e, selected: false })),
        ...newEdges
      ]);
    },
    [bufferedNodes, bufferedEdges, screenToFlowPosition, setNodes, setEdges]
  );

  // bind Cmd/Ctrl + X / C / V
  useShortcut(['Meta+x', 'Control+x'], cut);
  useShortcut(['Meta+c', 'Control+c'], copy);
  useShortcut(['Meta+v', 'Control+v'], paste);

  return { cut, copy, paste, bufferedNodes, bufferedEdges };
}

// run callback once per physical keydown combo.
// if focus is in an input/textarea/etc, we do nothing and let browser/native clipboard win.
// eslint-disable-next-line @typescript-eslint/ban-types
function useShortcut(keyCode: KeyCode, callback: Function): void {
  const [didRun, setDidRun] = useState(false);
  const pressed = useKeyPress(keyCode);

  useEffect(() => {
    if (pressed && !didRun) {
      if (!isEditingText()) {
        callback();
      }
      setDidRun(true);
    } else {
      setDidRun(pressed);
    }
  }, [pressed, didRun, callback]);
}

export default useCopyPaste;
