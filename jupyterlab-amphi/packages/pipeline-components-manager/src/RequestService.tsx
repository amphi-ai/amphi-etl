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
      let refNodeId = previousNodes ? PipelineService.findMultiplePreviousNodeIds(flow, nodeId)[inputNb] : nodeId;
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
      code = null; // Or handle error appropriately
      setLoadings(false);
    }

    const lines = code.split('\n');
    let output_df = lines.pop(); // Extract the last line and store it in output_df
    output_df = output_df.match(/__amphi_display_pandas_dataframe\((.*)\)/)?.[1];

    if (output_df && output_df.trim() && output_df.trim().split(' ').length === 1) {

      code = lines.join('\n'); // Rejoin the remaining lines back into code
      const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

      future.onReply = reply => {
        if (reply.content.status == "ok") {
          const future2 = context.sessionContext.session.kernel!.requestExecute({ code: "print(_amphi_metadatapanel_getcontentof(" + output_df + "))" });
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
                  named: namedStatus.trim() === 'named' // true if 'named', false if 'unnamed'
                });
              }

              // Update the items array with the new items, ensuring no duplicates
              setItems(items => {
                const itemSet = new Set(items.map(item => item.value)); // Create a set of existing item values
                const uniqueItems = newItems.filter(newItem => !itemSet.has(newItem.value));

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
        } else if (reply.content.status == "error") {
          setLoadings(false)
        } else if (reply.content.status == "abort") {
          setLoadings(false)
        } else {
          setLoadings(false)
        }
      };

    } else {
      setLoadings(false);
    }


  };

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
${component.generateDatabaseConnectionCode({ config: data, connectionName: 'engine' })}
schema = pd.read_sql(query, con=engine)

${pythonExtraction}
`;


    console.log("CODE %o", code)

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
