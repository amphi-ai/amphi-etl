// Import necessary icons and the BaseCoreComponent class.
// Ensure the correct folder hierarchy is used (e.g., input/xx/yy...). Built-in component only.
import { typescriptIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

// Main class definition for built-in component
export class FormExample extends BaseCoreComponent {
// Main class definition for custom component (deactivated). Do not keep comments before, it will break !
//class FormExampleCustom extends (globalThis as any).Amphi.BaseCoreComponent {
  
  // Constructor initializes the form structure
  constructor() {
	//this is here where you set the default values of form. but choose either default value or placeholder
	//it's highly recommanded to always set a default value when applicable
    const defaultConfig = {
		                   //id of the form : default value (depends of Type)
						   tsCFradioFileLocation : "local",
						   tsCFfileFilePath : "",
						   tsCFselectCustomizableCSVOptionsSep: ";",
                           tsCFinputNumberCSVOptionsNRowsWithDefaultValue : "18",
						   //tsCFselectTokenizationCSVOptionsNames :
						   tsCFinputCSVOptionsQuoteChar : ",", 
						   tsCFselectCSVOptionsOnBadLines : "",
                           tsCFcolumnDefaultValueColumn : [],
						   tsCFbooleanAutoCommit : true, //or false
                           tsCFselectMultipleCustomizableRemoveUnwantedCharacters:[],
      			   		   tsCFselectMultipleDateType:["Date"],
                           tsCFcascaderDataType:[""]
                           };
    
    const form = {
      idPrefix: "component__form",
      fields: [
        // Form fields are displayed sequentially.
        // Each form has a type, label, tooltip, and additional properties.
        // Available form types are defined in:
        // amphi-etl\jupyterlab-amphi\packages\pipeline-components-manager\src\forms
        // Ensure that you follow the naming convention.
        // Informational sections
		
		//common attribute : 
		//advanced : true by default, require to click on the button. false is displayed in the flow
		//placeholder : a text that is displayed (but it's not a value)
		//condition : if specified, when its displayed. By default, always. Keep in mind that even if not displayed, the value is kept.
        {
          type: "info",
          id: "tsCFinfoDescription",
          text: "This component serves as an example showcasing all types of data entry forms available with Amphi.⚠️It is not intended for use as part of a pipeline.",
          advanced: false
        },
        {
          type: "info",
          id: "tsCFinfoMiscInfo",
          text: "You can find the types in amphi-etl/jupyterlab-amphi/packages/pipeline-components-manager/src/configUtils.tsx",
          advanced: true
        },
        {
          type: "info",
          id: "tsCFinfoInstructions",
          text: "1. Informational text to show in the component. Sheet name (21) are mandatory to run. An input is also required.",
          advanced: true
        },
        {
          type: "radio",
          label: "2. File Location (radio)",
          id: "tsCFradioFileLocation",
          //options : value on the radio button
          options: [
            { value: "local", label: "Local" },
            { value: "http", label: "HTTP" },
            { value: "s3", label: "S3" }
          ],
          advanced: true
        },
        {
          type: "file",
          label: "3. File path (file)",
          id: "tsCFfileFilePath",
          placeholder: "Type file name or use '*' for patterns",
          tooltip: "Provide a single CSV file path or use '*' for matching multiple files. Extensions accepted: .csv, .tsv, .txt. Can also read CSV files compressed as .gz, .bz2, .zip, .xz, .zst.",
          validation: "^(.*(\\.csv|\\.tsv|\\.txt))$|^(.*\\*)$",
          advanced: true
        },
        {
          type: "inputNumber",
          tooltip: "Number of rows of file to read. Useful for reading pieces of large files.",
          label: "4. Rows number without a default value(inputNumber)",
          id: "tsCFinputNumberCSVOptionsNRows",
          placeholder: "Default: all",
          min: 0,
          columnId: 1,
          advanced: true
        },
		{
          type: "inputNumber",
          tooltip: "Number of rows of file to read. Useful for reading pieces of large files.",
          label: "5. Rows number with a default value (inputNumber)",
          id: "tsCFinputNumberCSVOptionsNRowsWithDefaultValue",
          min: 0,
		  columnId: 1,
          advanced: true
        },
        {
          type: "selectTokenization",
          tooltip: "Sequence of column labels to apply.",
          label: "6. Column names (selectTokenization)",
          id: "tsCFselectTokenizationCSVOptionsNames",
          placeholder: "Type header fields (ordered and comma-separated)",
          options: [],
          advanced: true
        },
        {
          type: "input",
          label: "7. Wrapper Character (input)",
          id: "tsCFinputCSVOptionsQuoteChar",
          tooltip: "Defines the character used to wrap fields containing special characters like the delimiter or newline.",
          advanced: true
        },
		{
          type: "input",
          label: "8. Password (input)",
          id: "tsCFinputPassword",
          placeholder: "Enter password",
          inputType: "password",
          advanced: true
        },
        {
          type: "select",
          label: "9. On Bad Lines (select)",
          id: "tsCFselectCSVOptionsOnBadLines",
          placeholder: "Error: raise an Exception when a bad line is encountered",
          options: [
            { value: "error", label: "Error", tooltip: "Raise an Exception when a bad line is encountered" },
            { value: "warn", label: "Warn", tooltip: "Raise a warning when a bad line is encountered and skip that line." }
          ],
		  columnId: 2,
          advanced: true
        },
        {
          type: "selectCustomizable",
          label: "10. Separator (selectCustomizable)",
          id: "tsCFselectCustomizableCSVOptionsSep",
          placeholder: "default: ,",
          tooltip: "Select or provide a custom delimiter.",
          options: [
            { value: ",", label: "comma (,)" },
            { value: ";", label: "semicolon (;)" },
            { value: " ", label: "space" }
          ],
		  columnId: 2,
          advanced: true
        },
		{
          type: "selectMultiple",
          label: "11. Date type (selectMultiple)",
          id: "tsCFselectMultipleDateType",
          options: [
            { value: "days", label: "Days" },
            { value: "years", label: "Years" },
            { value: "months", label: "Months" }
          ],
          advanced: true
        },
        {
          type: "selectMultipleCustomizable",
          label: "12. Remove Unwanted Characters (selectMultipleCustomizable)",
          id: "tsCFselectMultipleCustomizableRemoveUnwantedCharacters",
          options: [
            { value: "whitespace", label: "Leading and Trailing Whitespace" },
            { value: "tabs", label: "Tabs" },
            { value: "Line breaks", label: "Line Breaks" }
          ],
          advanced: true
        },		
        {
          type: "keyvalue",
          label: "13. Storage Options (keyvalue)",
          id: "tsCFkeyvalueCSVOptionsStorageOptions",
          advanced: true
        },
        {
          type: "transferData",
          label: "14. Filter columns (transferData)",
          id: "tsCFtransferDataFilterColumn",
          advanced: true
        },
        {
          type: "columns",
          label: "15. Select multiple Column(s) (columns)",
          id: "tsCFcolumnsLeftKeyColumn",
          placeholder: "Column name",
          tooltip: "Select multiple columns",
          inputNb: 1,
          advanced: true
        },
        {
          type: "keyvalueColumns",
          label: "16. Columns (keyvalueColumns)",
          id: "tsCFkeyvalueColumnsColumns",
          placeholders: { key: "column name", value: "new column name" },
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "17. Imports (codeTextarea)",
          id: "tsCFcodeTextareaImports",
          placeholder: "import langchain ...",
          height: '50px',
          advanced: true
        },
        {
          type: "textarea",
          label: "18. Body (textarea)",
          id: "tsCFtextareaJSONBody",
          placeholder: "Write body in JSON",
          advanced: true
        },
        {
          type: "table",
          label: "19. Table Name (table)",
          query: `SHOW TABLES;`,
          id: "tsCFtableTableName",
          placeholder: "Enter table name",
          condition: { queryMethod: "table" },
          advanced: true
        },
        {
          type: "boolean",
          label: "20. Auto Commit (boolean)",
          tooltip: "Auto commit for database",
          id: "tsCFbooleanAutoCommit",
          advanced: true
         },
        {
          type: "valuesList",
          label: "21. URLs (valuesList)",
          id: "tsCFvaluesListUrls",
          placeholders: "Enter URLs",
          advanced: true
        },
        {
          type: "sheets",
          label: "22. Sheets (sheets)",
          id: "tsCFsheetsExcelOptionsSheetName",
          placeholder: "Default: 0 (first sheet)",
          tooltip: "Select one or multiple sheets. If multiple sheets are selected, the sheets are concatenated to output a single dataset.",
          condition: { tsCFradioFileLocation: "local"},
          advanced: true
        },
        {
          type: "dataMapping",
          label: "23. Mapping (dataMapping)",
          id: "tsCFdataMappingmapping",
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
          label: "24. Data Type to convert to (cascader)",
          id: "tsCFcascaderDataType",
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
                    { value: "int16", label: "int16: For more optimized memory usage." }
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
                { value: "datetime64[s]", label: "datetime64[s]: For datetime values in seconds." }
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
          label: "25. Columns Sorting Order(keyvalueColumnsRadio)",
          id: "tsCFkeyvalueColumnsRadioColumnSortingOrder",
          options: [
            { value: "True", label: "Asc." },
            { value: "False", label: "Desc." }
          ],
          advanced: true
        },
        {
          type: "keyvalueColumnsSelect",
          label: "26. Operations (keyvalueColumnsSelect)",
          id: "tsCFkeyvalueColumnsSelectColumnsOperations",
          placeholder: "Select column",
          options: [
            { value: "min", label: "Min", tooltip: "Returns the minimum value in the group." },
            { value: "max", label: "Max", tooltip: "Returns the maximum value in the group." }
          ],
          advanced: true
        },
        {
          type: "column",
          label: "27. Select a single column (column)",
          id: "tsCFcolumnSelectColumn",
          placeholder: "Column name",
          advanced: true
        },
        {
          type: "column",
          label: "28. Select a single column (column) restricted to specific types (string, bool)",
          id: "tsCFcolumnTypeRestrictedColumn",
//types for allowedtype : 
//            numeric:  /^(u?int|float|complex|decimal)\d*$/i,
//              datetime: /^(datetime|timedelta|period|datetimetz)/i,
//  bool:     /^bool/i,
//  string:   /^(object|string)$/i,
//  category: /^category
          allowedTypes: ["string","bool"],
          placeholder: "Column name",
          advanced: true
        },
        {
          type: "column",
          label: "29. Select a single column with default value so that code can work when retrieving tsCFcolumnDefaultValueColumn.value even if not defined(column)",
          id: "tsCFcolumnDefaultValueColumn",
          placeholder: "Column name",
          advanced: true
        },
		{
          type: "date",
          label: "30. Select a Date (date)",
          id: "tsCFdateDatePicker",
          advanced: true
        },
        {
          type: "codeTextarea",
          label: "31. Code with AI (codeTextarea)",
          tooltip: "Use the dataframe 'output' as output, and 'input' as input",
          id: "tsCFcodeTextareaCodeWithAi",
          mode: "python",
          height: '300px',
          placeholder: "your amazing code here",
          aiInstructions: "Generate a Pandas script that return a DataFrame named 'output'. IMPORTANT: Ensure the code does not print or display anything. Include short comments for clarity.",
          aiGeneration: true,
          aiDataSample: false,
          aiPromptExamples: [
            { label: "Create input with dummy data", value: "Create a simple input with columns A,B,C and fill them with dummy data." },
            { label: "Size of my data", value: "Give me the size of my 'input' dataframe" }
          ],
          advanced: true,
        }	
      ]
          
    };
    // Component description for tooltips in the menu
    const description = "Form examples";
 
	//icon svg code, only for custom component, deactivated
    //const icon = {
    //  name: 'amphi-name-input-hello',
    //  svgstr:
    //    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z"/></svg>'
    //};

	
    // Super constructor call with necessary parameters
    // 1. Do not forget to add the icon in amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\icons.ts and in amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\style\icons.
    super(
	"Form Example", 				// Display name in the UI
	"form_example", 				// Component ID. Where is it used?
	description, 					// Description
	"pandas_df_processor",			// Component type
	[], 							// File drop. List of file extension that would create the tool if dropped. e.g. ["xlsx", "xls", "ods", "xlsb"] for ExcelFileInput 
	"developer", 					// Category in the UI
	typescriptIcon,					// Component icon as in export of icons.ts
	defaultConfig,					// Default configuration
	form 							// Form structure
	);
 
  	//for custom, icon changes
	//super("Form Example Custom", "form_example_custom", description, "pandas_df_processor", [], "developer", icon, defaultConfig, form);

  }
  
  
// List of additional Python packages required (if any).
//  Do not import in the python code or python function later to avoid duplication of import
  public provideImports({ config }): string[] {
    return [
"import pandas as pd",
"from typing import Dict, List,Union,Any"
];
  }


  // Define the Python function. Not mandatory but can help.
  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";

    const tsExampleFunction = `
def py_fn_example_python_function(
    py_arg_df: pd.DataFrame,
    py_arg_csv_options_nrows_with_default_value: int, 
    py_arg_csv_options_on_badlines: str = "mydefaultvalue",#here the default value of the function.In Python, arguments with default values must come after non-default arguments.
    py_arg_function_test_list: list = None,
    py_arg_function_test_dict: dict = None
) -> pd.DataFrame:

	#this is a doctring to document the function
    """
    Add two columns to a dataframe, and test two arguments
 
    Parameters
    ----------
    py_arg_df : pandas.DataFrame
        The input DataFrame.
    py_arg_csv_options_nrows_with_default_value : int or None, default None
        number of rows.
    py_arg_csv_options_on_badlines : str or None, default None
        what to do with badlines. 
    py_arg_function_test_list: a list that will be tested, default None
    py_arg_function_test_dict: a dict that will be tested, default None
	
    Returns
    -------
    pandas.DataFrame
        a dataframe with two more columns.
    """
	# Debug prints for types
    print("py_arg_function_test_list type:", type(py_arg_function_test_list))
    print("Is list:", isinstance(py_arg_function_test_list, list))

    print("py_arg_function_test_dict type:", type(py_arg_function_test_dict))
    print("Is dict:", isinstance(py_arg_function_test_dict, dict))
	
    result_df = py_arg_df.copy()  # avoid mutating original DataFrame
    result_df["new integer column"] = py_arg_csv_options_nrows_with_default_value
    result_df["new string column"] = py_arg_csv_options_on_badlines
	#convert to string (else object)
    result_df["new string column"] = result_df["new string column"].astype("string")
    return result_df

    `;

    return [tsExampleFunction];
  }


  // Generates the Python code for processing the form input

  public generateComponentCode({ config, inputName, outputName }): string {
  
    //constant declaration
	//this part is useful to transform your form data to something exploitable by Python
	//the form is usable with config.{id of your form}
	//sometimes you will have to use config.{id of your form}.value
    //please note a few things : 
    //-that typescript const/var will also be interpretated on commented lines
   //-you can use in your code config.column even if undefined but to use config.column.value, config.column has to be defined
   // since you can have None and "value", it's recommended to deal with quote in typescript.
   
   
   //for select, radio, input, date..
   //initialization to None
    let tsConstCSVOptionsOnBadLines = 'None';
    if (config.tsCFselectCSVOptionsOnBadLines && config.tsCFselectCSVOptionsOnBadLines.trim() !== '' 
	) {
      tsConstCSVOptionsOnBadLines = '"' + config.tsCFselectCSVOptionsOnBadLines+ '"';
    }	

	
    //for select multiple, select multiple customizable..
	//tsConstRemoveUnwantedCharacters gives something like ['tabs', 'whitespace'] in console and you want something like a list ["tabs","whitespace"]
	let tsConstRemoveUnwantedCharacters = 'None';
    if (config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters && config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters.length > 0
	) {
      tsConstRemoveUnwantedCharacters = JSON.stringify(config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters);
    }	
	let tsConsDateType = 'None';
    if (config.tsCFselectMultipleDateType && config.tsCFselectMultipleDateType.length > 0
	) {
      tsConsDateType = JSON.stringify(config.tsCFselectMultipleDateType);
    }	
	let tsConsselectTokenization = 'None';
    if (config.tsCFselectTokenizationCSVOptionsNames && config.tsConsselectTokenization[0].length !== 0 
	) {
      tsConsselectTokenization = JSON.stringify(config.tsCFselectTokenizationCSVOptionsNames);
    }		

	//for boolean
	let tsConstAutoCommit = config.tsCFbooleanAutoCommit ? 'True' : 'False';
	
    // for Column
	let tsConstSelectColumn = 'None';
	if (config.tsCFcolumnSelectColumn && config.tsCFcolumnSelectColumn.value.trim() !== '' 
	) {
      tsConstSelectColumn = '"' + config.tsCFcolumnSelectColumn.value+ '"';
    }
	let tsConstTypeRestrictedColumn = 'None';
	if (config.tsCFcolumnTypeRestrictedColumn && config.tsCFcolumnTypeRestrictedColumn.value.trim() !== '' 
	) {
      tsConstTypeRestrictedColumn = '"' + config.tsCFcolumnTypeRestrictedColumn.value+ '"';
    }
	
    //for columns,
	let tsConstLeftKeyColumn = "None";
    if (config.tsCFcolumnsLeftKeyColumn?.length > 0) {
      tsConstLeftKeyColumn = `[${config.tsCFcolumnsLeftKeyColumn
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	//for keyvalueColumnsRadioColumn,keyvalueColumns
	//it will be formatted as a python dict
	let tsConstSortingOrder = "None";
	if (config.tsCFkeyvalueColumnsRadioColumnSortingOrder && config.tsCFkeyvalueColumnsRadioColumnSortingOrder.length > 0) {
      tsConstSortingOrder = "{";
	  config.tsCFkeyvalueColumnsRadioColumnSortingOrder.forEach((op, index) => {
        // Determine how to reference the column based on 'named'
        const tsConstSortingOrdercolumnReference = op.key.value;
        const tsConstSortingOrderSort = op.value;
        // Construct each element argument
        tsConstSortingOrder += `"${tsConstSortingOrdercolumnReference}": "${tsConstSortingOrderSort}"`;
        if (index < config.tsCFkeyvalueColumnsRadioColumnSortingOrder.length - 1) {
          tsConstSortingOrder += ", ";
        }
      });
	  tsConstSortingOrder +=`}`;
    }
	
	let tsConstColumnswithkeys = "None";
	if (config.tsCFkeyvalueColumnsColumns && config.tsCFkeyvalueColumnsColumns.length > 0) {
      tsConstColumnswithkeys = "{";
	  config.tsCFkeyvalueColumnsColumns.forEach((op, index) => {
        // Determine how to reference the column based on 'named'
        const tsConstColumnswithkeyscolumnReference = op.key.value;
        const tsConstColumnswithkeyskey = op.value;
        // Construct each element argument
        tsConstColumnswithkeys += `"${tsConstColumnswithkeyscolumnReference}": "${tsConstColumnswithkeyskey}"`;
        if (index < config.tsCFkeyvalueColumnsColumns.length - 1) {
          tsConstColumnswithkeys += ", ";
        }
      });
	  tsConstColumnswithkeys +=`}`;
    }	
	//for keyvalueColumns...(small difference with the keyvalueColumnsRadioColumn : we look at op.value.value, not ope.value)
	//it will be formatted as a python dict
	let tsConstColumnsOperations = "None";
	if (config.tsCFkeyvalueColumnsSelectColumnsOperations && config.tsCFkeyvalueColumnsSelectColumnsOperations.length > 0) {
      tsConstColumnsOperations = "{";
	  config.tsCFkeyvalueColumnsSelectColumnsOperations.forEach((op, index) => {
        // Determine how to reference the column based on 'named'
        const tsConstColumnsOperationscolumnReference = op.key.value;
        const tsConstColumnsOperationsOpe = op.value.value;
        // Construct each element argument
        tsConstColumnsOperations += `"${tsConstColumnsOperationscolumnReference}": "${tsConstColumnsOperationsOpe}"`;
        if (index < config.tsCFkeyvalueColumnsSelectColumnsOperations.length - 1) {
          tsConstColumnsOperations += ", ";
        }
      });
	  tsConstColumnsOperations +=`}`;
    }
	
	
	//for inputNumber
    const tsConstCSVOptionsNRowsWithDefaultValue=config.tsCFinputNumberCSVOptionsNRowsWithDefaultValue;
	
	//for cascader. Cascader gives the whole path of the data like ['text', 'string'].
    //in this example, we retrieve only the last level	
    const tsConstDataTypeStep1 = config.tsCFcascaderDataType[config.tsCFcascaderDataType.length - 1];
    let tsConstDataType = 'None';
    if (tsConstDataTypeStep1 && tsConstDataTypeStep1.trim() !== '' 
	) {
      tsConstDataType = '"' + tsConstDataTypeStep1+ '"';
    }

    // for codeTextarea
	let tsConstCodeWithAI = 'None';
    if (config.tsCFcodeTextareaCodeWithAi && config.tsCFcodeTextareaCodeWithAi.trim() !== ''
	) {
        const tsConstParsedCodeWithAIStep1 = JSON.parse(config.tsCFcodeTextareaCodeWithAi );
        const tsConstParsedCodeWithAI = tsConstParsedCodeWithAIStep1.code?.trim();	
      tsConstCodeWithAI = '"' + tsConstParsedCodeWithAI+ '"';
    }

    // Template for outputting the input data. This is where you place your Python code.
    const code = `
print("1 config.tsCFinfoInstructions : ")
print("${config.tsCFinfoInstructions}")
print("2 config.tsCFradioFileLocation : ")
print("${config.tsCFradioFileLocation}")
print("3 config.tsCFfileFilePath : ")
print("${config.tsCFfileFilePath}")
print("4 config.tsCFinputNumberCSVOptionsNRows : ")
print("${config.tsCFinputNumberCSVOptionsNRows}")
print("5 config.tsCFinputNumberCSVOptionsNRowsWithDefaultValue : ")
print("${config.tsCFinputNumberCSVOptionsNRowsWithDefaultValue}")
print("tsConstCSVOptionsNRowsWithDefaultValue : ")
print("${tsConstCSVOptionsNRowsWithDefaultValue}")
print("6 config.tsCFselectTokenizationCSVOptionsNames : ")
print("${config.tsCFselectTokenizationCSVOptionsNames}")
print("tsConsselectTokenization : ")
print('${tsConsselectTokenization}') #single quote because we have quotes inside
print("7 config.tsCFinputCSVOptionsQuoteChar : ")
print("${config.tsCFinputCSVOptionsQuoteChar}")
print("8 config.tsCFinputPassword : ")
print("${config.tsCFinputPassword}")
print("9 config.tsCFselectCSVOptionsOnBadLines : ")
print("${config.tsCFselectCSVOptionsOnBadLines}")
print("tsConstCSVOptionsOnBadLines : ")
print(${tsConstCSVOptionsOnBadLines})
print("10 config.tsCFselectCustomizableCSVOptionsSep : ")
print("${config.tsCFselectCustomizableCSVOptionsSep}")
print("11 config.tsCFselectMultipleDateType : ")
print("${config.tsCFselectMultipleDateType}")
print("tsConsDateType : ")
print('${tsConsDateType}')
print("12 config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters : ")
print("${config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters}")
print("tsConstRemoveUnwantedCharacters : ")
print('${tsConstRemoveUnwantedCharacters}') #single quote because we have quotes inside
print("13 config.tsCFkeyvalueCSVOptionsStorageOptions : ")
print("${config.tsCFkeyvalueCSVOptionsStorageOptions}")
print("14 config.tsCFtransferDataFilterColumn : ")
print("${config.tsCFtransferDataFilterColumn}")
print("15 config.tsCFcolumnsLeftKeyColumn : ")
print("${config.tsCFcolumnsLeftKeyColumn}")
print("tsConstLeftKeyColumn : ")
print(${tsConstLeftKeyColumn})
print("16 config.tsCFkeyvalueColumnsColumns : ")
print(${tsConstColumnswithkeys})
#print("17 config.tsCFcodeTextareaImports : ")
#print("${config.tsCFcodeTextareaImports}")//break the code, please look at console instead
print("18 config.tsCFtextareaJSONBody : ")
print("${config.tsCFtextareaJSONBody}")
print("19 config.tsCFtableTableName : ")
print("${config.tsCFtableTableName}")
print("20 config.tsCFbooleanAutoCommit : ")
print("${config.tsCFbooleanAutoCommit}")
print("tsConstAutoCommit : ")
print("${tsConstAutoCommit}")
print("21 config.tsCFvaluesListUrls : ")
print("${config.tsCFvaluesListUrls}")
print("22 config.tsCFsheetsExcelOptionsSheetName : ")
print("${config.tsCFsheetsExcelOptionsSheetName}")
print("23 config.tsCFdataMappingmapping : ")
print("${config.tsCFdataMappingmapping}")
print("24 config.tsCFcascaderDataType : ")
print("${config.tsCFcascaderDataType}")
print("tsConstDataTypeStep1 : ")
print("${tsConstDataTypeStep1}")
print("tsConstDataType : ")
print(${tsConstDataType})
print("25 config.tsCFkeyvalueColumnsRadioColumnSortingOrder : ")
print("${config.tsCFkeyvalueColumnsRadioColumnSortingOrder}")
print("25 tsConstSortingOrder : ")
print(${tsConstSortingOrder})
print("26 config.tsCFkeyvalueColumnsSelectColumnsOperations : ")
print("${config.tsCFkeyvalueColumnsSelectColumnsOperations}")
print("26 tsConstColumnsOperations : ")
print(${tsConstColumnsOperations})
print("27 config.tsCFcolumnSelectColumn : ")
print("${config.tsCFcolumnSelectColumn}")
print("tsConstSelectColumn : ")
print(${tsConstSelectColumn})
print("28 config.tsCFcolumnTypeRestrictedColumn : ")
print("${config.tsCFcolumnTypeRestrictedColumn}")
print("28 tsConstTypeRestrictedColumn : ")
print(${tsConstTypeRestrictedColumn})
print("29 config.tsCFcolumnDefaultValueColumn : ")
print("${config.tsCFcolumnDefaultValueColumn}")
print("29 config.tsCFcolumnDefaultValueColumn.value : ")
print("${config.tsCFcolumnDefaultValueColumn.value}")
print("30 config.tsCFdateDatePicker : ")
print("${config.tsCFdateDatePicker}")
#print("31 config.tsCFcodeTextareaCodeWithAi : ")
#print("${config.tsCFcodeTextareaCodeWithAi}") //break the code, please look at console instead
print("31 tsConstCodeWithAI : ")
print(${tsConstCodeWithAI})





#A comment in Python. The code generator will replace outputName by the output real name, same for inputName.

#You can do without a python function however if your code is very simple.
#kwarg is for key word argument, it allows a more understandable syntax than just writing the argument.
#new line for each argument improve readability
#note how typescript const are used without quotes

${outputName} = py_fn_example_python_function(
  py_arg_df=${inputName},
  py_arg_csv_options_nrows_with_default_value=${tsConstCSVOptionsNRowsWithDefaultValue},
  py_arg_csv_options_on_badlines=${tsConstCSVOptionsOnBadLines},
  py_arg_function_test_list=${tsConstRemoveUnwantedCharacters},
  py_arg_function_test_dict=${tsConstColumnswithkeys}
)
`;

//test console : it will appear in your browser console. This is TypeScript code.
console.log("Amphi typescript code with values of the form");
console.log("1 config.tsCFinfoInstructions : ");
console.log(config.tsCFinfoInstructions);
console.log("2 config.tsCFradioFileLocation : ");
console.log(config.tsCFradioFileLocation);
console.log("3 config.tsCFfileFilePath : ");
console.log(config.tsCFfileFilePath);
console.log("4 config.tsCFinputNumberCSVOptionsNRows : ");
console.log(config.tsCFinputNumberCSVOptionsNRows);
console.log("5 config.tsCFinputNumberCSVOptionsNRowsWithDefaultValue : ");
console.log(config.tsCFinputNumberCSVOptionsNRowsWithDefaultValue);
console.log("tsConstCSVOptionsNRowsWithDefaultValue : ");
console.log(tsConstCSVOptionsNRowsWithDefaultValue);
console.log("6 config.tsCFselectTokenizationCSVOptionsNames : ");
console.log(config.tsCFselectTokenizationCSVOptionsNames);
console.log("6 tsConsselectTokenization : ");
console.log(tsConsselectTokenization);
console.log("7 config.tsCFinputCSVOptionsQuoteChar : ");
console.log(config.tsCFinputCSVOptionsQuoteChar);
console.log("8 config.tsCFinputPassword : ");
console.log(config.tsCFinputPassword);
console.log("9 config.tsCFselectCSVOptionsOnBadLines : ");
console.log(config.tsCFselectCSVOptionsOnBadLines);
console.log("tsConstCSVOptionsOnBadLines : ");
console.log(tsConstCSVOptionsOnBadLines);
console.log("10 config.tsCFselectCustomizableCSVOptionsSep : ");
console.log(config.tsCFselectCustomizableCSVOptionsSep);
console.log("11 config.tsCFselectMultipleDateType : ");
console.log(config.tsCFselectMultipleDateType);
console.log("12 config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters : ");
console.log(config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters);
console.log("tsConstRemoveUnwantedCharacters : ");
console.log(tsConstRemoveUnwantedCharacters);
console.log("13 config.tsCFkeyvalueCSVOptionsStorageOptions : ");
console.log(config.tsCFkeyvalueCSVOptionsStorageOptions);
console.log("14 config.tsCFtransferDataFilterColumn : ");
console.log(config.tsCFtransferDataFilterColumn);
console.log("15 config.tsCFcolumnsLeftKeyColumn : ");
console.log(config.tsCFcolumnsLeftKeyColumn);
console.log("tsConstLeftKeyColumn : ");
console.log(tsConstLeftKeyColumn);
console.log("16 config.tsCFkeyvalueColumnsColumns : ");
console.log(config.tsCFkeyvalueColumnsColumns);
console.log("16 tsConstColumnswithkeys : ");
console.log(tsConstColumnswithkeys);
console.log("17 config.tsCFcodeTextareaImports : ");
console.log(config.tsCFcodeTextareaImports);
console.log("18 config.tsCFtextareaJSONBody : ");
console.log(config.tsCFtextareaJSONBody);
console.log("19 config.tsCFtableTableName : ");
console.log(config.tsCFtableTableName);
console.log("20 config.tsCFbooleanAutoCommit : ");
console.log(config.tsCFbooleanAutoCommit);
console.log("tsConstAutoCommit : ");
console.log(tsConstAutoCommit);
console.log("21 config.tsCFvaluesListUrls : ");
console.log(config.tsCFvaluesListUrls);
console.log("22 config.tsCFsheetsExcelOptionsSheetName : ");
console.log(config.tsCFsheetsExcelOptionsSheetName);
console.log("23 config.tsCFdataMappingmapping : ");
console.log(config.tsCFdataMappingmapping);
console.log("24 config.tsCFcascaderDataType : ");
console.log(config.tsCFcascaderDataType);
console.log("tsConsDateType : ");
console.log(tsConsDateType);
console.log("tsConstDataTypeStep1 : ");
console.log(tsConstDataTypeStep1);
console.log("tsConstDataType : ");
console.log(tsConstDataType);
console.log("25 config.tsCFkeyvalueColumnsRadioColumnSortingOrder : ");
console.log(config.tsCFkeyvalueColumnsRadioColumnSortingOrder);
console.log("25 tsConstSortingOrder : ");
console.log(tsConstSortingOrder);
console.log("26 config.tsCFkeyvalueColumnsSelectColumnsOperations : ");
console.log(config.tsCFkeyvalueColumnsSelectColumnsOperations);
console.log("26 tsConstColumnsOperations : ");
console.log(tsConstColumnsOperations);
console.log("27 config.tsCFcolumnSelectColumn : ");
console.log(config.tsCFcolumnSelectColumn);
console.log("tsConstSelectColumn : ");
console.log(tsConstSelectColumn);
console.log("28 config.tsCFcolumnTypeRestrictedColumn : ");
console.log(config.tsCFcolumnTypeRestrictedColumn);
console.log("28 tsConstTypeRestrictedColumn : ");
console.log(tsConstTypeRestrictedColumn);
console.log("29 config.tsCFcolumnDefaultValueColumn : ");
console.log(config.tsCFcolumnDefaultValueColumn);
console.log("29 config.tsCFcolumnDefaultValueColumn.value : ");
console.log(config.tsCFcolumnDefaultValueColumn.value);
console.log("30 config.tsCFdateDatePicker : ");
console.log(config.tsCFdateDatePicker);
console.log("31 config.tsCFcodeTextareaCodeWithAi : ");
console.log(config.tsCFcodeTextareaCodeWithAi);
console.log("31 tsConstCodeWithAI : ");
console.log(tsConstCodeWithAI);

    return code;
  }
}

//for custom components only, deactivated
//export default new FormExampleCustom();