import { KernelMessage } from '@jupyterlab/services';
import React from 'react';
import { CodeGenerator } from './CodeGenerator';
import { PipelineService } from './PipelineService';

export class RequestService {

  static retrieveDataframeColumns(
    event: React.MouseEvent<HTMLElement>,
    context: any,
    commands: any,
    componentService: any,
    setItems: any,
    setLoadings: any,
    nodeId: any,
    inputNb: number,
    previousNodes: boolean
  ): any {
    setLoadings(true);
    const flow = PipelineService.filterPipeline(context.model.toString());
    let codeList: any[];
    let code: string = '';

    try {
      // Determine the reference node to use
      let refNodeId = previousNodes ? PipelineService.findMultiplePreviousNodeIds(flow, nodeId)[inputNb] : nodeId;
      const nodesMap = new Map(flow.nodes.map(node => [node.id, node]));

      // Check if the previous node has already been executed recently
      const refNode = nodesMap.get(refNodeId);
      if (refNode) {
        const { lastUpdated, lastExecuted, nameId } = refNode.data || {};

        // If the node has been executed after its last update, skip code generation
        // console.log("lastExecuted %o, type: %s", lastExecuted, typeof lastExecuted);
        // console.log("lastUpdated %o, type: %s", lastUpdated, typeof lastUpdated);

        if (lastExecuted >= lastUpdated) {
          console.log("Skip generation")
          const dataframeVar = nameId || refNodeId;
          const codeToFetchContent = `print(_amphi_metadatapanel_getcontentof(${dataframeVar}))`;

          const future = context.sessionContext.session.kernel!.requestExecute({ code: codeToFetchContent });
          future.onIOPub = msg => {
            if (msg.header.msg_type === 'stream') {
              const streamMsg = msg as KernelMessage.IStreamMsg;
              const output = streamMsg.content.text;

              const regex = /([^,]+)\s+\(([^,]+(?:\[[^\]]+\])?),\s*(named|unnamed)\)/g;
              const newItems = [];

              let match;
              while ((match = regex.exec(output)) !== null) {
                const [_, name, type, namedStatus] = match;
                newItems.push({
                  value: name.trim(),
                  label: name.trim(),
                  type: type.trim(),
                  named: namedStatus.trim() === 'named'
                });
              }

              setItems(items => {
                const itemSet = new Set(items.map(item => item.value));
                const uniqueItems = newItems.filter(newItem => !itemSet.has(newItem.value));
                return [...items, ...uniqueItems];
              });

              setLoadings(false);
            } else if (msg.header.msg_type === 'error') {
              setLoadings(false);
              const errorMsg = msg as KernelMessage.IErrorMsg;
              console.error(`Received error: ${errorMsg.content.ename}: ${errorMsg.content.evalue}`);
            }
          };
          console.log("return");

          return; // Skip further processing since data was fetched from cache
        }
      }

      // If not recently executed, generate code
      codeList = CodeGenerator.generateCodeUntil(
        context.model.toString(),
        commands,
        componentService,
        refNodeId,
        false,
        false
      );
      code = codeList.join('\n');
    } catch (error) {
      console.error("Error generating code.", error);
      code = null;
      setLoadings(false);
    }

    const lines = code.split('\n');
    let output_df = lines.pop();
    const match = output_df.match(/__amphi_display_dataframe\(([^,]*)/);
    output_df = match ? match[1] : null;

    if (output_df && output_df.trim() && output_df.trim().split(' ').length === 1) {
      code = lines.join('\n');
      const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

      future.onReply = reply => {
        if (reply.content.status == "ok") {
          const future2 = context.sessionContext.session.kernel!.requestExecute({ code: `print(_amphi_metadatapanel_getcontentof(${output_df}))` });
          future2.onIOPub = msg => {
            if (msg.header.msg_type === 'stream') {
              const streamMsg = msg as KernelMessage.IStreamMsg;
              const output = streamMsg.content.text;
              const regex = /([^,]+)\s+\(([^,]+),\s*(named|unnamed)\)/g;
              const newItems = [];

              let match;
              while ((match = regex.exec(output)) !== null) {
                const [_, name, type, namedStatus] = match;
                newItems.push({
                  value: name.trim(),
                  label: name.trim(),
                  type: type.trim(),
                  named: namedStatus.trim() === 'named'
                });
              }

              setItems(items => {
                const itemSet = new Set(items.map(item => item.value));
                const uniqueItems = newItems.filter(newItem => !itemSet.has(newItem.value));
                return [...items, ...uniqueItems];
              });

              setLoadings(false);
            } else if (msg.header.msg_type === 'error') {
              setLoadings(false);
              const errorMsg = msg as KernelMessage.IErrorMsg;
              console.error(`Received error: ${errorMsg.content.ename}: ${errorMsg.content.evalue}`);
            }
          };
        } else {
          setLoadings(false);
        }
      };
    } else {
      setLoadings(false);
    }
  };

  static executePythonCode(
    code: string,
    context: any,
    setItems: any,
    setLoading: any
  ): any {
    setLoading(true);

    // Execute the provided Python code
    const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

    future.onIOPub = msg => {
      if (msg.header.msg_type === 'stream') {
        // Handle standard output from print statements
        const streamMsg = msg as KernelMessage.IStreamMsg;
        const output = streamMsg.content.text;
        // Assume the output is a comma-separated list
        const itemsArray = output.split(',').map(item => item.trim());
        const newItems = itemsArray.map((item: string) => ({
          value: item,
          label: item,
          type: 'python',
          named: false,
        }));

        setItems(newItems);
        setLoading(false);
      } else if (msg.header.msg_type === 'execute_result' || msg.header.msg_type === 'display_data') {
        // Handle output from the last expression in the code cell
        const dataMsg = msg as KernelMessage.IExecuteResultMsg;
        const data = dataMsg.content.data['text/plain'] as string;
        // Clean the data string and parse it
        const cleanedData = data.replace(/['"\[\]]/g, '');
        const itemsArray = cleanedData.split(',').map(item => item.trim());
        const newItems = itemsArray.map((item: string) => ({
          value: item,
          label: item,
          type: 'python',
          named: false,
        }));

        setItems(newItems);
        setLoading(false);
      } else if (msg.header.msg_type === 'error') {
        // Handle execution errors
        setLoading(false);
        const errorMsg = msg as KernelMessage.IErrorMsg;
        const errorOutput = errorMsg.content;
        console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
      }
    };

    future.onReply = reply => {
      if (reply.content.status !== 'ok') {
        setLoading(false);
      }
    };
  }

  static retrieveTableList(
    event: React.MouseEvent<HTMLElement>,
    schemaName: string,
    query: string | undefined,
    context: any,
    componentService: any,
    setList: any,
    setLoadings: any,
    nodeId: any,
  ): any {
    setLoadings(true);

    // Escape and replace schema in the query
    let escapedQuery = query.replace(/"/g, '\\"');
    escapedQuery = escapedQuery.replace(/{{schema}}/g, schemaName);

    // Get environment and connection code
    const envVariableCode = CodeGenerator.getEnvironmentVariableCode(context.model.toString(), componentService);
    const connectionCode = CodeGenerator.getConnectionCode(context.model.toString(), componentService);

    // Get component and data for the node
    const { component, data } = CodeGenerator.getComponentAndDataForNode(nodeId, componentService, context.model.toString());

    if (!component) {
      console.error("Component or data not found.");
      setLoadings(false);
      return;
    }

    // Get the dependencies and imports from the component
    const dependencies = component.provideDependencies(data);
    const imports = component.provideImports(data);

    // Generate the dependencies string
    const dependencyString = dependencies.join(' ');

    // Generate the import statements string (one per line)
    const importStatements = imports.map((imp: string) => `${imp}`).join('\n');

    // Build the Python code string
    let code = `
!pip install --quiet ${dependencyString} --disable-pip-version-check
${importStatements}
${envVariableCode}
${connectionCode}

query = """
${escapedQuery}
"""
${component.generateDatabaseConnectionCode({ config: data, connectionName: "engine" })}

tables = pd.read_sql(query, con=engine)
tables.iloc[:, 0] = tables.iloc[:, 0].str.strip()  # Strip leading/trailing spaces
formatted_output = ", ".join(tables.iloc[:, 0].tolist())
print(formatted_output)
`;

    // Format any remaining variables in the code
    code = CodeGenerator.formatVariables(code);

    const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

    future.onReply = reply => {
      if (reply.content.status == "ok") {
      } else if (reply.content.status == "error") {
        setLoadings(false)
      } else if (reply.content.status == "abort") {
        setLoadings(false)
      } else {
        setLoadings(false)
      }
    };

    future.onIOPub = msg => {
      if (msg.header.msg_type === 'stream') {
        const streamMsg = msg as KernelMessage.IStreamMsg;

        // Check if the stream message is from 'stdout'
        if (streamMsg.content.name === 'stdout') {
          const output = streamMsg.content.text;

          const tables = output.split(', ');
          const newItems = tables.map(tableName => {
            const trimmedTableName = tableName.trim(); // Trim leading/trailing spaces
            return {
              input: {},
              value: trimmedTableName,
              key: trimmedTableName,
              label: trimmedTableName,
              type: 'table'
            };
          });

          setList((items) => {
            const existingKeys = new Set(items.map((item) => item.key));
            const uniqueItems = newItems.filter(newItem => !existingKeys.has(newItem.key));
            return [...items, ...uniqueItems];
          });

          setLoadings(false);
        }
      } else if (msg.header.msg_type === 'error') {
        setLoadings(false);
        const errorMsg = msg as KernelMessage.IErrorMsg;
        const errorOutput = errorMsg.content;
        console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
      }
    };
  };

  static retrieveTableColumns(
    event: React.MouseEvent<HTMLElement>,
    schemaName: string,
    tableName: string,
    query: string | undefined,
    pythonExtraction: string,
    context: any,
    componentService: any,
    setDataSource: any,
    setLoadings: any,
    nodeId: any,
  ): any {
    setLoadings(true);

    // Escape and replace schema and table in the query
    let escapedQuery = query.replace(/"/g, '\\"');
    escapedQuery = escapedQuery
      .replace(/{{schema}}/g, schemaName)
      .replace(/{{table}}/g, tableName);

    // Get environment and connection code
    const envVariableCode = CodeGenerator.getEnvironmentVariableCode(
      context.model.toString(),
      componentService
    );
    const connectionCode = CodeGenerator.getConnectionCode(
      context.model.toString(),
      componentService
    );

    // Get the component and data for the node
    const { component, data } = CodeGenerator.getComponentAndDataForNode(
      nodeId,
      componentService,
      context.model.toString()
    );

    if (!component) {
      console.error('Component or data not found.');
      setLoadings(false);
      return;
    }

    // Get the dependencies and imports from the component
    const dependencies = component.provideDependencies({ config: data });
    const imports = component.provideImports({ config: data });

    // Generate the dependencies string
    const dependencyString = dependencies.join(' ');

    // Generate the import statements string (one per line)
    const importStatements = imports.map((imp: string) => `${imp}`).join('\n');

    // Build the Python code string
    let code = `
!pip install --quiet ${dependencyString} --disable-pip-version-check
${importStatements}
${envVariableCode}
${connectionCode}
  
query = """
${escapedQuery}
"""
${component.generateDatabaseConnectionCode({ config: data, connectionName: 'engine' })}
schema = pd.read_sql(query, con=engine)

${pythonExtraction}
`;


    // Format any remaining variables in the code
    code = CodeGenerator.formatVariables(code);

    const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

    future.onReply = (reply) => {
      if (reply.content.status == 'ok') {
        // Execution was successful
      } else {
        setLoadings(false);
      }
    };

    future.onIOPub = (msg) => {
      if (msg.header.msg_type === 'stream') {
        const streamMsg = msg as KernelMessage.IStreamMsg;

        // Check if the stream message is from 'stdout'
        if (streamMsg.content.name === 'stdout') {
          const output = streamMsg.content.text;

          const regex = /([^\s,]+)\s+\(((?:[^()]+|\([^)]*\))*)\)/g;
          const newItems = [];

          let match;
          while ((match = regex.exec(output)) !== null) {
            const [_, name, type] = match;
            newItems.push({
              input: {},
              value: name,
              key: name,
              type: type.toUpperCase(),
            });
          }

          setDataSource((items) => {
            // Create a set of existing item keys
            const existingKeys = new Set(items.map((item) => item.key));

            // Filter newItems to ensure unique keys
            const uniqueItems = newItems.filter(
              (newItem) => !existingKeys.has(newItem.key)
            );

            return [...items, ...uniqueItems];
          });

          setLoadings(false);
        }
      } else if (msg.header.msg_type === 'error') {
        setLoadings(false);
        const errorMsg = msg as KernelMessage.IErrorMsg;
        const errorOutput = errorMsg.content;
        console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
      }
    };
  }

  static retrieveSheetNames(
    event: React.MouseEvent<HTMLElement>,
    context: any,
    componentService: any,
    setList: any,
    setLoadings: any,
    nodeId: any
  ): any {
    setLoadings(true);


    try {
      // Get environment and connection code
      const envVariableCode = CodeGenerator.getEnvironmentVariableCode(
        context.model.toString(),
        componentService
      );

      // Get component and data for the node
      const { component, data } = CodeGenerator.getComponentAndDataForNode(
        nodeId,
        componentService,
        context.model.toString()
      );


      if (!component) {
        throw new Error("Component or data not found.");
      }

      // Check if filePath exists
      if (!data.filePath) {
        throw new Error("filePath is missing in the node data.");
      }

      // Determine the backend prefix
      const backendPrefix = data.backend?.prefix ?? "pd";

      // Generate Python code using the component
      const generatedCode = component.generateComponentCode({
        config: { ...data },
        outputName: "excel_file",
      });

      // Get the dependencies and imports from the component
      const dependencies = component.provideDependencies({ config: data });
      const imports = component.provideImports({ config: data });

      const excelOptions = { ...data.excelOptions };
      const optionsString = component.generateOptionsCode(excelOptions);

      let filteredOptions = optionsString
      .split(",")
      .filter(option => option.trim().startsWith("engine"))
      .join(",");
      // Build the Python code string
      let code = `
!pip install --quiet ${dependencies.join(" ")} --disable-pip-version-check
${imports.map((imp: string) => `${imp}`).join("\n")}
${envVariableCode}

excel_obj = pd.ExcelFile("${data.filePath}"${filteredOptions ? `, ${filteredOptions}` : ''})
sheet_names = excel_obj.sheet_names
print(", ".join(sheet_names))
`;

      // Format variables in the code
      code = CodeGenerator.formatVariables(code);

      const future = context.sessionContext.session.kernel!.requestExecute({ code });

      // Handle response onReply
      future.onReply = (reply) => {
        if (reply.content.status !== "ok") {
          setLoadings(false);
          console.error("Execution failed:", reply.content);
          return;
        }
      };

      // Handle output messages
      future.onIOPub = (msg) => {
        if (msg.header.msg_type === "stream") {
          const streamMsg = msg as KernelMessage.IStreamMsg;

          if (streamMsg.content.name === "stdout") {
            const output = streamMsg.content.text;
            const sheets = output.split(", ");

            const newItems = sheets.map((sheetName) => ({
              input: {},
              value: sheetName.trim(),
              key: sheetName.trim(),
              label: sheetName.trim(),
              type: "sheet",
            }));

            setList((items) => {
              const existingKeys = new Set(items.map((item) => item.key));
              const uniqueItems = newItems.filter(
                (newItem) => !existingKeys.has(newItem.key)
              );
              return [...items, ...uniqueItems];
            });

            setLoadings(false);
          }
        } else if (msg.header.msg_type === "error") {
          setLoadings(false);
          const errorMsg = (msg as KernelMessage.IErrorMsg).content.evalue;
          console.error(`Error: ${errorMsg}`);
        }
      };

      // Ensure loading stops in case of any unforeseen issue
      future.onDone = () => {
        setLoadings(false);
      };
    } catch (error) {
      console.error("Error in retrieveSheetNames:", error);
      setLoadings(false);
    }
  }



  static retrieveEnvVariables(
    context: any,
    setDataSource: any,
    setLoadings: any,
    nodeId: any,
  ): any {
    setLoadings(true);

    let code = `
!pip install --quiet python-dotenv --disable-pip-version-check
from dotenv import dotenv_values
  
env_vars = dotenv_values(".env")
formatted_output = ", ".join([f"{k} ({v})" for k, v in env_vars.items()])
print(formatted_output)
`;

    // Replace connection string
    code = CodeGenerator.formatVariables(code);

    const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

    future.onReply = reply => {
      if (reply.content.status == "ok") {
      } else if (reply.content.status == "error") {
        setLoadings(false)
      } else if (reply.content.status == "abort") {
        setLoadings(false)
      } else {
        setLoadings(false)
      }
    };

    future.onIOPub = msg => {
      if (msg.header.msg_type === 'stream') {
        const streamMsg = msg as KernelMessage.IStreamMsg;
        const output = streamMsg.content.text;

        const regex = /([^\s,]+)\s+\(((?:[^()]+|\([^)]*\))*)\)/g;
        const newItems = [];

        let match;
        while ((match = regex.exec(output)) !== null) {
          const [_, name, value] = match;
          newItems.push({
            input: {},
            value: name,
            key: name,
            type: value
          });
        }

        setDataSource((items) => {
          const existingKeys = new Set(items.map((item) => item.key));
          const uniqueItems = newItems.filter(
            (newItem) => !existingKeys.has(newItem.key)
          );

          return [...items, ...uniqueItems];
        });

        setLoadings(false)
      } else if (msg.header.msg_type === 'error') {
        setLoadings(false)
        const errorMsg = msg as KernelMessage.IErrorMsg;
        const errorOutput = errorMsg.content;
        console.error(`Received error: ${errorOutput.ename}: ${errorOutput.evalue}`);
      }
    };
  };

}
