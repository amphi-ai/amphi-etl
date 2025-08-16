// ================================================
// BaseCodeGenerator.ts
// ================================================

import {
  PipelineService, Node, Flow
} from './PipelineService';

export interface NodeObject {
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

export abstract class BaseCodeGenerator {
  // Common or shared methods go here

  static computeNodesToTraverse(
    flow: Flow,
    targetNodeId: string,
    componentService: any
  ): {
    nodesToTraverse: string[];
    nodesMap: Map<string, Node>;
    nodeDependencies: Map<string, string[]>;
    sortedNodes: string[];
  } {
    const nodesMap = new Map<string, Node>();
    const nodeDependencies = new Map<string, string[]>();
    const sortedNodes: string[] = [];

    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (!['annotation', 'logger', 'env_variables', 'env_file', 'connection'].includes(type)) {
        nodesMap.set(node.id, node);
      }
    });

    const visited = new Set<string>();
    const nodePaths = new Map<string, Set<string>>();

    const topologicalSortWithPathTracking = (nodeId: string, path: Set<string>) => {
      if (visited.has(nodeId)) {
        const existingPath = nodePaths.get(nodeId) || new Set();
        nodePaths.set(nodeId, new Set([...existingPath, ...path]));
        return;
      }
      visited.add(nodeId);

      const dependencies = flow.edges
        .filter(edge => edge.target === nodeId)
        .map(edge => edge.source);

      nodeDependencies.set(nodeId, dependencies);

      const currentPath = new Set([...path, nodeId]);
      nodePaths.set(nodeId, currentPath);

      dependencies.forEach(dep => {
        topologicalSortWithPathTracking(dep, currentPath);
      });

      sortedNodes.push(nodeId);
    };

    flow.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        topologicalSortWithPathTracking(node.id, new Set());
      }
    });

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
      nodesToTraverse = sortedNodes.filter(nodeId => pathToTarget.has(nodeId));
    } else {
      nodesToTraverse = sortedNodes;
    }

    return { nodesToTraverse, nodesMap, nodeDependencies, sortedNodes };
  }

  static createNodeObjects(
    flow: Flow,
    componentService: any,
    nodesToTraverse: string[],
    nodesMap: Map<string, Node>,
    variablesAutoNaming: boolean
  ): NodeObject[] {
    const nodeObjects: NodeObject[] = [];
    const counters = new Map<string, number>();
    const nodeOutputs = new Map<string, string>();

    function incrementCounter(key: string) {
      const count = counters.get(key) || 0;
      counters.set(key, count + 1);
      return count + 1;
    }

    function getInputName(nodeId: string, context: string): string {
      const name = nodeOutputs.get(nodeId);
      if (!name) {
        throw new Error(`Input name is undefined for node ${nodeId} in context: ${context}`);
      }
      return name;
    }

    function getOutputName(node: Node, componentId: string, autoNaming: boolean): string {
      if (autoNaming) {
        return `${node.type}${incrementCounter(componentId)}`;
      }
      return node.data.nameId || `${node.type}${incrementCounter(componentId)}`;
    }

    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) {
        console.error(`Node with id ${nodeId} not found.`);
        continue;
      }

      const config: any = node.data || {};
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

      let code = '';
      let inputName = '';
      let outputName = '';
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
          outputName: nodeOutputs.get(nodeId) || '',
          functions,
          lastUpdated: config.lastUpdated || 0,
          lastExecuted: config.lastExecuted || 0,
          runtime: config.backend?.engine || 'local'
        });

      } catch (error) {
        console.error(`Error processing node ${nodeId}:`, error);
        throw error;
      }
    }

    return nodeObjects;
  }

  static formatVariables(code: string): string {
    const lines = code.split('\n');
    const transformed = lines.map(line => {
      if (/r(['"]).*\1/.test(line) || /f(['"])/.test(line) || /f("""|''')/.test(line)) {
        return line;
      }
      return line
        .replace(/(['"])\{(\w+)\}\1/g, '$2')
        .replace(/(['"])(.*\{.*\}.*)\1/g, 'f$1$2$1')
        .replace(/(f?"""\s*)(.*\{.*\}.*)(\s*""")/g, 'f"""$2"""');
    });
    return transformed.join('\n');
  }

  static getEnvironmentVariableCode(
    pipelineJson: string,
    componentService: any
  ): string {
    const flow = PipelineService.filterPipeline(pipelineJson);
    const envVariablesMap = new Map<string, Node>();
    const uniqueImports = new Set<string>();

    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (type === 'env_variables' || type === 'env_file') {
        envVariablesMap.set(node.id, node);
      }
    });

    if (envVariablesMap.size === 0) {
      return '# No environment variable components found.';
    }

    let codeAccumulator = '';
    envVariablesMap.forEach(node => {
      const component = componentService.getComponent(node.type);
      const config: any = node.data;
      component.provideImports({ config }).forEach(imp => uniqueImports.add(imp));
      codeAccumulator += component.generateComponentCode({ config });
    });

    const importsCode = Array.from(uniqueImports).join('\n');
    return `${importsCode}\n\n${codeAccumulator}`;
  }

  static getConnectionCode(
    pipelineJson: string,
    componentService: any
  ): string {
    const flow = PipelineService.filterPipeline(pipelineJson);
    const connectionsMap = new Map<string, Node>();
    const uniqueImports = new Set<string>();

    flow.nodes.forEach(node => {
      const type = componentService.getComponent(node.type)._type;
      if (type === 'connection') {
        connectionsMap.set(node.id, node);
      }
    });

    if (connectionsMap.size === 0) {
      return '# No connection components found.';
    }

    let codeAccumulator = '';
    connectionsMap.forEach(node => {
      const component = componentService.getComponent(node.type);
      const config: any = node.data;
      component.provideImports({ config }).forEach(imp => uniqueImports.add(imp));
      codeAccumulator += component.generateComponentCode({ config });
    });

    const importsCode = Array.from(uniqueImports).join('\n');
    return `${importsCode}\n\n${codeAccumulator}`;
  }

  static getComponentAndDataForNode(
    nodeId: string,
    componentService: any,
    pipelineJson: string
  ): { component: any; data: any } | null {
    const flow = PipelineService.filterPipeline(pipelineJson);
    const node = flow.nodes.find((n: Node) => n.id === nodeId);
    if (!node) {
      console.error(`Node with id ${nodeId} not found.`);
      return null;
    }
    const component = componentService.getComponent(node.type);
    if (!component) {
      console.error(`Component for node type ${node.type} not found.`);
      return null;
    }
    return { component, data: node.data };
  }

  // Subclasses will often override or extend these methods:

  static generateCodeForNodes(
    flow: Flow,
    componentService: any,
    targetNodeId: string,
    fromStart: boolean,
    variablesAutoNaming: boolean
  ): {
    codeList: string[];
    incrementalCodeList: { code: string; nodeId: string }[];
    executedNodes: Set<string>;
  } {
    throw new Error('generateCodeForNodes should be implemented by subclass');
  }

  static generateCode(
    pipelineJson: string,
    commands: any,
    componentService: any,
    variablesAutoNaming: boolean
  ): string {
    throw new Error('generateCode should be implemented by subclass');
  }

  static generateCodeUntil(
    pipelineJson: string,
    commands: any,
    componentService: any,
    targetNode: string,
    incremental: boolean,
    variablesAutoNaming: boolean
  ): any[] {
    throw new Error('generateCodeUntil should be implemented by subclass');
  }
}