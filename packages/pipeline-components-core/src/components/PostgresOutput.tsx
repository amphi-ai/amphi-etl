import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { postgresIcon } from '../icons'; // Assuming databaseIcon is an available icon similar to filePlusIcon

export class PostgresOutput extends PipelineComponent<ComponentItem>() {

  public _name = "Postgres Output";
  public _id = "postgresOutput";
  public _type = "pandas_df_output";
  public _category = "output";
  public _icon = postgresIcon; // Adjust if there's a different icon for databases
  public _default = { dbOptions: { host: "localhost", port: "5432", databaseName: "", tableName: "", username: "", password: "" }, ifTableExists: "fail", mode: "insert" };
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
        inputType: "password",
        label: "Password",
        id: "dbOptions.password",
        placeholder: "Enter password",
        advanced: true
      },
      {
        type: "radio",
        label: "If Table Exists",
        id: "ifTableExists",
        options: [
          { value: "fail", label: "Fail" },
          { value: "replace", label: "Replace" },
          { value: "append", label: "Append" }

        ],
        advanced: true
      },
      {
        type: "radio",
        label: "Mode",
        id: "mode",
        options: [
          { value: "insert", label: "INSERT" }
        ],
        advanced: true
      },
      {
        type: "dataMapping",
        label: "Mapping",
        id: "mapping",
        tooltip: "By default the mapping is inferred from the input data. By specifying a schema you override the incoming schema.",
        outputType: "relationalDatabase",
        imports: ["psycopg2-binary"],
        drivers: "postgresql",
        typeOptions: [
          { value: "SMALLINT", label: "SMALLINT" },
          { value: "INTEGER", label: "INTEGER" },
          { value: "BIGINT", label: "BIGINT" },
          { value: "SERIAL", label: "SERIAL" },
          { value: "BIGSERIAL", label: "BIGSERIAL" },
          { value: "DECIMAL", label: "DECIMAL" },
          { value: "NUMERIC", label: "NUMERIC" },
          { value: "REAL", label: "REAL" },
          { value: "DOUBLE PRECISION", label: "DOUBLE PRECISION" },
          { value: "SMALLSERIAL", label: "SMALLSERIAL" },
          { value: "MONEY", label: "MONEY" },
          { value: "CHAR", label: "CHAR" },
          { value: "VARCHAR", label: "VARCHAR" },
          { value: "TEXT", label: "TEXT" },
          { value: "BYTEA", label: "BYTEA" },
          { value: "TIMESTAMP", label: "TIMESTAMP" },
          { value: "DATE", label: "DATE" },
          { value: "TIME", label: "TIME" },
          { value: "INTERVAL", label: "INTERVAL" },
          { value: "BOOLEAN", label: "BOOLEAN" },
          { value: "UUID", label: "UUID" },
          { value: "XML", label: "XML" },
          { value: "JSON", label: "JSON" },
          { value: "JSONB", label: "JSONB" },
          { value: "ARRAY", label: "ARRAY" },
          { value: "CIDR", label: "CIDR" },
          { value: "INET", label: "INET" },
          { value: "MACADDR", label: "MACADDR" },
          { value: "BIT", label: "BIT" },
          { value: "TSVECTOR", label: "TSVECTOR" },
          { value: "TSQUERY", label: "TSQUERY" }
        ],
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
      type: PostgresOutput.Type,
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
          name: PostgresOutput.Name,
          ConfigForm: PostgresOutput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: PostgresOutput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('psycopg2-binary');
    return deps;
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import sqlalchemy", "import psycopg2"];
  }

  public generateComponentCode({ config, inputName }): string {
    const connectionString = `postgresql://${config.dbOptions.username}:${config.dbOptions.password}@${config.dbOptions.host}:${config.dbOptions.port}/${config.dbOptions.databaseName}`;
    const uniqueEngineName = `${inputName}Engine`;
    let mappingsCode = "";
    let columnsCode = "";
  
    const selectedColumns = config.mapping
      .filter(map => map.value !== null && map.value !== undefined && map.input?.value !== null && map.input?.value !== undefined)
      .map(map => `"${map.value}"`)
      .join(', ');
  
    if (config.mapping && config.mapping.length > 0) {
      const renameMap = config.mapping
        .filter(map => map.input && (map.input.value || typeof map.input.value === 'number'))
        .map(map => {
          if (map.input.value != map.value) {
            if (map.input.named) {
              return `"${map.input.value}": "${map.value}"`; // Handles named columns
            } else {
              return `${map.input.value}: "${map.value}"`; // Handles numeric index
            }
          }
          return undefined; // Explicitly return undefined for clarity
        })
        .filter(value => value !== undefined); // Remove undefined values
  
      if (renameMap.length > 0) {
        mappingsCode = `
# Rename columns based on the mapping
${inputName} = ${inputName}.rename(columns={${renameMap.join(", ")}})
`;
    }

    if (selectedColumns !== '' && selectedColumns !== undefined) {
      columnsCode = `
# Only keep relevant columns
${inputName} = ${inputName}[[${selectedColumns}]]
`;
    }
  }

  const ifExistsAction = config.ifTableExists === "fail" ? "fail" : "replace";

  const code = `
# Connect to Postgres and output into table
${uniqueEngineName} = sqlalchemy.create_engine("${connectionString}")
${mappingsCode}${columnsCode}
${inputName}.to_sql(
  name="${config.dbOptions.tableName}",
  con=${uniqueEngineName},
  if_exists="${ifExistsAction}",
  index=False
)
`;
    return code;
  }
  

}
