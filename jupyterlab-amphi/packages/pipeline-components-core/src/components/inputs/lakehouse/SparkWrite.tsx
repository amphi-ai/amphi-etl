import { codeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';


export class SparkWrite extends BaseCoreComponent {
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
    
        super("Spark write table", "SparkWriteTable", "pandas_df_output", [], "Lakehouse", codeIcon, defaultConfig, form);
    }
  
    public provideImports({config}): string[] {
      return [""];
    }  

    public generateComponentCode({ config, inputName }): string {
        let schemaTable = `'${config.schemaName}.${config.tableName}'`;
        const code = `
${inputName} = ${inputName}.to_spark()
${inputName}.write.format("iceberg").mode("append").save(${schemaTable}) 
`;
      return code;
    }
}