import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { mySQLIcon } from '../icons'; // Assuming databaseIcon is an available icon similar to filePlusIcon

export class MySQLOutput extends PipelineComponent<ComponentItem>() {

  public _name = "MySQL Output";
  public _id = "mySQLOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = mySQLIcon; // Adjust if there's a different icon for databases
  public _default = { dbOptions: { host: "localhost", port: "3306", databaseName: "", tableName: "", username: "", password: "" } };
  public _form = {
    idPrefix: "component__form",
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
        placeholder: "Enter database name"
      },
      {
        type: "input",
        label: "Table Name",
        id: "dbOptions.tableName",
        placeholder: "Enter table name",
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
        advanced: true
      },
      {
        type: "dataMapping",
        label: "Mapping",
        id: "mapping",
        outputType: "relationalDatabase",
        drivers: "mysql+pymysql",
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
    const defaultConfig = this.Default; // Define your default config

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

  public UIComponent({ id, data, context, componentService, manager, commands }) {

    const { setNodes, deleteElements, setViewport } = useReactFlow();
    const store = useStoreApi();

    const deleteNode = useCallback(() => {
      deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

  const zoomSelector = (s) => s.transform[2] >= 1;
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }

    const handleElement = React.createElement(renderHandle, {
      type: MySQLOutput.Type,
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
          name: MySQLOutput.Name,
          ConfigForm: MySQLOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: MySQLOutput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import pymysql"];
  }

  public generateComponentCode({ config, inputName }): string {
    const connectionString = `mysql+pymysql://${config.dbOptions.username}:${config.dbOptions.password}@${config.dbOptions.host}:${config.dbOptions.port}/${config.dbOptions.databaseName}`;
    const uniqueEngineName = `${inputName}Engine`; // Unique engine name based on the inputName
    const code = `
# Connect to MySQL and output into table
${uniqueEngineName} = sqlalchemy.create_engine('${connectionString}')
with ${uniqueEngineName}.connect() as conn:
  ${inputName}.to_sql(
    name='${config.dbOptions.tableName}',
    con=conn.connection,
    if_exists='replace',
    index=False
  ).convert_dtypes()
`;
    return code;
  }

}
