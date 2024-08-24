import { trinoIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { Connection } from '../../settings/Connection';


export class SparkLoadTable extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { condition: "==" };
    const form = {
      fields: [
        {
          type: "input",
          label: "Schema name",
          id: "schemaName",
          placeholder: "Enter schema name",
          connection: 'SparkSchema',
          advanced: true
        },
        {
          type: "input",
          label: "Table Name",
          id: "tableName",
          placeholder: "Enter table name",
        },
      ],
    };

    super("Spark load table", "SparkLoadTable", "pandas_df_processor", [], "inputs.Lakehouse", trinoIcon, defaultConfig, form);
  }
  
    public provideImports({config}): string[] {
      return [""];
    }  

    public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
      let schemaTable = `'${config.schemaName}.${config.tableName}'`;
      const code = `
      
try:
    df = ${inputName}.read.format("iceberg").load(${schemaTable})
    ${outputName} = ps.DataFrame(df)
except Exception as e:
    print("Error load table:", e)

`;
      return code;
    }
    
  }