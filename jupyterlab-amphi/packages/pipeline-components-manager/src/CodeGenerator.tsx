import {
  Notification
} from '@jupyterlab/apputils';
import {
  PipelineService, Node, Flow
} from './PipelineService';
import { RequestService } from './RequestService';
import { KernelMessage } from '@jupyterlab/services';

export class CodeGenerator {

  static generateCode(pipelineJson: string, commands: any, componentService: any) {

    let code = this.generateCodeForNodes(PipelineService.filterPipeline(pipelineJson), componentService, 'none', true);

    return code;
  }

  static generateCodeUntil(pipelineJson: string, commands: any, componentService: any, targetNode: string, context: any) {

    const flow = PipelineService.filterPipeline(pipelineJson);


    // Only generate code up until target node
    let fromStart: boolean = true;
    const previousNodesIds = PipelineService.findMultiplePreviousNodeIds(flow, targetNode); // list of previous nodes

    const lastExecuted = (flow.nodes.find(node => node.id === targetNode) || {}).data?.lastExecuted || null;
    const previousLastExecutedValues = flow.nodes
      .filter(node => previousNodesIds.includes(node.id)) // Get lastExecuted from previous nodes
      .map(node => node.data.lastExecuted); // Map to lastExecuted
    const lastUpdatedValues = PipelineService.getLastUpdatedInPath(flow, targetNode); // Get last updated values

    // Add lastExecuted to the list of previous last executed values
    const allLastExecutedValues = [...previousLastExecutedValues, lastExecuted];

    // Check if any lastUpdated is greater than any of the lastExecuted values
    const updatesSinceLastExecutions = lastUpdatedValues.some(updatedValue =>
      allLastExecutedValues.some(executedValue => updatedValue > executedValue)
    );

    /*
    console.log("updatesSinceLastExecutions %o", updatesSinceLastExecutions)

    if(updatesSinceLastExecutions) {
      fromStart = true;
    } else {
      const dataframes = previousNodesIds.map((nodeId) => {
        const nodeCode = this.generateCodeForNodes(flow, componentService, nodeId, false);
        const codeLines = nodeCode.split("\n"); // Split into individual lines
        return codeLines[codeLines.length - 1]; // Get the last line
      });

      console.log("Dataframes: %o", dataframes);
  
      dataframes.forEach((df) => {
        const future = context.sessionContext.session.kernel!.requestExecute({ code: "print(_amphi_metadatapanel_getcontentof(" + df + "))" });
        future.onIOPub = msg => {
          if (msg.header.msg_type === 'stream') {
            const streamMsg = msg as KernelMessage.IStreamMsg;
            const output = streamMsg.content.text;
            console.log("output successful")
            fromStart = false;
          } else  {
            const errorMsg = msg as KernelMessage.IErrorMsg;
            const errorOutput = errorMsg.content;
            console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
            fromStart = true;
          }
        };
      });
    }
    */

    if (true) {
      const command = 'pipeline-metadata-panel:delete-all';
      commands.execute(command, {}).catch(reason => {
        console.error(
          `An error occurred during the execution of ${command}.\n${reason}`
        );
      });
    }

    const code = this.generateCodeForNodes(flow, componentService, targetNode, true);
    console.log("Code generated %o", code)
    return code;
  }

  static generateCodeForNodes = (flow: Flow, componentService: any, targetNodeId: string, fromStart: boolean): string => {

    // Intialization
    let code: string = '';
    let lastCodeGenerated: string = '';
    let counters = new Map<string, number>(); // Map with string as key and integer as value
    const nodesMap = new Map<string, Node>();
    const nodeDependencies = new Map<string, string[]>(); // To keep track of node dependencies
    const sortedNodes: string[] = []; // To store the topologically sorted nodes
    const loggersMap = new Map<string, Node>();
    const envVariablesMap = new Map<string, Node>();
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
        } else if (type === 'env_variables' || type === 'env_file') {
          envVariablesMap.set(node.id, node);
        } else {
          nodesMap.set(node.id, node);
        }
      }
    });

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
      // Filter the sortedNodes to include only those in pathToTarget, preserving the topological order
      nodesToTraverse = sortedNodes.filter(nodeId => pathToTarget.has(nodeId));
    } else {
      nodesToTraverse = sortedNodes;
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
        const deps = component.provideDependencies({ config });
        deps.forEach(dep => uniqueDependencies.add(dep));
      }

      const imports = component.provideImports({ config }); // Gather imports
      imports.forEach(importStatement => uniqueImports.add(importStatement));

      // Gather functions
      if (typeof component?.provideFunctions === 'function') {
        component.provideFunctions({ config }).forEach(func => functions.add(func));
      }

      // Initiliaze input and output variables
      let inputName = '';
      let outputName = '';


      switch (component_type) {
        case 'pandas_df_processor':
        case 'pandas_df_to_documents_processor':
        case 'documents_processor':
          incrementCounter(component_id);
          inputName = nodeOutputs.get(PipelineService.findPreviousNodeId(flow, nodeId));
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(nodeId, outputName); // Map the source node to its output variable
          lastCodeGenerated = componentService.getComponent(node.type).generateComponentCode({ config, inputName, outputName });
          break;
        case 'pandas_df_double_processor':
          const [input1Id, input2Id] = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
          incrementCounter(component_id);
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(node.id, outputName);
          const inputName1 = nodeOutputs.get(input1Id);
          const inputName2 = nodeOutputs.get(input2Id);
          lastCodeGenerated = componentService.getComponent(node.type).generateComponentCode({
            config,
            inputName1,
            inputName2,
            outputName
          });
          break;
        case 'pandas_df_multi_processor':
          const inputIds = PipelineService.findMultiplePreviousNodeIds(flow, nodeId);
          incrementCounter(component_id);
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(node.id, outputName);
          const inputNames = inputIds.map(inputId => nodeOutputs.get(inputId));
          lastCodeGenerated = componentService.getComponent(node.type).generateComponentCode({
            config,
            inputNames,
            outputName
          });
          break;
        case 'pandas_df_input':
        case 'documents_input':
          incrementCounter(component_id);
          outputName = `${node.type}${counters.get(component_id)}`;
          nodeOutputs.set(nodeId, outputName); // Map the source node to its output variable
          lastCodeGenerated = componentService.getComponent(node.type).generateComponentCode({ config, outputName });
          break;
        case 'pandas_df_output':
        case 'documents_output':
          incrementCounter(component_id);
          inputName = nodeOutputs.get(PipelineService.findPreviousNodeId(flow, nodeId));
          lastCodeGenerated = componentService.getComponent(node.type).generateComponentCode({ config, inputName });
          break;
        default:
          console.error("Error generating code.");
      }

      code += lastCodeGenerated;

      // If target node....  
      if (nodeId === targetNodeId) {
        if (component_type.includes('processor') || component_type.includes('input')) {
          if (component_type.includes('documents')) {
            if (!fromStart) {
              code = lastCodeGenerated;
            }
            code += '\n' + '_amphi_display_documents_as_html(' + nodeOutputs.get(nodeId) + ')';
          } else {
            if (!fromStart) {
              code = lastCodeGenerated;
            }
            code += '\n' + nodeOutputs.get(nodeId);
          }

        } else if (component_type.includes('output')) {
          // Add try block and indent existing code
          const indentedCode = code.split('\n').map(line => '    ' + line).join('\n');
          code = 'try:\n' + indentedCode + '\n    print("Pipeline Execution: SUCCESS")\n';
          code += 'except Exception as e:\n';
          code += '    print(f"Pipeline Execution: FAILED with error {e}")\n';
          code += '    raise\n';  // Re-raise the exception to propagate the error status
        }
      }
    }

    let envVariablesCode = '';
    // Loggers when full pipeline execution
    if (envVariablesMap.size > 0) {
      envVariablesMap.forEach((node, nodeId) => {
        // Process each logger
        const component = componentService.getComponent(node.type);

        let config: any = node.data as any; // Initialize config

        const imports = component.provideImports({ config }); // Gather imports
        imports.forEach(importStatement => uniqueImports.add(importStatement));

        envVariablesCode += componentService.getComponent(node.type).generateComponentCode({ config });

      });
    } else {
      console.error('No env variables component found.');
    }



    // Loggers when full pipeline execution
    if (loggersMap.size > 0) {

      let loggerCode = '';

      loggersMap.forEach((node, nodeId) => {
        // Process each logger
        const component = componentService.getComponent(node.type);

        let config: any = node.data as any; // Initialize config
        // Only gather additionnal dependencies if the function exists
        if (typeof component?.provideDependencies === 'function') {
          const deps = component.provideDependencies({ config });
          deps.forEach(dep => uniqueDependencies.add(dep));
        }

        if (typeof component?.provideFunctions === 'function') {
          component.provideFunctions({ config }).forEach(func => functions.add(func));
        }

        const imports = component.provideImports({ config }); // Gather imports
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
      // console.log('No loggers found.');
    }

    const currentDate = new Date();
    const dateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;
    const dateComment = `# Source code generated by Amphi\n# Date: ${dateString}`;
    const additionalImports = `# Additional dependencies: ${Array.from(uniqueDependencies).join(', ')}`;

    // Replace variabale string 
    code = this.convertToFString(code);

    const generatedCode =
      `${dateComment}
${additionalImports}
${Array.from(uniqueImports).join('\n')}
\n${envVariablesCode}${Array.from(functions).join('\n\n')}
${code}`;

    return generatedCode;

  };

  static convertToFString(pythonCode: string): string {
    const envVarRegex = /{os\.environ\['(\w+)'\]}/g;

    return pythonCode.replace(/"([^"]*)"/g, (match, group) => {
      let replacedGroup = group;
      let matchResult;
      while ((matchResult = envVarRegex.exec(group)) !== null) {
        const [fullMatch, envVar] = matchResult;
        replacedGroup = replacedGroup.replace(fullMatch, `{os.environ['${envVar}']}`);
      }
      return replacedGroup.includes("{os.environ") ? `f"${replacedGroup}"` : `"${replacedGroup}"`;
    });
  }



};



