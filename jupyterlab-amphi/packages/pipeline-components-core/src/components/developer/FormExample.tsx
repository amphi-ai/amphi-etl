// Import necessary icons and the BaseCoreComponent class.
// Ensure the correct folder hierarchy is used (e.g., input/xx/yy...)
import { formexampletypescriptIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

// Main class definition
export class FormExample extends BaseCoreComponent {
  // Constructor initializes the form structure
  constructor() {
    const defaultConfig = {};
    
    const form = {
      idPrefix: "component__form",
      fields: [
        // Form fields are displayed sequentially.
        // Each form has a type, label, tooltip, and additional properties.
        // Available form types are defined in:
        // amphi-etl\jupyterlab-amphi\packages\pipeline-components-manager\src\forms
        
        // Informational sections
        {
          type: "info",
          id: "description",
          text: "This component serves as an example showcasing all types of data entry forms available with Amphi. ⚠️ It is not intended for use as part of a pipeline.",
          advanced: false
        },
        {
          type: "info",
          id: "instructions",
          text: "1. Informational text to show in the component.",
		      advanced: true
        },
        {
          type: "radio",
          label: "2. File Location (radio)",
          id: "fileLocation",
		  //options : value on the radio button
          options: [
            { value: "local", label: "Local" },
            { value: "http", label: "HTTP" },
            { value: "s3", label: "S3" },
            { value: "option4", label: "Option 4" }
          ],
          advanced: true
        },
        {
          type: "file",
          label: "3. File path (file)",
          id: "filePath",
          placeholder: "Type file name or use '*' for patterns",
          tooltip: "Provide a single CSV file path or use '*' for matching multiple files. Extensions accepted: .csv, .tsv, .txt. Can also read CSV files compressed as .gz, .bz2, .zip, .xz, .zst.",
          validation: "^(.*(\\.csv|\\.tsv|\\.txt))$|^(.*\\*)$",
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "4. Separator (selectCustomizable)",
          id: "csvOptions.sep",
          placeholder: "default: ,",
          tooltip: "Select or provide a custom delimiter.",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" },
            { value: "\\t", label: "tab" },
            { value: "|", label: "pipe (|)" },
            { value: "infer", label: "infer (tries to auto detect)" }
          ],
          advanced: true
        },
        {
          type: "inputNumber",
          tooltip: "Number of rows of file to read. Useful for reading pieces of large files.",
          label: "5. Rows number (inputNumber)",
          id: "csvOptions.nrows",
          placeholder: "Default: all",
          min: 0,
          advanced: true
        },
        {
          type: "selectTokenization",
          tooltip: "Sequence of column labels to apply.",
          label: "6. Column names (selectTokenization)",
          id: "csvOptions.names",
          placeholder: "Type header fields (ordered and comma-separated)",
          options: [],
          advanced: true
        },
        {
          type: "input",
          label: "7. Wrapper Character (input)",
          id: "csvOptions.quotechar",
          tooltip: "Defines the character used to wrap fields containing special characters like the delimiter or newline.",
          advanced: true
        },
        {
          type: "select",
          label: "8. On Bad Lines (select)",
          id: "csvOptions.on_bad_lines",
          placeholder: "Error: raise an Exception when a bad line is encountered",
          options: [
            { value: "error", label: "Error", tooltip: "Raise an Exception when a bad line is encountered" },
            { value: "warn", label: "Warn", tooltip: "Raise a warning when a bad line is encountered and skip that line." },
            { value: "skip", label: "Skip", tooltip: "Skip bad lines without raising or warning when they are encountered." }
          ],
          advanced: true
        },
        {
          type: "keyvalue",
          label: "9. Storage Options (keyvalue)",
          id: "csvOptions.storage_options",
          condition: { fileLocation: ["http", "s3"] },
          advanced: true
        },
        {
          type: "transferData",
          label: "10. Filter columns (transferData)",
          id: "columns",
          advanced: true
        },
        {
          type: "columns",
          label: "11. Left Input Column(s) (columns)",
          id: "leftKeyColumn",
          placeholder: "Column name",
          tooltip: "If you're joining by multiple columns, make sure the column lists are ordered to match the corresponding columns in the right dataset.",
          inputNb: 1,
          advanced: true
        },
        {
          type: "keyvalueColumns",
          label: "12. Columns (keyvalueColumns)",
          id: "columns",
          placeholders: { key: "column name", value: "new column name" },
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "13. Imports (codeTextarea)",
          id: "import",
          placeholder: "import langchain ...",
          height: '50px',
          advanced: true
        },
        {
          type: "textarea",
          label: "14. Body (textarea)",
          id: "body",
          placeholder: "Write body in JSON",
          advanced: true
        },
        {
          type: "table",
          label: "15. Table Name (table)",
          query: `SHOW TABLES;`,
          id: "tableName",
          placeholder: "Enter table name",
          condition: { queryMethod: "table" },
          advanced: true
        },
        {
          type: "boolean",
          label: "16. Auto Commit (boolean)",
          tooltip: "Setting autocommit True will cause the database to issue a commit after each SQL statement, otherwise database transactions will have to be explicity committed. As per the Python DB API, the default value is False (even though the ODBC default value is True). Typically, you will probably want to set autocommit True when creating a connection.",
          id: "autoCommit",
          advanced: true
         },
        {
          type: "valuesList",
          label: "17. URLs (valuesList)",
          id: "urls",
          placeholders: "Enter URLs",
          advanced: true
        },
        {
          type: "sheets",
          label: "18. Sheets (sheets)",
          id: "excelOptions.sheet_name",
          placeholder: "Default: 0 (first sheet)",
          tooltip: "Select one or multiple sheets. If multiple sheets are selected, the sheets are concatenated to output a single dataset.",
          condition: { fileLocation: "local"},
          advanced: true
        },
        {
          type: "dataMapping",
          label: "19. Mapping (dataMapping)",
          id: "mapping",
          tooltip: "By default, the mapping is inferred from the input data. By specifying a schema, you override the incoming schema.",
          outputType: "relationalDatabase",
          imports: ["pyodbc"],
          drivers: "mssql",
          query: `
SELECT 
    COLUMN_NAME AS "Field",
    DATA_TYPE AS "Type",
    IS_NULLABLE AS "Null",
    COLUMN_DEFAULT AS "Default",
    '' AS "Extra"
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{{table}}' AND TABLE_SCHEMA = 'dbo';
`,
         typeOptions: [
         { value: "INT", label: "INT" },
         { value: "VARCHAR", label: "VARCHAR" },
         { value: "NVARCHAR", label: "NVARCHAR" },
         { value: "TEXT", label: "TEXT" },
         { value: "DATETIME", label: "DATETIME" },
         { value: "DATE", label: "DATE" },
         { value: "FLOAT", label: "FLOAT" },
         { value: "DECIMAL", label: "DECIMAL" },
         { value: "BIT", label: "BIT" },
         { value: "BIGINT", label: "BIGINT" },
         { value: "SMALLINT", label: "SMALLINT" },
         { value: "TINYINT", label: "TINYINT" },
         { value: "CHAR", label: "CHAR" },
         { value: "NCHAR", label: "NCHAR" },
         { value: "NTEXT", label: "NTEXT" },
         { value: "BINARY", label: "BINARY" },
         { value: "VARBINARY", label: "VARBINARY" },
         { value: "IMAGE", label: "IMAGE" },
         { value: "UNIQUEIDENTIFIER", label: "UNIQUEIDENTIFIER" },
         { value: "XML", label: "XML" },
         { value: "TIME", label: "TIME" },
         { value: "DATETIME2", label: "DATETIME2" },
         { value: "DATETIMEOFFSET", label: "DATETIMEOFFSET" },
         { value: "SMALLDATETIME", label: "SMALLDATETIME" },
         { value: "REAL", label: "REAL" },
         { value: "MONEY", label: "MONEY" },
         { value: "SMALLMONEY", label: "SMALLMONEY" },
                    ],
          advanced: true
        },
        {
          type: "cascader",
          label: "20. Data Type to convert to (cascader)",
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
          ],
          advanced: true
        },
        {
          type: "keyvalueColumnsRadio",
          label: "21. Columns Sorting Order(keyvalueColumnsRadio)",
          id: "columnAndOrder",
          options: [
            { value: "True", label: "Asc." },
            { value: "False", label: "Desc." }
          ],
          advanced: true
        },
        {
          type: "selectMultipleCustomizable",
          label: "22. Remove Unwanted Characters (selectMultipleCustomizable)",
          id: "removeUnwantedCharacters",
          options: [
            { value: "whitespace", label: "Leading and Trailing Whitespace" },
            { value: "tabs", label: "Tabs" },
            { value: "Line breaks", label: "Line Breaks" },
            { value: "allwhitespace", label: "All Whitespace" },
            { value: "letters", label: "All Letters" },
            { value: "numbers", label: "All Numbers" },
            { value: "punctuation", label: "Punctuation" }
          ],
          advanced: true
        },
        {
          type: "keyvalueColumnsSelect",
          label: "23. Operations (keyvalueColumnsSelect)",
          id: "columnsOperations",
          placeholder: "Select column",
          options: [
            { value: "min", label: "Min", tooltip: "Returns the minimum value in the group." },
            { value: "max", label: "Max", tooltip: "Returns the maximum value in the group." },
            { value: "sum", label: "Sum", tooltip: "Returns the sum of all values in the group." },
            { value: "mean", label: "Mean", tooltip: "Returns the average value of the group." },
            { value: "count", label: "Count", tooltip: "Counts the number of non-null entries." },
            { value: "nunique", label: "Distinct Count", tooltip: "Returns the number of distinct elements." },
            { value: "first", label: "First", tooltip: "Returns the first value in the group." },
            { value: "last", label: "Last", tooltip: "Returns the last value in the group." },
            { value: "median", label: "Median", tooltip: "Returns the median value in the group." },
            { value: "std", label: "Standard Deviation", tooltip: "Returns the standard deviation of the group." },
            { value: "var", label: "Variance", tooltip: "Returns the variance of the group." },
            { value: "prod", label: "Product", tooltip: "Returns the product of all values in the group." }
          ],
		  advanced: true
        }
      ]
          
    };
    // Component description for tooltips in the menu
    const description = "Form examples";
    
    // Super constructor call with necessary parameters
    // 1. Do not forget to add the icon in amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\icons.ts and in amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\style\icons.
    super("Form Example", "form_example", description, "pandas_df_processor", [], "developer", formexampletypescriptIcon, defaultConfig, form);
  }

  // List of additional Python packages required (if any)
  public provideImports({ config }): string[] {
    return [];
  }

  // Generates the Python code for processing the form input
  public generateComponentCode({ config, inputName, outputName }): string {
    let columnsParam = "{";
    if (config.columns && config.columns.length > 0) {
      columnsParam += config.columns.map(column => {
        if (column.key.named) {
          return `"${column.key.value}": "${column.value}"`;
        } else {
          return `${column.key.value}: "${column.value}"`;
        }
      }).join(", ");
      columnsParam += "}";
    } else {
      columnsParam = "{}"; // Ensure columnsParam is always initialized
    }

    // Template for outputting the input data
    const code = `
${outputName} = ${inputName}
`;
    return code;
  }
}