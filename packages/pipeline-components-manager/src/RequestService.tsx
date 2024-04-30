import React from 'react';
import { PathExt } from '@jupyterlab/coreutils';
import { KernelMessage } from '@jupyterlab/services';
import { CodeGenerator } from './CodeGenerator';
import { PipelineService } from './PipelineService';
import { FieldDescriptor } from './configUtils';

export class RequestService {

  static retrieveDataframeColumns(
    event: React.MouseEvent<HTMLElement>,
    context: any,
    commands: any,
    componentService: any,
    setItems: any,
    setLoadings: any,
    nodeId: any,
    inputNb: number
    ): any {
    setLoadings(true);
    const flow = PipelineService.filterPipeline(context.model.toString());
    let code: string = '';

    try {
        code = CodeGenerator.generateCodeUntil(
            context.model.toString(),
            commands,
            componentService,
            PipelineService.findMultiplePreviousNodeIds(flow, nodeId)[inputNb],
            context
        );
    } catch (error) {
        console.error("Error generating code.", error);
        code = null; // Or handle error appropriately
        setLoadings(false);
    }    

    const lines = code.split('\n');
    const output_df = lines.pop(); // Extract the last line and store it in output_df

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
              const regex = /([^\s,]+)\s+\(([^,]+),\s*(named|unnamed)\)/g;
              const newItems = [];
              
              let match;
              while ((match = regex.exec(output)) !== null) {
                const [_, name, type, namedStatus] = match;
                newItems.push({
                  value: name,
                  label: name,
                  type: type,
                  named: namedStatus === 'named' // true if 'named', false if 'unnamed'
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

  static retrieveTableColumns(
    event: React.MouseEvent<HTMLElement>,
    connectionString: string,
    tableName: string,
    query: string,
    context: any,
    commands: any,
    componentService: any,
    setDataSource: any,
    setLoadings: any,
    nodeId: any,
    ): any {
    setLoadings(true);

    const code = `
!pip install --quiet pymysql --disable-pip-version-check
import pandas as pd
from sqlalchemy import create_engine
schema = pd.read_sql("${query}", con = create_engine("${connectionString}"))
column_info = schema[["Field", "Type"]]
formatted_output = ", ".join([f"{row['Field']} ({row['Type']})" for _, row in column_info.iterrows()])
print(formatted_output)
`;

console.log("code: " + code);

      const future = context.sessionContext.session.kernel!.requestExecute({ code: code });

      future.onReply = reply => {
        if (reply.content.status == "ok") {
          console.log("OK")
        } else if (reply.content.status == "error") {
          console.log("error")
          setLoadings(false)
        } else if (reply.content.status == "abort") {
          console.log("abort")
          setLoadings(false)
        } else {
          console.log("Other")
          setLoadings(false)
        }
      };

      future.onIOPub = msg => {
        if (msg.header.msg_type === 'stream') {
          console.log("stream")
          const streamMsg = msg as KernelMessage.IStreamMsg;
          const output = streamMsg.content.text;
          console.log("message : %o",output )

          const regex = /([^\s,]+)\s+\(((?:[^()]+|\([^)]*\))*)\)/g;
          const newItems = [];
          
          let match;
          while ((match = regex.exec(output)) !== null) {
            const [_, name, type, namedStatus] = match;
            newItems.push({
              input: {},
              value: name,
              key: name,
              type: type.toUpperCase()
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
