// ================================================
// CodeGeneratorDagster.ts
// ================================================

import {
  PipelineService, Node, Flow
} from './PipelineService';
import { BaseCodeGenerator, NodeObject } from './BaseCodeGenerator';

export class CodeGeneratorDagster extends BaseCodeGenerator {
  static generateDagsterCode(
    pipelineJson: string,
    commands: any,
    componentService: any,
    variablesAutoNaming: boolean
  ): string {
    console.log("Inside generateDagsterCode method");

    const flow = PipelineService.filterPipeline(pipelineJson);
    const { nodesToTraverse, nodesMap, nodeDependencies } = this.computeNodesToTraverse(
      flow,
      'none',
      componentService
    );

    const dagsterImports = [
      'import dagster',
      'from dagster import op, job, Out, In, Nothing'
    ];

    const envVariablesCode = this.getEnvironmentVariableCode(pipelineJson, componentService);
    const connectionsCode = this.getConnectionCode(pipelineJson, componentService);

    const opDefinitions: string[] = [];
    const uniqueImports = new Set<string>();
    const uniqueDependencies = new Set<string>();
    const uniqueFunctions = new Set<string>();

    // Collect
    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) continue;
      const config: any = node.data;
      const component = componentService.getComponent(node.type);
      component.provideImports({ config }).forEach(imp => uniqueImports.add(imp));
      if (typeof component.provideDependencies === 'function') {
        component.provideDependencies({ config }).forEach(d => uniqueDependencies.add(d));
      }
      if (typeof component.provideFunctions === 'function') {
        component.provideFunctions({ config }).forEach(f => uniqueFunctions.add(f));
      }
    }

    // ----------------  -----------  START FIRST FIX , IT WORKS.. I TRIED IT -------------------------------
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
            opInputs.push(`input_data${i + 1}: pd.DataFrame`);
          }
          opOutputs.push('result: pd.DataFrame');

          const inputNames = inputIds.map((_, i) => `input_data${i + 1}`);
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

      
const opDef = `@op
def ${opName}(${opInputs.join(', ')}):
  """ ${config.customTitle || node.type} """
${opCode.split('\n').map(line => line.trim() ? '  ' + line : '').join('\n')}
  ${opOutputs.length > 0 ? 'return result' : 'return'}
\n`; 

opDefinitions.push(opDef);
    }

    // ----------------  -----------  END FIRST FIX , IT WORKS.. I TRIED IT -------------------------------

    //    Create ops (naive example)
    // ----------------  -----------  START SECOND FIX , IT WORKS.. I TRIED IT -------------------------------
    //     for (const nodeId of nodesToTraverse) {
    //       const node = nodesMap.get(nodeId);
    //       if (!node) continue;

    //       const config: any = node.data;
    //       const component = componentService.getComponent(node.type);
    //       const componentType = component._type;
    //       let opName = this.generateReadableName(config.customTitle || node.type);

    //       let opInputs: string[] = [];
    //       let opOutputs: string[] = [];
    //       let opCode = '';

    //       if (/double_processor/.test(componentType)) {
    //         opInputs.push('input_data1: pd.DataFrame');
    //         opInputs.push('input_data2: pd.DataFrame');
    //         opOutputs.push('result: pd.DataFrame');

    //         const originalCode = component.generateComponentCode({
    //           config,
    //           inputName1: 'input_data1',
    //           inputName2: 'input_data2',
    //           outputName: 'result'
    //         });

    //         opCode = originalCode;
    //       }
    //       else if (/multi_processor/.test(componentType)) {
    //         const inputIds = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
    //         for (let i = 0; i < inputIds.length; i++) {
    //           opInputs.push(`input_data${i + 1}: pd.DataFrame`);
    //         }
    //         opOutputs.push('result: pd.DataFrame');

    //         const inputNames = inputIds.map((_, i) => `input_data${i + 1}`);
    //         const originalCode = component.generateComponentCode({
    //           config,
    //           inputNames,
    //           outputName: 'result'
    //         });

    //         opCode = originalCode;
    //       }
    //       else if (/processor/.test(componentType)) {
    //         opInputs.push('input_data: pd.DataFrame');
    //         opOutputs.push('result: pd.DataFrame');

    //         const originalCode = component.generateComponentCode({
    //           config,
    //           inputName: 'input_data',
    //           outputName: 'result'
    //         });

    //         opCode = originalCode;
    //       }
    //       else if (/input/.test(componentType)) {
    //         opOutputs.push('result: pd.DataFrame');

    //         const originalCode = component.generateComponentCode({
    //           config,
    //           outputName: 'result'
    //         });

    //         opCode = originalCode;
    //       }
    //       else if (/output/.test(componentType)) {
    //         opInputs.push('input_data: pd.DataFrame');

    //         const originalCode = component.generateComponentCode({
    //           config,
    //           inputName: 'input_data'
    //         });

    //         opCode = originalCode;
    //       }
    //       else {
    //         console.warn(`Unsupported component type: ${componentType} for Dagster export`);
    //       }

    //       // Build the definition
    //       const opDef = `
    // @op
    // def ${opName}(${opInputs.join(', ')}):
    //     """ ${config.customTitle || node.type} """
    //     ${opCode.split('\n').join('\n    ')}
    //     ${opOutputs.length > 0 ? 'return result' : 'return'}
    // `;
    //       opDefinitions.push(opDef);
    //     }

    // ----------------  -----------  END SECOND FIX , IT WORKS.. I TRIED IT -------------------------------

    // Build job definition
    const jobDefinition = this.generateDagsterJobDefinition(
      flow,
      nodesMap,
      nodeDependencies,
      nodesToTraverse
    );

    // Combine
    const now = new Date();
    const dateString = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const dateComment = `# Source code generated by Amphi for Dagster\n# Date: ${dateString}\n`;
    const additionalDeps = `# Additional dependencies: dagster, ${Array.from(uniqueDependencies).join(', ')}\n`;

    const dagsterCode = [
      dateComment,
      additionalDeps,
      dagsterImports.join('\n'),
      '\n',
      Array.from(uniqueImports).join('\n'),
      '\n',
      envVariablesCode,
      '\n',
      connectionsCode,
      ...Array.from(uniqueFunctions),
      ...opDefinitions,
      jobDefinition
    ].join('');

    return this.formatVariables(dagsterCode);
  }

  static generateDagsterJobDefinition(
    flow: Flow,
    nodesMap: Map<string, Node>,
    nodeDependencies: Map<string, string[]>,
    nodesToTraverse: string[]
  ): string {
    const nodeToOp = new Map<string, string>();
    const processedNodes = new Set<string>();
    const resultVar = new Map<string, string>();

    for (const nodeId of nodesToTraverse) {
      const node = nodesMap.get(nodeId);
      if (!node) continue;
      const config: any = node.data;
      const opName = this.generateReadableName(config.customTitle || node.type);
      nodeToOp.set(nodeId, opName);

      const rVar = opName.replace('Op', 'Result');
      resultVar.set(nodeId, rVar);
    }

    let jobCode = '\n\n@job\ndef dagster_pipeline():\n';
    const dependencyGraph = new Map<string, string[]>();
    for (const edge of flow.edges) {
      if (!nodeToOp.has(edge.source) || !nodeToOp.has(edge.target)) continue;
      if (!dependencyGraph.has(edge.target)) {
        dependencyGraph.set(edge.target, []);
      }
      dependencyGraph.get(edge.target)!.push(edge.source);
    }

    const startingNodes = nodesToTraverse.filter(id =>
      !dependencyGraph.has(id) || dependencyGraph.get(id)!.length === 0
    );
    for (const nodeId of startingNodes) {
      const op = nodeToOp.get(nodeId);
      const r = resultVar.get(nodeId);
      if (!op || !r) continue;
      jobCode += `    ${r} = ${op}()\n`;
      processedNodes.add(nodeId);
    }

    for (const nodeId of nodesToTraverse) {
      if (processedNodes.has(nodeId)) continue;
      const op = nodeToOp.get(nodeId);
      const r = resultVar.get(nodeId)!;
      const deps = dependencyGraph.get(nodeId) || [];

      if (!op) continue;
      if (deps.length === 0) {
        jobCode += `    ${r} = ${op}()\n`;
      } else if (deps.length === 1) {
        const src = resultVar.get(deps[0])!;
        jobCode += `    ${r} = ${op}(${src})\n`;
      } else {
        const srcList = deps.map(d => resultVar.get(d)!).join(', ');
        jobCode += `    ${r} = ${op}(${srcList})\n`;
      }
      processedNodes.add(nodeId);
    }
    return jobCode;
  }

  static generateReadableName(rawName: string): string {
    const camelCaseName = rawName
      .split(/(?=[A-Z])/)
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
    return camelCaseName + 'Op';
  }
}