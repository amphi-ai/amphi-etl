
import { calendarIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class ClickhouseOutput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      host: "localhost",
      port: "8123",
      databaseName: "default",
      tableName: "",
      username: "default",
      password: "",
      ifTableExists: "fail",
      mode: "insert"
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Host",
          id: "host",
          placeholder: "Enter ClickHouse host",
          connection: "ClickHouse",
          advanced: true
        },
        {
          type: "input",
          label: "Port",
          id: "port",
          placeholder: "Enter ClickHouse port (usually 8123 or 9000)",
          connection: "ClickHouse",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          connection: "ClickHouse",
          placeholder: "Enter database name (default: 'default')"
        },
        {
          //type: "input",
          type: "table",
          label: "Table Name",
          query: `SELECT name FROM system.tables where database='{{database}}';`,
          id: "tableName",
          connection: "ClickHouse",
          placeholder: "Enter table name",
          advanced: true
        },
        {
          type: "input",
          label: "Username",
          id: "username",
          placeholder: "Enter username (default: 'default')",
          connection: "ClickHouse",
          advanced: true
        },
        {
          type: "input",
          inputType: "password",
          label: "Password",
          id: "password",
          connection: "ClickHouse",
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
          imports: ["clickhouse_connect"],
          drivers: "clickhouse_driver",
          query: `SHOW COLUMNS FROM {{table}};`,
          pythonExtraction: `column_info = schema[["field", "type"]]\nformatted_output = ", ".join([f"{row['field']} ({row['type']})" for _, row in column_info.iterrows()])\nprint(formatted_output)`,
          //pythonExtraction: `print("Available columns in ClickHouse table:")`,
          typeOptions: [
            { value: "UInt8", label: "UInt8" },
            { value: "UInt16", label: "UInt16" },
            { value: "UInt32", label: "UInt32" },
            { value: "UInt64", label: "UInt64" },
            { value: "Int8", label: "Int8" },
            { value: "Int16", label: "Int16" },
            { value: "Int32", label: "Int32" },
            { value: "Int64", label: "Int64" },
            { value: "Float32", label: "Float32" },
            { value: "Float64", label: "Float64" },
            { value: "Decimal", label: "Decimal" },
            { value: "Boolean", label: "Boolean" },
            { value: "String", label: "String" },
            { value: "FixedString", label: "FixedString" },
            { value: "UUID", label: "UUID" },
            { value: "Date", label: "Date" },
            { value: "DateTime", label: "DateTime" },
            { value: "DateTime64", label: "DateTime64" },
            { value: "Enum8", label: "Enum8" },
            { value: "Enum16", label: "Enum16" },
            { value: "Array", label: "Array" },
            { value: "Tuple", label: "Tuple" },
            { value: "Nested", label: "Nested" },
            { value: "Nullable", label: "Nullable" },
            { value: "LowCardinality", label: "LowCardinality" },
            { value: "SimpleAggregateFunction", label: "SimpleAggregateFunction" },
            { value: "AggregateFunction", label: "AggregateFunction" }
          ],
          advanced: true
        }
      ],
    };

    const description = "Use ClickHouse Output to insert data into a ClickHouse table by specifying a data mapping between the incoming data and the existing table schema."

    super("ClickHouse Output", "clickhouseOutput", description, "pandas_df_output", [], "outputs.Databases", calendarIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    //return ['clickhouse-connect'];
    return ['clickhouse_connect', 'clickhouse_driver'];
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import clickhouse_connect"];
  }

  public generateDatabaseConnectionCode({ config, connectionName }): string { 

   const port = parseInt(config.port, 10);
   const safePort = isNaN(port) ? 8123 : port;
   console.log("safePort 22", safePort);  
   console.log("config.port 33", config.port);  
   // # Connect to ClickHouse 
   return `clickhouse_connect.get_client(
  host='${config.host}', port='${config.port}', username='${config.username}', password='${config.password}', database='${config.databaseName}'
)
`;
  } 

  public generateComponentCode({ config, inputName }): string {

    const uniqueEngineName = `${inputName}Client`;

    const port = parseInt(config.port, 10);
    const safePort = isNaN(port) ? 8123 : port;

    console.log("config.port 00", config.port);
    console.log("config.port 11", safePort);

    let mappingsCode = "";
    let columnsCode = "";

    // Handle column mapping if provided
    if (config.mapping && config.mapping.length > 0) {
      const renameMap = config.mapping
        .filter(map => map.input && (map.input.value || typeof map.input.value === 'number') && map.value)
        .map(map => {
          if (map.input.value !== map.value) {
            if (map.input.named) {
              return `"${map.input.value}": "${map.value}"`;
            } else {
              return `${map.input.value}: "${map.value}"`;
            }
          }
          return null;
        })
        .filter(value => value !== null);

      if (renameMap.length > 0) {
        mappingsCode = `
# Rename columns based on the mapping
${inputName} = ${inputName}.rename(columns={${renameMap.join(", ")}})
`;
      }

      const selectedColumns = config.mapping
        .filter(map => map.value !== null && map.value !== undefined && map.value !== "")
        .map(map => `"${map.value}"`)
        .join(', ');

      if (selectedColumns) {
        columnsCode = `
# Select only mapped columns
${inputName} = ${inputName}[[${selectedColumns}]]
`;
      }
    }

    const tableName = config.tableName.value || config.tableName;
    const ifExistsAction = config.ifTableExists;

    return `
# Connect to ClickHouse 
print(f"OLE OLE Connecting to ClickHouse at ${config.host}:${safePort} with database '${config.databaseName}'")
${inputName}Client = ${this.generateDatabaseConnectionCode({ config, connectionName: uniqueEngineName })}
print(f"Connected to ClickHouse client: {${inputName}Client}")

${mappingsCode}${columnsCode}
# Write DataFrame to ClickHouse
try:
    # Insert data using ClickHouse native method
    if "delete_this_string_when_exporting_code" == "delete_this_string_when_exporting_code":
      ${inputName}Client.insert_df("${tableName}", ${inputName})
      print(f"Successfully inserted {len(${inputName})} rows into ClickHouse table '${tableName}'")  
    else:
        # Fallback to using SQL INSERT statements (less efficient)
        columns = list(input_data.columns)
        column_str = ', '.join(columns)
        # Insert data using ClickHouse native method
        batch_size = 5000  # Adjust based on your needs
        for i in range(0, len(input_data), batch_size):
          batch = input_data.iloc[i:i+batch_size]
           
          values_list = []
          for _, row in batch.iterrows():
              values = []
              for col in columns:
                  val = row[col]
                  if isinstance(val, str):
                      val = val.replace("'", "''")
                      values.append(f"'{val}'")
                  #elif isinstance(val, (pd.Timestamp, datetime.datetime)):
                  #    # Format the date and wrap it in quotes. This is what the 'isinstance(val, str)' check should #have done.
                  #    val_str = val.strftime('%Y-%m-%d %H:%M:%S')
                  #    values.append(f"'{val_str}'")    
                  #elif isinstance(val, datetime):   
                  #    values.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
                  elif pd.isna(val):
                      values.append("NULL")
                  else:
                      values.append(str(val))
              values_list.append(f"({', '.join(values)})")
            
          values_str = ', '.join(values_list)
          sql = f"INSERT INTO ${tableName} ({column_str}) VALUES {values_str}" 
          input_dataClient.command(sql) 
        print(f"Successfully inserted {len(${inputName})} rows into ClickHouse table '${tableName}'")    
 
except Exception as e:
    print(f"Error inserting data into ClickHouse: {e}")
    ${inputName}Client.close()
    raise
finally:
    # close the clickhouse connection
    ${inputName}Client.close()    
#return pd.DataFrame()  # Return empty DataFrame as output        
`;
  }


// I STILL CLOSE IT HERE, BECAUSE IF WE DON'T CLOSE IT HERE, THEN THE AMPHI UI WILL NOT WORK GOOD
// BUT WHEN EXPORTING CODE, I REMOVE THIS LINE ( finally: ${inputName}Client.close()), SO THE CONNECTION IS CLOSED ONLY ONCE, IN PipelineEditorWidget.tsx

// We are closing all the connections to Clickhouse inside PipelineEditorWidget.tsx, inside function handleExportToDagster
// The reason is that we want to close the connection only once, after all components are executed. 
// If we close the connection inside PipelineEditorWidget.tsx, we would close it only once, after all components are executed.    
 
}
