import {
  Notification
} from '@jupyterlab/apputils';
import {
  PipelineService, Node, Flow
} from './PipelineService';
import { RequestService } from './RequestService';
import { KernelMessage } from '@jupyterlab/services';

interface NodeObject {
  id: string;
  title: string;
  imports: string[];
  dependencies: string[];
  type: string;
  code: string;
  outputName: string;
  functions: string[];
  lastUpdated: number;
  lastExecuted: number;
  runtime: string;
}

export class CodeGeneratorDagster {

  static generateDagsterCode(pipelineJson: string, commands: any, componentService: any, variablesAutoNaming: boolean) {
    console.log("Inside generateDagsterCode method");
    try {
      const flow = PipelineService.filterPipeline(pipelineJson);
      const { nodesToTraverse, nodesMap, nodeDependencies } = this.computeNodesToTraverse(
        flow,
        'none',
        componentService
      ); 

      // Generate Dagster imports
      const dagsterImports = [
        'import dagster',
        'from dagster import op, job, Out, In, Nothing'
      ];
      
      // Generate environment variables and connections code
      const envVariablesCode = this.getEnvironmentVariableCode(pipelineJson, componentService);
      const connectionsCode = this.getConnectionCode(pipelineJson, componentService);
      
      // Generate ops for each node
      const opDefinitions: string[] = [];
      const uniqueImports = new Set<string>();
      const uniqueDependencies = new Set<string>();
      const uniqueFunctions = new Set<string>();
      
      // First pass: collect all imports, dependencies, and functions
      for (const nodeId of nodesToTraverse) {
        const node = nodesMap.get(nodeId);
        if (!node) continue;
        
        const config: any = node.data as any;
        const component = componentService.getComponent(node.type);
        const componentImports = component.provideImports({ config });
        componentImports.forEach(imp => uniqueImports.add(imp));
        
        if (typeof component.provideDependencies === 'function') {
          component.provideDependencies({ config }).forEach(dep => uniqueDependencies.add(dep));
        }
        
        if (typeof component.provideFunctions === 'function') {
          component.provideFunctions({ config }).forEach(func => uniqueFunctions.add(func));
        }
      }
      
      // Second pass: create ops for each node
      for (const nodeId of nodesToTraverse) {
        const node = nodesMap.get(nodeId);
        if (!node) continue;
        
        const config: any = node.data as any;
        const component = componentService.getComponent(node.type);
        const componentType = component._type;
        
        // Generate a meaningful op name based on component title or type
        let opName = this.generateReadableName(config.customTitle || node.type);
        
        // Determine inputs and outputs based on component type
        let opInputs: string[] = [];
        let opOutputs: string[] = [];
        let opCode: string = '';
        
        // Handle different component types
        switch (componentType) {
          case 'pandas_df_processor':
          case 'documents_processor':
          case 'ibis_df_processor':
          case 'pandas_df_to_documents_processor': {
            opInputs.push('input_data: pd.DataFrame');
            opOutputs.push('result: pd.DataFrame');
            
            const originalCode = component.generateComponentCode({ 
              config, 
              inputName: 'input_data', 
              outputName: 'result' 
            });
            
            opCode = originalCode;
            break;
          }
          
          case 'ibis_df_double_processor':
          case 'pandas_df_double_processor': {
            opInputs.push('input_data1: pd.DataFrame');
            opInputs.push('input_data2: pd.DataFrame');
            opOutputs.push('result: pd.DataFrame');
            
            const originalCode = component.generateComponentCode({
              config,
              inputName1: 'input_data1',
              inputName2: 'input_data2',
              outputName: 'result'
            });
            
            opCode = originalCode;
            break;
          }
          
          case 'ibis_df_multi_processor':
          case 'pandas_df_multi_processor': {
            const inputIds = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
            for (let i = 0; i < inputIds.length; i++) {
              opInputs.push(`input_data${i+1}: pd.DataFrame`);
            }
            opOutputs.push('result: pd.DataFrame');
            
            const inputNames = inputIds.map((_, i) => `input_data${i+1}`);
            const originalCode = component.generateComponentCode({
              config,
              inputNames,
              outputName: 'result'
            });
            
            opCode = originalCode;
            break;
          }
          
          case 'pandas_df_input':
          case 'documents_input':
          case 'ibis_df_input': {
            opOutputs.push('result: pd.DataFrame');
            
            const originalCode = component.generateComponentCode({
              config,
              outputName: 'result'
            });
            
            opCode = originalCode;
            break;
          }
          
          case 'ibis_df_output':
          case 'pandas_df_output':
          case 'documents_output': {
            opInputs.push('input_data: pd.DataFrame');
            
            const originalCode = component.generateComponentCode({
              config,
              inputName: 'input_data'
            });
            
            opCode = originalCode;
            break;
          }
          
          default:
            console.warn(`Unsupported component type: ${componentType} for Dagster export`);
            continue;
        }  

const opDef = `
@op
def ${opName}(${opInputs.join(', ')}):
    """ ${config.customTitle || node.type} """
    ${opCode.split('\n').join('\n    ')}
    ${opOutputs.length > 0 ? 'return result' : 'return'}
`;

opDefinitions.push(opDef);         

      }
      
      // Create the job definition that connects the ops
      const jobDefinition = this.generateDagsterJobDefinition(flow, nodesMap, nodeDependencies, nodesToTraverse);
      
      // Combine everything into the final Dagster code
      const currentDate = new Date();
      const dateString = currentDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const dateComment = `# Source code generated by Amphi for Dagster\n# Date: ${dateString}\n`; 
      const additionalDependencies = `# Additional dependencies: dagster, ${Array.from(uniqueDependencies).join(', ')}\n`;
      
      const dagsterCode = [
        dateComment,
        additionalDependencies,
        ...dagsterImports.join('\n'),
        '\n',
        ...Array.from(uniqueImports).join('\n'),
        '\n',
       envVariablesCode.concat('\n'), 
        connectionsCode,
        ...Array.from(uniqueFunctions),
        ...opDefinitions,
        jobDefinition
      ].filter(Boolean).join('');
      
      return this.formatVariables(dagsterCode);
    } catch (error) {
      throw new Error(`Error generating Dagster code: ${error}`);
    }
  }
  
  // Helper method to generate readable names from component titles/types
  static generateReadableName(rawName: string): string { 
    // First, handle special cases and convert to camelCase
    const camelCaseName = rawName
        .split(/(?=[A-Z])/)  // Split on capital letters
        .map((word, index) => 
            index === 0 
                ? word.toLowerCase() 
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');

    return camelCaseName + 'Op';
  }

  static generateDagsterJobDefinition(
    flow: Flow, 
    nodesMap: Map<string, Node>, 
    nodeDependencies: Map<string, string[]>,
    nodesToTraverse: string[]
  ): string {
    // Map of node IDs to their op names
    const nodeToOpMap = new Map<string, string>();
    const processedNodes = new Set<string>();
    const resultMap = new Map<string, string>();
    
    // First, generate op names for all nodes
    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) continue;
      
      const config: any = node.data as any;
      const opName = this.generateReadableName(config.customTitle || node.type);
      nodeToOpMap.set(nodeId, opName);
      
      // Create result variable name
      const resultVarName = opName.replace('Op', 'Result');
      resultMap.set(nodeId, resultVarName);
    }
    
    // Build the job definition
    let jobCode = '\n\n@job\ndef dagster_pipeline():\n';
    
    // Create a dependency graph from edges
    const dependencyGraph = new Map<string, string[]>();
    for (const edge of flow.edges) {
      if (!nodeToOpMap.has(edge.source) || !nodeToOpMap.has(edge.target)) {
        continue;
      }
      
      if (!dependencyGraph.has(edge.target)) {
        dependencyGraph.set(edge.target, []);
      }
      dependencyGraph.get(edge.target)!.push(edge.source);
    }
    
    // Find nodes with no inputs (starting nodes)
    const startingNodes = nodesToTraverse.filter(nodeId => 
      !dependencyGraph.has(nodeId) || dependencyGraph.get(nodeId)!.length === 0
    );
    
    // Process starting nodes first
    for (const nodeId of startingNodes) {
      const opName = nodeToOpMap.get(nodeId);
      if (!opName) continue;
      
      const resultVarName = resultMap.get(nodeId)!;
      jobCode += `    ${resultVarName} = ${opName}()\n`;
      processedNodes.add(nodeId);
    }
    
    // Process the rest of the nodes in topological order
    for (const nodeId of nodesToTraverse) {
      if (processedNodes.has(nodeId)) continue;
      
      const opName = nodeToOpMap.get(nodeId);
      if (!opName) continue;
      
      const resultVarName = resultMap.get(nodeId)!;
      const deps = dependencyGraph.get(nodeId) || [];
      
      if (deps.length === 0) {
        // No dependencies (shouldn't happen if we processed starting nodes correctly)
        jobCode += `    ${resultVarName} = ${opName}()\n`;
      } else if (deps.length === 1) {
        // Single dependency
        const sourceName = resultMap.get(deps[0])!;
        jobCode += `    ${resultVarName} = ${opName}(${sourceName})\n`;
      } else {
        // Multiple dependencies - pass them in order
        const sourceParams = deps.map(dep => resultMap.get(dep)!).join(', ');
        jobCode += `    ${resultVarName} = ${opName}(${sourceParams})\n`;
      }
      
      processedNodes.add(nodeId);
    }
    
    return jobCode;
  }

  static generateCodeForNodes = (
    flow: Flow,
    componentService: any,
    targetNodeId: string,
    fromStart: boolean,
    variablesAutoNaming: boolean
  ): { codeList: string[]; incrementalCodeList: { code: string; nodeId: string }[], executedNodes: Set<string> } => {
    // Initialization
    const codeList: string[] = [];
    const incrementalCodeList: { code: string; nodeId: string }[] = [];
    const executedNodes = new Set<string>();
    const uniqueImports = new Set<string>();
    const uniqueDependencies = new Set<string>();
    const functions = new Set<string>();
    const envVariablesMap = new Map<string, Node>();
    const connectionsMap = new Map<string, Node>();

    // Get nodes to traverse and related data
    const { nodesToTraverse, nodesMap } = this.computeNodesToTraverse(
      flow,
      targetNodeId,
      componentService
    );

    // Categorize special nodes
    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (type === 'env_variables' || type === 'env_file') {
        envVariablesMap.set(node.id, node);
      } else if (type === 'connection') {
        connectionsMap.set(node.id, node);
      }
    });

    // Create node objects
    try {
      const nodeObjects = this.createNodeObjects(flow, componentService, nodesToTraverse, nodesMap, variablesAutoNaming);

      // Process node objects
      for (const nodeObject of nodeObjects) {
        // Add imports, dependencies, and functions
        nodeObject.imports.forEach(importStatement => uniqueImports.add(importStatement));
        nodeObject.dependencies.forEach(dep => uniqueDependencies.add(dep));
        nodeObject.functions.forEach(func => functions.add(func));

        // Combine the code, imports, dependencies, and functions for the incremental code list
        const nodeCode = [
          ...nodeObject.imports,
          ...nodeObject.functions,
          nodeObject.code
        ].join('\n');

        incrementalCodeList.push({ code: nodeCode, nodeId: nodeObject.id });

        // Add code to codeList
        codeList.push(nodeObject.code);
        executedNodes.add(nodeObject.id);

        // Handle target node
        if (nodeObject.id === targetNodeId) {
          let displayCode = '';
          if (nodeObject.type.includes('processor') || nodeObject.type.includes('input')) {
            if (nodeObject.type.includes('documents')) {
              if (!fromStart) {
                console.log(`Generate code from last component. (fromStart: false)`);
                codeList.length = 0;
                codeList.push(nodeObject.code);
                executedNodes.clear();
                executedNodes.add(nodeObject.id);
              }
              displayCode = `\n_amphi_display_documents_as_html(${nodeObject.outputName})`;
            } else {
              if (!fromStart) {
                console.log(`Generate code from last component. (fromStart: false)`);
                codeList.length = 0;
                codeList.push(nodeObject.code);
                executedNodes.clear();
                executedNodes.add(nodeObject.id);
              }
              displayCode = `\n__amphi_display_dataframe(${nodeObject.outputName}, dfName="${nodeObject.outputName}", nodeId="${targetNodeId}"${nodeObject.runtime !== "local" ? `, runtime="${nodeObject.runtime}"` : ''})`;
            }

            // Append display code to both codeList and the last element of incrementalCodeList
            codeList.push(displayCode);
            if (incrementalCodeList.length > 0) {
              incrementalCodeList[incrementalCodeList.length - 1].code += displayCode;
            }
          } else if (nodeObject.type.includes('output')) {
            // Add try block and indent existing code
            // Combine all the code from codeList into one string
            const combinedCode = codeList.join('\n');

            // Indent the combined code
            const indentedCode = combinedCode.split('\n').map(line => '    ' + line).join('\n');

            // Clear the existing codeList to replace with the new structure
            codeList.length = 0;

            // Wrap the indented code with try-except block and append it to codeList
            codeList.push('try:\n' + indentedCode);
            codeList.push('    print("Execution has been successful")\n');
            codeList.push('except Exception as e:\n');
            codeList.push('    print(f"Execution failed with error {e}")\n');
            codeList.push('    raise\n');
          }
        }
      }

      // Generate code for special nodes
      let envVariablesCode = '';
      envVariablesMap.forEach((node) => {
        const component = componentService.getComponent(node.type);
        const config: any = node.data as any;
        envVariablesCode += component.generateComponentCode({ config });
        component.provideImports({ config }).forEach(importStatement => uniqueImports.add(importStatement));
      });

      let connectionsCode = '';
      connectionsMap.forEach((node) => {
        const component = componentService.getComponent(node.type);
        const config: any = node.data as any;
        connectionsCode += component.generateComponentCode({ config });
        component.provideImports({ config }).forEach(importStatement => uniqueImports.add(importStatement));
      });

      // Prepare final code list
      const currentDate = new Date();
      const dateString = currentDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const dateComment = `# Source code generated by Amphi\n# Date: ${dateString}`; 
      const additionalImports = `# Additional dependencies: ${Array.from(uniqueDependencies).join(', ')}`;

      const generatedCodeList = [
        dateComment,
        additionalImports,
        ...Array.from(uniqueImports),
        envVariablesCode,
        connectionsCode,
        ...Array.from(functions),
        ...codeList
      ].filter(Boolean); // Remove empty strings

      // Format variables in the generated code
      const formattedCodeList = generatedCodeList.map(code => this.formatVariables(code));

      return { codeList: formattedCodeList, incrementalCodeList, executedNodes };
    } catch (error) {
      throw new Error(`Error in createNodeObjects: ${error}`);
    }

  };

  static createNodeObjects = (
    flow: Flow,
    componentService: any,
    nodesToTraverse: string[],
    nodesMap: Map<string, Node>,
    variablesAutoNaming: boolean
  ): NodeObject[] => {
    const nodeObjects: NodeObject[] = [];
    const counters = new Map<string, number>();
    const nodeOutputs = new Map<string, string>();

    function incrementCounter(key: string) {
      const count = counters.get(key) || 0;
      counters.set(key, count + 1);
      return count + 1;
    }

    // Helper function to validate input names
    function getInputName(nodeId: string, context: string): string {
      const name = nodeOutputs.get(nodeId);
      if (!name) {
        throw new Error(`Input name is undefined for node ${nodeId} in context: ${context}`);
      }
      return name;
    }

    function getOutputName(node: Node, componentId: string, variablesAutoNaming: boolean): string {
      let name = '';
      if (variablesAutoNaming) {
        name = `${node.type}${incrementCounter(componentId)}`
      } else {
        name = `${node.data.nameId}`
      }

      return name;
    }

    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) {
        console.error(`Node with id ${nodeId} not found.`);
        continue;
      }

      const config: any = node.data as any;
      const component = componentService.getComponent(node.type);
      const componentType = component._type;
      const componentId = component._id;

      const imports = component.provideImports({ config });
      const dependencies = typeof component.provideDependencies === 'function'
        ? component.provideDependencies({ config })
        : [];
      const functions = typeof component.provideFunctions === 'function'
        ? component.provideFunctions({ config })
        : [];

      let inputName = '';
      let outputName = '';
      let code = '';
      if (config.customTitle) {
        const generatedCode = component.generateComponentCode({ config });
        const needsNewLine = !generatedCode.startsWith('\n');
        code += `\n# ${config.customTitle}${needsNewLine ? '\n' : ''}`;
      }

      try {
        switch (componentType) {
          case 'pandas_df_processor':
          case 'pandas_df_to_documents_processor':
          case 'ibis_df_processor':
          case 'documents_processor': {
            const previousNodeId = PipelineService.findPreviousNodeId(flow, nodeId);
            inputName = getInputName(previousNodeId, componentType);
            outputName = getOutputName(node, componentId, variablesAutoNaming)
            nodeOutputs.set(nodeId, outputName);
            code += component.generateComponentCode({ config, inputName, outputName });
            break;
          }
          case 'ibis_df_double_processor':
          case 'pandas_df_double_processor': {
            const [input1Id, input2Id] = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
            const inputName1 = getInputName(input1Id, componentType);
            const inputName2 = getInputName(input2Id, componentType);
            outputName = getOutputName(node, componentId, variablesAutoNaming)
            nodeOutputs.set(nodeId, outputName);
            code += component.generateComponentCode({ config, inputName1, inputName2, outputName });
            break;
          }
          case 'ibis_df_multi_processor':
          case 'pandas_df_multi_processor': {
            const inputIds = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
            const inputNames = inputIds.map(id => getInputName(id, componentType));
            outputName = getOutputName(node, componentId, variablesAutoNaming)
            nodeOutputs.set(nodeId, outputName);
            code += component.generateComponentCode({ config, inputNames, outputName });
            break;
          }
          case 'pandas_df_input':
          case 'documents_input': {
            outputName = getOutputName(node, componentId, variablesAutoNaming)
            nodeOutputs.set(nodeId, outputName);
            code += component.generateComponentCode({ config, outputName });
            break;
          }
          case 'ibis_df_input': {
            outputName = getOutputName(node, componentId, variablesAutoNaming)
            nodeOutputs.set(nodeId, outputName);

            // Find the nodes that follow this input node
            const nextNodeIds = PipelineService.findNextNodeIds(flow, nodeId);
            let uniqueEngineName: string | undefined = undefined;

            for (const nextNodeId of nextNodeIds) {
              const nextNode = nodesMap.get(nextNodeId);
              if (nextNode) {
                const nextComponent = componentService.getComponent(nextNode.type);
                const nextComponentType = nextComponent._type;
                if (nextComponentType === 'ibis_df_double_processor') {
                  // Get previous nodes connected to the join node
                  const previousNodeIds = PipelineService.findMultiplePreviousNodeIds(flow, nextNodeId);
                  if (previousNodeIds.length > 1) {
                    // Find the other input node ID (excluding current node)
                    const otherNodeId = previousNodeIds.find(id => id !== nodeId);
                    if (otherNodeId && nodeOutputs.has(otherNodeId)) {
                      const otherOutputName = getInputName(otherNodeId, 'ibis_df_double_processor');
                      uniqueEngineName = `${otherOutputName}_backend`;
                      break; // Stop after finding the first matching join node
                    }
                  }
                }
              }
            }

            // Generate code with or without uniqueEngineName
            if (uniqueEngineName) {
              code += component.generateComponentCode({ config, outputName, uniqueEngineName });
            } else {
              code += component.generateComponentCode({ config, outputName });
            }
            break;
          }
          case 'ibis_df_output':
          case 'pandas_df_output':
          case 'documents_output': {
            const previousNodeId = PipelineService.findPreviousNodeId(flow, nodeId);
            inputName = getInputName(previousNodeId, componentType);
            code += component.generateComponentCode({ config, inputName });
            break;
          }
          default:
            throw new Error(`Pipeline Configuration Error: ${componentType} for node ${nodeId}`);
        }

        nodeObjects.push({
          id: nodeId,
          title: config.customTitle || node.type,
          imports,
          dependencies,
          type: componentType,
          code,
          outputName,
          functions,
          lastUpdated: config.lastUpdated || 0,
          lastExecuted: config.lastExecuted || 0,
          runtime: config.backend?.engine || "local"
        });

      } catch (error) {
        console.error(`Error processing node ${nodeId}:`, error);
        throw error; // Stop and throw error...
      }
    }

    return nodeObjects;
  };

  static generateCode(pipelineJson: string, commands: any, componentService: any, variablesAutoNaming: boolean) {

    try {
      const { codeList, incrementalCodeList, executedNodes } = this.generateCodeForNodes(
        PipelineService.filterPipeline(pipelineJson),
        componentService,
        'none',
        true,
        variablesAutoNaming
      );
      const code = codeList.join('\n');

      return code;
    } catch (error) {
      throw new Error(`Error in generateCodeForNodes: ${error}`);
    }

  }

  static generateCodeUntil(
    pipelineJson: string,
    commands: any,
    componentService: any,
    targetNode: string,
    incremental: boolean,
    variablesAutoNaming: boolean
  ): any[] {
    const flow = PipelineService.filterPipeline(pipelineJson);

    // Check if any node is missing the 'name' attribute which means legacy pipeline
    if (flow.nodes.some((node) => !node.data.nameId)) {
      variablesAutoNaming = true;
    }

    // Get nodes to traverse and related data
    const { nodesToTraverse, nodesMap } = this.computeNodesToTraverse(
      flow,
      targetNode,
      componentService
    );

    // Initialize fromStart to false
    let fromStart = false;
    let maxLastUpdated = 0;

    // For each node in nodesToTraverse except the target node
    for (const nodeId of nodesToTraverse) {
      if (nodeId === targetNode) {
        continue; // Skip target node
      }
      const node = nodesMap.get(nodeId);
      if (!node) {
        console.error(`Node with id ${nodeId} not found.`);
        continue;
      }

      const data = node.data || {};
      const lastUpdated = data.lastUpdated || 0;
      const lastExecuted = data.lastExecuted || 0;

      if (lastUpdated > maxLastUpdated) {
        maxLastUpdated = lastUpdated;
      }

      if (lastUpdated >= lastExecuted) {
        fromStart = true;
        // console.log(`Node ${nodeId} has been updated since last execution.`);
        break; // No need to check further
      }
    }

    // Transition
    if (variablesAutoNaming) {
      fromStart = true;
    }

    // Generate code and collect executed node IDs
    try {
      // Generate code and collect executed node IDs
      const { codeList, incrementalCodeList, executedNodes } = this.generateCodeForNodes(
        flow,
        componentService,
        targetNode,
        fromStart,
        variablesAutoNaming
      );

      if (fromStart) {
        console.log(
          "Generating code from start due to updates in previous nodes. (fromStart: true)"
        );
        const command = 'pipeline-metadata-panel:delete-all';
        commands.execute(command, {}).catch((reason) => {
          console.error(
            `An error occurred during the execution of ${command}.\n${reason}`
          );
        });
      } else {
        console.log(
          "No updates in previous nodes. Generating code for target node only."
        );
      }

      // After execution, update lastExecuted for all executed nodes
      const currentTimestamp = Date.now();
      executedNodes.forEach((nodeId) => {
        const node = nodesMap.get(nodeId);
        if (node && node.data) {
          node.data.lastExecuted = currentTimestamp;
        }
      });

      // Also update lastExecuted for the target node
      const targetNodeData = nodesMap.get(targetNode)?.data;
      if (targetNodeData) {
        targetNodeData.lastExecuted = currentTimestamp;
      }

      if (incremental) {
        return incrementalCodeList;
      } else {
        return codeList;
      }
    } catch (error) {
      throw new Error(`Error in generateCodeForNodes: ${error}`);
    }

  }

  // External function to compute nodes to traverse and related data
  static computeNodesToTraverse(flow: Flow, targetNodeId: string, componentService: any): {
    nodesToTraverse: string[],
    nodesMap: Map<string, Node>,
    nodeDependencies: Map<string, string[]>,
    sortedNodes: string[]
  } {
    const nodesMap = new Map<string, Node>();
    const nodeDependencies = new Map<string, string[]>(); // To keep track of node dependencies
    const sortedNodes: string[] = []; // To store the topologically sorted nodes

    // Add all pipeline nodes to nodesMap, except annotations and specific types
    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (
        type !== 'annotation' &&
        type !== 'logger' &&
        type !== 'env_variables' &&
        type !== 'env_file' &&
        type !== 'connection'
      ) {
        nodesMap.set(node.id, node);
      }
    });

    // Topological sort with path tracking
    const visited = new Set<string>();
    const nodePaths = new Map<string, Set<string>>();

    const topologicalSortWithPathTracking = (nodeId: string, path: Set<string>) => {
      if (visited.has(nodeId)) {
        // Combine the current path with the existing path for the node
        const existingPath = nodePaths.get(nodeId) || new Set();
        nodePaths.set(nodeId, new Set([...existingPath, ...path]));
        return;
      }
      visited.add(nodeId);

      const dependencies = flow.edges
        .filter(edge => edge.target === nodeId)
        .map(edge => edge.source);

      nodeDependencies.set(nodeId, dependencies);

      // Include the current node in the path for subsequent calls
      const currentPath = new Set([...path, nodeId]);
      nodePaths.set(nodeId, currentPath);

      dependencies.forEach(dependency => {
        topologicalSortWithPathTracking(dependency, currentPath);
      });

      sortedNodes.push(nodeId);
    };

    // Perform topological sort with path tracking
    flow.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        topologicalSortWithPathTracking(node.id, new Set());
      }
    });

    // Determine nodes to traverse based on the targetNodeId
    let nodesToTraverse: string[] = [];
    if (targetNodeId !== 'none') {
      const nodesToConsider = new Set<string>([targetNodeId]);
      const pathToTarget = new Set<string>();

      while (nodesToConsider.size > 0) {
        const nextNodesToConsider = new Set<string>();

        nodesToConsider.forEach(nodeId => {
          pathToTarget.add(nodeId);
          const dependencies = nodeDependencies.get(nodeId) || [];
          dependencies.forEach(dep => {
            if (!pathToTarget.has(dep)) {
              nextNodesToConsider.add(dep);
            }
          });
        });

        nodesToConsider.clear();
        nextNodesToConsider.forEach(nodeId => nodesToConsider.add(nodeId));
      }

      // Filter the sortedNodes to include only those in pathToTarget, preserving the topological order
      nodesToTraverse = sortedNodes.filter(nodeId => pathToTarget.has(nodeId));
    } else {
      nodesToTraverse = sortedNodes;
    }

    return { nodesToTraverse, nodesMap, nodeDependencies, sortedNodes };
  }

  static formatVariables(code: string): string {
    const lines = code.split('\n');
    const transformedLines = lines.map(line => {
      if (/r(['"]).*\1/.test(line) || /f(['"])/.test(line) || /f("""|''')/.test(line)) {
        return line; // Return the line as-is if it's an actual raw string or an f-string
      }
      return line
        .replace(/(['"])\{(\w+)\}\1/g, '$2')  // Remove quotes for standalone variables
        .replace(/(['"])(.*\{.*\}.*)\1/g, 'f$1$2$1')  // Convert to f-string for multiple variables
        .replace(/(f?"""\s*)(.*\{.*\}.*)(\s*""")/g, 'f"""$2"""');  // Convert triple quotes to f-strings, avoid double f
    });
    return transformedLines.join('\n');
  }
  

  static getEnvironmentVariableCode(pipelineJson: string, componentService: any): string {
    const flow = PipelineService.filterPipeline(pipelineJson);
    const envVariablesMap = new Map<string, Node>();
    const uniqueImports = new Set<string>();

    // Collect environment variable nodes
    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (type === 'env_variables' || type === 'env_file') {
        envVariablesMap.set(node.id, node);
      }
    });

    let envVariablesCode = '';

    if (envVariablesMap.size > 0) {
      envVariablesMap.forEach((node, nodeId) => {
        const component = componentService.getComponent(node.type);
        let config: any = node.data;

        // Gather imports
        const imports = component.provideImports({ config });
        imports.forEach(importStatement => uniqueImports.add(importStatement));

        // Generate code for this environment variable component
        envVariablesCode += component.generateComponentCode({ config });
      });

      // Combine imports and environment variables code
      const importsCode = Array.from(uniqueImports).join('\n');
      return `${importsCode}\n\n${envVariablesCode}`;
    } else {
      return '# No environment variable components found.';
    }
  }

  static getConnectionCode(pipelineJson: string, componentService: any): string {
    const flow = PipelineService.filterPipeline(pipelineJson);
    const connectionsMap = new Map<string, Node>();
    const uniqueImports = new Set<string>();

    // Collect connection nodes
    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (type === 'connection') {
        connectionsMap.set(node.id, node);
      }
    });

    let connectionsCode = '';

    if (connectionsMap.size > 0) {
      connectionsMap.forEach((node, nodeId) => {
        const component = componentService.getComponent(node.type);
        let config: any = node.data;

        // Gather imports
        const imports = component.provideImports({ config });
        imports.forEach(importStatement => uniqueImports.add(importStatement));

        // Generate code for this connection component
        connectionsCode += component.generateComponentCode({ config });
      });

      // Combine imports and connections code
      const importsCode = Array.from(uniqueImports).join('\n');
      return `${importsCode}\n\n${connectionsCode}`;
    } else {
      return '# No connection components found.';
    }
  }

  static getComponentAndDataForNode(
    nodeId: string,
    componentService: any,
    pipelineJson: string
  ): { component: any; data: any } | null {
    const flow = PipelineService.filterPipeline(pipelineJson);

    // Find the node by nodeId
    const node = flow.nodes.find((n: Node) => n.id === nodeId);
    if (!node) {
      console.error(`Node with id ${nodeId} not found.`);
      return null;
    }

    // Get the component type and the component instance
    const component = componentService.getComponent(node.type);
    if (!component) {
      console.error(`Component for node type ${node.type} not found.`);
      return null;
    }

    // Return the component and the node's data
    return { component, data: node.data };
  }

};