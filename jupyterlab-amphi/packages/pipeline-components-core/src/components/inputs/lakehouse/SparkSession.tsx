import { codeIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';



export class SparkSession extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { spark_config: "", input_lib: "", spark_tablename:""};
    const form = {
      fields: [
        {
          type: "info",
          label: "Instructions",
          id: "instructions",
          text: "Declare config to initialize spark session for pipeline...",
        },
        {
          type: "codeTextarea",
          label: "Add python library",
          height: '150px',
          mode: "python",
          placeholder: 'Input python library',
          id: "input_lib",
          tooltip: 'Additional libraries used when initializing spark session',
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "Spark config",
          height: '300px',
          mode: "python",
          placeholder: 'Init spark session.... ',
          id: "spark_config",
          tooltip: 'spark = SparkSession.builder \
                    .appName("session_sample") \
                    .master("local[*]") \
                    .getOrCreate()',
          advanced: true
        }
      ],
    };

    super("Init SparkSession", "SparkSession", "spark_ss_input", [], "Lakehouse", codeIcon, defaultConfig, form);
  }
  
    public provideImports({config}): string[] {
      return ["import pandas as pd","from pyspark.sql import SparkSession","from pyspark.sql.functions import *"];
    }  

    public generateComponentCode({ config, outputName }): string {
      let connectionString = config.spark_config;
      let add_lidString = config.input_lib;
      const code = `
      
${add_lidString}
try:
    ${outputName} = ${connectionString}
    print("SparkSession created successfully")
    print(f"App Name: {${outputName}.sparkContext.appName}")
    print(f"Master: {${outputName}.sparkContext.master}")
    print(f"Spark Version: {${outputName}.version}")
except Exception as e:
    print("Error creating SparkSession:", e)
`;
      return code;
    }
  }