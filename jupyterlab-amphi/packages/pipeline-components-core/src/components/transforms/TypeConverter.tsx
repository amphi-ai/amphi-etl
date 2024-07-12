import { typeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class TypeConverter extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { dataType: "string" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "column",
          label: "Column name",
          id: "column",
          placeholder: "Column name",
        },
        {
          type: "cascader",
          label: "Data Type to convert to",
          id: "dataType",
          placeholder: "Select ...",
          onlyLastValue: true,
          options: [
            {
              value: "numeric",
              label: "Numeric",
              children: [
                {
                  value: "int",
                  label: "Integer",
                  children: [
                    { value: "int64", label: "int64: Standard integer type." },
                    { value: "int32", label: "int32: For optimized memory usage." },
                    { value: "int16", label: "int16: For more optimized memory usage." },
                    { value: "int8", label: "int8: For more optimized memory usage." },
                    { value: "uint64", label: "uint64: Unsigned integer (can only hold non-negative values)" },
                    { value: "uint32", label: "uint32: For more optimized memory usage." },
                    { value: "uint16", label: "uint16: For more optimized memory usage." },
                    { value: "uint8", label: "uint8: For more optimized memory usage." }
                  ]
                },
                {
                  value: "float",
                  label: "Float",
                  children: [
                    { value: "float64", label: "float64: Standard floating-point type." },
                    { value: "float32", label: "float32: For optimized memory usage." },
                    { value: "float16", label: "float16: For optimized memory usage." }
                  ]
                }
              ]
            },
            {
              value: "text",
              label: "Text",
              children: [
                { value: "string", label: "string: For string data. (recommended)" },
                { value: "object", label: "object: For generic objects (strings, timestamps, mixed types)." },
                { value: "category", label: "category: For categorical variables." }
              ]
            },
            {
              value: "datetime",
              label: "Date & Time",
              children: [
                { value: "datetime64[ns]", label: "datetime64[ns]: For datetime values." },
                { value: "datetime64[ms]", label: "datetime64[ms]: For datetime values in milliseconds." },
                { value: "datetime64[s]", label: "datetime64[s]: For datetime values in seconds." },
                { value: "datetime32[ns]", label: "datetime32[ns]: For compact datetime storage in nanoseconds." },
                { value: "datetime32[ms]", label: "datetime32[ms]: For compact datetime storage in milliseconds." },
                { value: "timedelta[ns]", label: "timedelta[ns]: For differences between two datetimes." }
              ]
            },
            {
              value: "boolean",
              label: "Boolean",
              children: [
                { value: "bool", label: "bool: For boolean values (True or False)." }
              ]
            }
          ]
        }
      ],
    };

    super("Type Converter", "typeConverter", "pandas_df_processor", [], "transform", typeIcon, defaultConfig, form);
  }

  public provideImports({config}): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const columnName = config.column.value;
    const columnType = config.column.type;
    const columnNamed = config.column.named;
    const dataType = config.dataType[config.dataType.length - 1];

    let code = `\n\n# Initialize the output DataFrame\n`;
    code += `${outputName} = ${inputName}.copy()\n`;
    code += `# Convert ${columnName} from ${columnType} to ${dataType}\n`;

    code += this.generateConversionCode(inputName, outputName, columnName, columnType, dataType, columnNamed);

    return code;
}

private generateConversionCode(inputName: string, outputName: string, columnName: string, columnType: string, dataType: string, columnNamed: boolean): string {
  let conversionFunction: string;
  let additionalParams = "";

  if (dataType.startsWith("datetime")) {
      if (dataType.includes("[")) {
          const unit = dataType.split("[")[1].split("]")[0];
          additionalParams = `, unit="${unit}"`;
      }
      conversionFunction = `pd.to_datetime(${inputName}["${columnName}"]${additionalParams})`;
      if (columnNamed) {
          return `${outputName}["${columnName}"] = ${conversionFunction}\n`;
      } else {
          return `${outputName}.iloc[:, ${columnName}] = ${conversionFunction}\n`;
      }
  } else if (columnType.startsWith("float") && dataType.startsWith("int")) {
      conversionFunction = `${inputName}["${columnName}"].astype("float").fillna(0).astype("${dataType}")`;
      if (columnNamed) {
          return `${outputName}["${columnName}"] = ${conversionFunction}\n`;
      } else {
          return `${outputName}.iloc[:, ${columnName}] = ${conversionFunction}\n`;
      }
  } else {
      conversionFunction = `astype("${dataType}")`;
      if (columnNamed) {
          return `${outputName}["${columnName}"] = ${inputName}["${columnName}"].${conversionFunction}\n`;
      } else {
          return `${outputName}.iloc[:, ${columnName}] = ${inputName}.iloc[:, ${columnName}].${conversionFunction}\n`;
      }
  }
}
  
}