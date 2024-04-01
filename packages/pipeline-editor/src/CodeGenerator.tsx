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
    let counters = new Map<string, number>(); // Map with string as key and integer as value
    const nodesMap = new Map<string, Node>();
    const loggersMap = new Map<string, Node>();
    const visited = new Set<string>();
    const nodeOutputs = new Map<string, string>();
    const uniqueImports = new Set<string>();
    const uniqueDependencies = new Set<string>();
    const functions = new Set<string>();


    function incrementCounter(key: string) {
      const count = counters.get(key) || 0;
      counters.set(key, count + 1);
    }

    // Add all pipeline nodes to nodeMap, except annotations and loggers
    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (type !== 'annotation') {
        if (type === 'logger') {
          loggersMap.set(node.id, node);
        } else {
          nodesMap.set(node.id, node);
        }
      }
    });

    console.log("loggers %o", loggersMap);
    console.log("NODES %o", nodesMap);

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

    // Main recursive function -> traverse nodes
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

      let config: any = node.data as any; // Initialize config
      const component = componentService.getComponent(node.type);

      // Only gather additionnal dependencies if the function exists
      if (typeof component?.provideDependencies === 'function') {
        const deps = component.provideDependencies({config}); 
        deps.forEach(dep => uniqueDependencies.add(dep));
      }
      
      const imports = component.provideImports({config}); // Gather imports
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

    // Loggers
    if (loggersMap.size > 0) {

      let loggerCode = '';
  
      loggersMap.forEach((node, nodeId) => {
        // Process each logger
        console.log(`Processing logger with id: ${nodeId}`);
        const component = componentService.getComponent(node.type);

        let config: any = node.data as any; // Initialize config
        // Only gather additionnal dependencies if the function exists
        if (typeof component?.provideDependencies === 'function') {
          const deps = component.provideDependencies({config}); 
          deps.forEach(dep => uniqueDependencies.add(dep));
        }

        if (typeof component?.provideFunctions === 'function') {
          component.provideFunctions({config}).forEach(func => functions.add(func));
        }
        
        const imports = component.provideImports({config}); // Gather imports
        imports.forEach(importStatement => uniqueImports.add(importStatement));

        loggerCode += componentService.getComponent(node.type).generateComponentCode({ config });

      });

  // Indentation for the Python code block
  const indent = '    ';
  loggerCode = loggerCode.split('\n').map(line => indent + line).join('\n');
  code = code.split('\n').map(line => indent + line).join('\n');

  code = `
try:
${code}
except Exception as e:
    print(f"An error occurred: {e}")
${loggerCode}
`;

    } else {
      console.log('No loggers found.');
    }

    const currentDate = new Date();
    const dateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;
    const dateComment = `# Source code generated by Amphi\n# Date: ${dateString}`;
    const additionalImports = `# Additional dependencies: ${Array.from(uniqueDependencies).join(', ')}`;
    const generatedCode = `${dateComment}\n${additionalImports}\n${Array.from(uniqueImports).join('\n')}\n${Array.from(functions).join('\n\n')}\n${code}`;

    return generatedCode;

  };
};
