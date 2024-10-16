import { codeIcon } from '../../../icons';
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

    super("Spark load table", "SparkLoadTable", "spark_load_input", [], "Lakehouse", codeIcon, defaultConfig, form);
  }
  
    public provideImports({config}): string[] {
      return [""];
    }  

    public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
      let schemaTable = `'${config.schemaName}.${config.tableName}'`;
      const code = `
      
try:
    ${outputName} = ${inputName}.read.format("iceberg").load(${schemaTable})
    ${outputName} = ${outputName}.pandas_api()
except Exception as e:
    print("Error load table:", e)

`;
      return code;
    }
    
  }