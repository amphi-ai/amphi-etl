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

  static generateCodeForNodes = (flow: Flow, componentService: any, targetNodeId: string): string => {

    console.log("generateCodeForNodes initialization")
    // Intialization
    let code: string = '';
    let counters = new Map<string, number>(); // Map with string as key and integer as value
    const nodesMap = new Map<string, Node>();
    const nodeDependencies = new Map<string, string[]>(); // To keep track of node dependencies
    const sortedNodes: string[] = []; // To store the topologically sorted nodes
    const loggersMap = new Map<string, Node>();
    const nodeOutputs = new Map<string, string>();
    const uniqueImports = new Set<string>();
    const uniqueDependencies = new Set<string>();
    const functions = new Set<string>();

    // Helper function to increment counter
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

    console.log("nodesMap %o", nodesMap)

    // Topological sort with path tracking
    const visited = new Set<string>();
    const nodePaths = new Map<string, Set<string>>();

    const topologicalSortWithPathTracking = (node: string, path: Set<string>) => {
        if (visited.has(node)) {
            // Combine the current path with the existing path for the node
            const existingPath = nodePaths.get(node) || new Set();
            nodePaths.set(node, new Set([...existingPath, ...path]));
            return;
        }
        visited.add(node);

        const dependencies = flow.edges
            .filter(edge => edge.target === node)
            .map(edge => edge.source);

        nodeDependencies.set(node, dependencies);

        // Include the current node in the path for subsequent calls
        const currentPath = new Set([...path, node]);
        nodePaths.set(node, currentPath);

        dependencies.forEach(dependency => {
            topologicalSortWithPathTracking(dependency, currentPath);
        });

        sortedNodes.push(node);
    };

    // Perform topological sort with path tracking
    flow.nodes.forEach(node => {
        if (!visited.has(node.id)) {
            topologicalSortWithPathTracking(node.id, new Set());
        }
    });

    // Assume sortedNodes is already populated from the topological sort
    let nodesToTraverse = [];
    console.log("nodeDependencies %o", nodeDependencies)
    console.log("nodePaths %o", nodePaths)


    // After topological sorting and path tracking
    if (targetNodeId !== 'none') {
      let nodesToConsider = new Set<string>([targetNodeId]);
      let pathToTarget = new Set<string>();

      while (nodesToConsider.size > 0) {
          let nextNodesToConsider = new Set<string>();

          nodesToConsider.forEach(nodeId => {
              pathToTarget.add(nodeId);
              const dependencies = nodeDependencies.get(nodeId) || [];
              dependencies.forEach(dep => {
                  if (!pathToTarget.has(dep)) {
                      nextNodesToConsider.add(dep);
                  }
              });
          });

          nodesToConsider = nextNodesToConsider;
      }
      console.log("nodesToConsider %o", nodesToConsider)
      // Filter the sortedNodes to include only those in pathToTarget, preserving the topological order
      nodesToTraverse = sortedNodes.filter(nodeId => pathToTarget.has(nodeId));
      console.log("nodesToTravser %o", nodesToTraverse)
    } else {
      nodesToTraverse = sortedNodes;
      console.log("nodesToTravser %o", nodesToTraverse)
    }

    
    // nodesToTraverse.reverse();

    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
        if (!node) {
            console.error(`Node with id ${nodeId} not found.`);
            continue;
        }

      let config: any = node.data as any; // Initialize config
      const component = componentService.getComponent(node.type);
      const component_type = componentService.getComponent(node.type)._type;
      const component_id = componentService.getComponent(node.type)._id;

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

      switch (component_type) {
        case 'pandas_df_processor':
          incrementCounter(component_id);
          inputName = nodeOutputs.get(PipelineService.findPreviousNodeId(flow, nodeId));
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(nodeId, outputName); // Map the source node to its output variable
          code += componentService.getComponent(node.type).generateComponentCode({ config, inputName, outputName });
          break;
        case 'pandas_df_double_processor':
          const [input1Id, input2Id] = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
          incrementCounter(component_id);
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(node.id, outputName);
          const inputName1 = nodeOutputs.get(input1Id);
          const inputName2 = nodeOutputs.get(input2Id);
          code += componentService.getComponent(node.type).generateComponentCode({
            config,
            inputName1,
            inputName2,
            outputName
          });
          console.log("pandas_df_double_processor")
          break;
        case 'pandas_df_input':
          incrementCounter(component_id);
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(nodeId, outputName); // Map the source node to its output variable
          code += componentService.getComponent(node.type).generateComponentCode({ config, outputName });
          break;
        case 'pandas_df_output':
          incrementCounter(component_id);
          inputName = nodeOutputs.get(PipelineService.findPreviousNodeId(flow, nodeId));
          code += componentService.getComponent(node.type).generateComponentCode({ config, inputName });
          break;
        default:
          console.error("Error generating code.");
      }
      console.log("nodeId %o", nodeId)
      console.log("targetNodeId %o", targetNodeId)

      // If target node....
      if (nodeId === targetNodeId) {
        code += '\n' + nodeOutputs.get(nodeId);
        console.log(code) // Call the last node that is run to output in console
        // No need to continue after reaching the target node
      }
    }

    // Loggers when full pipeline execution
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
    // console.log("generated code %o", generatedCode)

    return generatedCode;

  };
};
