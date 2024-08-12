import React, { useEffect, useCallback } from 'react';
import {
    type Node,
    type Edge,
    useReactFlow,
    useNodesInitialized,
    useStore,
    Position,
    ControlButton
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import { alignIcon } from './icons';

type Direction = 'TB' | 'LR' | 'RL' | 'BT';

// Algorithm index.ts
type LayoutAlgorithmOptions = {
    direction: Direction;
    spacing: [number, number];
};

type LayoutAlgorithm = (
    nodes: Node[],
    edges: Edge[],
    options: LayoutAlgorithmOptions
) => Promise<{ nodes: Node[]; edges: Edge[] }>;

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const dagreLayout: LayoutAlgorithm = async (nodes, edges, options) => {
    dagreGraph.setGraph({
        rankdir: options.direction,
        nodesep: options.spacing[0],
        ranksep: options.spacing[1],
    });

    for (const node of nodes) {
        dagreGraph.setNode(node.id, {
            width: node.width ?? 0,
            height: node.height ?? 0,
        });
    }

    for (const edge of edges) {
        dagreGraph.setEdge(edge.source, edge.target);
    }

    dagre.layout(dagreGraph);

    const nextNodes = nodes.map((node) => {
        const { x, y } = dagreGraph.node(node.id);
        const position = {
            x: x - (node.width ?? 0) / 2,
            // y: y - (node.height ?? 0) / 2, // align vertically (middle)
            y: y
        };

        return { ...node, position };
    });

    return { nodes: nextNodes, edges };
};

const layoutAlgorithms = {
    dagre: dagreLayout
};

export { layoutAlgorithms };

export type LayoutOptions = {
    algorithm: keyof typeof layoutAlgorithms;
} & LayoutAlgorithmOptions;

function useAutoLayout(options: LayoutOptions) {
    const { fitView, setViewport, setNodes, setEdges } = useReactFlow();
    const nodesInitialized = useNodesInitialized();
    const elements = useStore(
        (state) => ({
            nodeMap: state.nodeInternals,
            edgeMap: state.edges.reduce(
                (acc, edge) => acc.set(edge.id, edge),
                new Map()
            ),
        }),
        compareElements
    );

    const runLayout = useCallback(async () => {
        if (!nodesInitialized || elements.nodeMap.size === 0) {
            return;
        }

        const layoutAlgorithm = layoutAlgorithms[options.algorithm];
        const nodes = [...elements.nodeMap.values()];
        const edges = [...elements.edgeMap.values()];

        const { nodes: nextNodes, edges: nextEdges } = await layoutAlgorithm(
            nodes,
            edges,
            options
        );

        for (const node of nextNodes) {
            node.style = { ...node.style, opacity: 1 };
            node.sourcePosition = getSourceHandlePosition(options.direction);
            node.targetPosition = getTargetHandlePosition(options.direction);
        }

        for (const edge of edges) {
            edge.style = { ...edge.style, opacity: 1 };
        }

        setNodes(nextNodes);
        setEdges(nextEdges);
        setViewport({ x: 0, y: 0, zoom: 1 });
        setTimeout(() => {
            fitView({ padding: 0.4 });
        }, 1);
    }, [nodesInitialized, elements, options, setNodes, setEdges]);

    return runLayout;
}

type Elements = {
    nodeMap: Map<string, Node>;
    edgeMap: Map<string, Edge>;
};

function compareElements(xs: Elements, ys: Elements) {
    return (
        compareNodes(xs.nodeMap, ys.nodeMap) && compareEdges(xs.edgeMap, ys.edgeMap)
    );
}

function compareNodes(xs: Map<string, Node>, ys: Map<string, Node>) {
    if (xs.size !== ys.size) return false;

    for (const [id, x] of xs.entries()) {
        const y = ys.get(id);

        if (!y) return false;
        if (x.resizing || x.dragging) return true;
        if (x.width !== y.width || x.height !== y.height) return false;
    }

    return true;
}

function compareEdges(xs: Map<string, Edge>, ys: Map<string, Edge>) {
    if (xs.size !== ys.size) return false;

    for (const [id, x] of xs.entries()) {
        const y = ys.get(id);

        if (!y) return false;
        if (x.source !== y.source || x.target !== y.target) return false;
        if (x?.sourceHandle !== y?.sourceHandle) return false;
        if (x?.targetHandle !== y?.targetHandle) return false;
    }

    return true;
}

export function getSourceHandlePosition(direction: Direction) {
    switch (direction) {
        case 'TB':
            return Position.Bottom;
        case 'BT':
            return Position.Top;
        case 'LR':
            return Position.Right;
        case 'RL':
            return Position.Left;
    }
}

export function getTargetHandlePosition(direction: Direction) {
    switch (direction) {
        case 'TB':
            return Position.Top;
        case 'BT':
            return Position.Bottom;
        case 'LR':
            return Position.Left;
        case 'RL':
            return Position.Right;
    }
}

export function getId() {
    return `${Date.now()}`;
}

function AutoLayoutButton() {
    const options: LayoutOptions = {
        algorithm: 'dagre',
        direction: 'LR',
        spacing: [100, 100],
    };
    const runLayout = useAutoLayout(options);

    const onClick = () => {
        runLayout();
    };

    return <ControlButton onClick={onClick}>
        <alignIcon.react />
    </ControlButton>;
}

export default AutoLayoutButton;
