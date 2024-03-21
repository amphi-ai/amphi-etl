import {
  Notification
} from '@jupyterlab/apputils';
import {
  PipelineService, Node, Flow
} from './PipelineService';

export class CodeGenerator {

  static generateCode(pipelineJson: string, commands: any, componentService: any) {

    const code = this.generateCodeForNodes(PipelineService.filterPipeline(pipelineJson), componentService, 'none');
    return code;
  }

  static generateCodeUntil(pipelineJson: string, commands: any, componentService: any, targetNode: string) {

    // Only generate code up until target node
    const code = this.generateCodeForNodes(PipelineService.filterPipeline(pipelineJson), componentService, targetNode);
    return code;
  }

  static generateCodeForNodes = (flow: Flow, componentService: any, targetNode: string): string => {

    // Intialization
    let code: string = '';
    let functions: string = '';

    let counters = new Map<string, number>(); // Map with string as key and integer as value

    function incrementCounter(key: string) {
      const count = counters.get(key) || 0;
      counters.set(key, count + 1);
    }

    const nodesMap = new Map<string, Node>();
    // Add all nodes to the map structure, except annotations
    flow.nodes.forEach(node => {
      if (node.type !== 'annotation') {
        nodesMap.set(node.id, node);
      }
    });

    // Helper function to check if target is reachable from the current node
    const isTargetReachable = (currentNodeId, targetNodeId, flow) => {
      if (!targetNodeId || targetNodeId === 'none') return true; // Assume it's reachable to traverse all nodes

      let reachable = false;
      const explore = (nodeId) => {
        if (nodeId === targetNodeId) {
          reachable = true;
          return;
        }
        flow.edges.forEach(edge => {
          if (edge.source === nodeId && !reachable) {
            explore(edge.target);
          }
        });
      };
      explore(currentNodeId);
      return reachable;
    };

    const visited = new Set<string>();
    const nodeOutputs = new Map<string, string>();
    const uniqueImports = new Set<string>();

    // Traverse nodes
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId) || !isTargetReachable(nodeId, targetNode, flow)) {
        return;
      }

      visited.add(nodeId);

      const node = nodesMap.get(nodeId);
      if (!node) {
        console.error(`Node with id ${nodeId} not found.`);
        return;
      }

      // Initialize config
      let config: any = node.data as any;

      // Gather imports
      const imports = componentService.getComponent(node.type).provideImports({config});

      imports.forEach(importStatement => uniqueImports.add(importStatement));

      // Initiliaze input and output variables
      let inputName = '';
      let outputName = '';

      const component_type = componentService.getComponent(node.type)._type;
      const component_id = componentService.getComponent(node.type)._id;

      switch (component_type) {
        case 'pandas_df_processor':
          incrementCounter(component_id);
          inputName = nodeOutputs.get(PipelineService.findPreviousNodeId(flow, node.id));
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(node.id, outputName); // Map the source node to its output variable
          code += componentService.getComponent(node.type).generateComponentCode({ config, inputName, outputName });
          break;
        case 'pandas_df_input':
          incrementCounter(component_id);
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(node.id, outputName); // Map the source node to its output variable
          code += componentService.getComponent(node.type).generateComponentCode({ config, outputName });
          break;
        case 'pandas_df_output':
          incrementCounter(component_id);
          inputName = nodeOutputs.get(PipelineService.findPreviousNodeId(flow, node.id));
          code += componentService.getComponent(node.type).generateComponentCode({ config, inputName });
          break;
        default:
          console.error("Error generating code.");
      }

      // If target node....
      if (nodeId === targetNode) {
        code += '\n' + nodeOutputs.get(nodeId); // Call the last node that is run to output in console
        return; // Stop traversing further if we've reached the target node
      }

      // Recursivity
      flow.edges.forEach(edge => {
        if (edge.source === nodeId) {
          traverse(edge.target);
        }
      });
    };

    // Find the start node
    const startNodeId = PipelineService.findStartNode(flow);
    if (startNodeId) {
      traverse(startNodeId);
    } else {
      // Create an error notification with an action button
      Notification.error('Code cannot be generated because no input components have been found.', {
        autoClose: 8000
      });
    }

    // Keep unique imports        
    // Returns functions and logic code
    return `${Array.from(uniqueImports).join('\n')}\n\n${code}`;

  };
};
