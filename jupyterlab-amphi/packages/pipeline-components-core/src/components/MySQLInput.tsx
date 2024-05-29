import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import { mySQLIcon } from '../icons';

export class MySQLInput extends PipelineComponent<ComponentItem>() {
  public _name = "MySQL Input";
  public _id = "mySQLInput";
  public _type = "pandas_df_input";
  public _category = "input";
  public _icon = mySQLIcon; // Adjust if there's a different icon for databases
    public _default = { dbOptions: { host: "localhost", port: "3306", databaseName: "", username: "", password: "", tableName: ""} };
    public _form = {
      fields: [
        {
          type: "input",
          label: "Host",
          id: "dbOptions.host",
          placeholder: "Enter database host",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "dbOptions.port",
          placeholder: "Enter database port",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "dbOptions.databaseName",
          placeholder: "Enter database name",
        },
        {
          type: "input",
          label: "Username",
          id: "dbOptions.username",
          placeholder: "Enter username",
          advanced: true
        },
        {
          type: "input",
          label: "Password",
          id: "dbOptions.password",
          placeholder: "Enter password",
          inputType: "password",
          advanced: true
        },
        {
          type: "input",
          label: "Table Name",
          id: "dbOptions.tableName",
          placeholder: "Enter table name",
        },
        {
          type: "codeTextarea",
          label: "SQL Query",
          height: '50px',
          mode: "sql",
          placeholder: 'SELECT * FROM table_name',
          id: "dbOptions.sqlQuery",
          tooltip: 'Optional. By default the SQL query is: SELECT * FROM table_name_provided. If specified, the SQL Query is used.',
          advanced: true
        }
      ],
    };
  
    public static ConfigForm = ({ 
        nodeId, 
        data,
        context,
        componentService,
        manager,
        commands,
        store,
        setNodes
      }) => {
        const defaultConfig = this.Default; 
    
        const handleSetDefaultConfig = useCallback(() => {
          setDefaultConfig({ nodeId, store, setNodes, defaultConfig });
        }, [nodeId, store, setNodes, defaultConfig]);
      
        useEffect(() => {
          handleSetDefaultConfig();
        }, [handleSetDefaultConfig]);
      
        const handleChange = useCallback((evtTargetValue: any, field: string) => {
          onChange({ evtTargetValue, field, nodeId, store, setNodes });
        }, [nodeId, store, setNodes]);
    
        return (
          <>
            {generateUIFormComponent({
              nodeId: nodeId,
              type: this.Type,
              name: this.Name,
              form: this.Form,
              data: data,
              context: context,
              componentService: componentService,
              manager: manager,
              commands: commands,
              handleChange: handleChange,
            })}
          </>
        );
    }
  
    public UIComponent({ id, data, context, componentService, manager, commands  }) {
  
      const { setNodes, deleteElements, setViewport } = useReactFlow();
      const store = useStoreApi();
  
      const deleteNode = useCallback(() => {
        deleteElements({ nodes: [{ id }] });
      }, [id, deleteElements]);
  
      const zoomSelector = createZoomSelector();
      const showContent = useStore(zoomSelector);
      
      const selector = (s) => ({
        nodeInternals: s.nodeInternals,
        edges: s.edges,
      });

      const { nodeInternals, edges } = useStore(selector);
      const nodeId = id;
      const internals = { nodeInternals, edges, nodeId, componentService }

      const handleElement = React.createElement(renderHandle, {
        type: MySQLInput.Type,
        Handle: Handle,
        Position: Position,
        internals: internals
      });
      
      return (
        <>
          {renderComponentUI({
            id: id,
            data: data,
            context: context,
            manager: manager,
            commands: commands,
            name: MySQLInput.Name,
            ConfigForm: MySQLInput.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
            Icon: MySQLInput.Icon,
            showContent: showContent,
            handle: handleElement,
            deleteNode: deleteNode,
            setViewport: setViewport,
          })}
        </>
      );
    }
  
    public provideImports({config}): string[] {
      return ["import pandas as pd", "import sqlalchemy", "import pymysql"];
    }  

    public generateComponentCode({ config, outputName }): string {
      let connectionString = `mysql+pymysql://${config.dbOptions.username}:${config.dbOptions.password}@${config.dbOptions.host}:${config.dbOptions.port}/${config.dbOptions.databaseName}`;
      const uniqueEngineName = `${outputName}_Engine`; // Unique engine name based on the outputName
      const sqlQuery = config.dbOptions.sqlQuery && config.dbOptions.sqlQuery.trim() ? config.dbOptions.sqlQuery : `SELECT * FROM ${config.dbOptions.tableName}`;
      const code = `
# Connect to the MySQL database
${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
with ${uniqueEngineName}.connect() as conn:
    ${outputName} = pd.read_sql(
        "${sqlQuery}",
        con=conn.connection
    ).convert_dtypes()
`;
      return code;
    }
  }
