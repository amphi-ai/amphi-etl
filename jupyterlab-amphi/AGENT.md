# jupyterlab-amphi Component Development Guide

This guide explains how to develop new components for the jupyterlab-amphi visual pipeline editor.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Creating a New Component](#creating-a-new-component)
3. [Form Field Types Reference](#form-field-types-reference)
4. [Code Generation](#code-generation)
5. [Advanced Patterns](#advanced-patterns)
6. [Testing and Registration](#testing-and-registration)

## Component Architecture

### Base Component Class

All components extend `BaseCoreComponent`, which provides the UI framework and lifecycle management.

**Location**: [packages/pipeline-components-core/src/components/BaseCoreComponent.tsx](packages/pipeline-components-core/src/components/BaseCoreComponent.tsx)

```typescript
export class BaseCoreComponent extends PipelineComponent<ComponentItem>() {
  constructor(name, id, description, type, fileDrop, category, icon, defaultConfig, form) {
    super();
    this._name = name;              // User-friendly name
    this._id = id;                  // Unique identifier
    this._description = description; // Component description
    this._type = type;              // Component type (see below)
    this._fileDrop = fileDrop;      // File drop configuration
    this._category = category;       // Category for organization
    this._icon = icon;              // Icon for UI
    this._default = defaultConfig;   // Default configuration
    this._form = form;              // Form field definitions
  }
}
```

### Component Types

Components are categorized by their input/output behavior:

| Type | Description | Inputs | Outputs |
|------|-------------|--------|---------|
| `pandas_df_input` | Data source | None | 1 DataFrame |
| `pandas_df_processor` | Single input transform | 1 DataFrame | 1 DataFrame |
| `pandas_df_double_processor` | Two input transform | 2 DataFrames | 1 DataFrame |
| `pandas_df_output` | Data sink | 1 DataFrame | None |

### Component Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `_name` | string | Yes | Display name shown in UI |
| `_id` | string | Yes | Unique identifier (camelCase) |
| `_description` | string | Yes | Component description (supports markdown) |
| `_type` | string | Yes | Component type (see table above) |
| `_category` | string | Yes | Category: "inputs", "transforms", "outputs", etc. |
| `_icon` | object | Yes | Icon definition (React component) |
| `_default` | object | Yes | Default configuration values |
| `_form` | object | Yes | Form field definitions |
| `_fileDrop` | array | No | File drop configuration |

## Creating a New Component

### Step 1: Create Component File

Create a new file in the appropriate directory:
- Inputs: [packages/pipeline-components-core/src/components/inputs/](packages/pipeline-components-core/src/components/inputs/)
- Transforms: [packages/pipeline-components-core/src/components/transforms/](packages/pipeline-components-core/src/components/transforms/)
- Outputs: [packages/pipeline-components-core/src/components/outputs/](packages/pipeline-components-core/src/components/outputs/)

### Step 2: Basic Component Template

```typescript
import { BaseCoreComponent } from '../BaseCoreComponent';
import { myIcon } from '../../icons'; // Import your icon

export class MyNewComponent extends BaseCoreComponent {
  constructor() {
    // Define default configuration
    const defaultConfig = {
      myParameter: "default value",
      myOption: "option1"
    };

    // Define form fields
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "My Parameter",
          id: "myParameter",
          placeholder: "Enter value...",
          tooltip: "Help text for users",
          required: true
        },
        {
          type: "select",
          label: "My Option",
          id: "myOption",
          options: [
            { value: "option1", label: "Option 1" },
            { value: "option2", label: "Option 2" }
          ]
        }
      ]
    };

    // Component description
    const description = "Use My New Component to perform custom operations...";

    // Call parent constructor
    super(
      "My New Component",           // name
      "myNewComponent",             // id
      description,                  // description
      "pandas_df_processor",        // type
      [],                           // fileDrop
      "transforms",                 // category
      myIcon,                       // icon
      defaultConfig,                // default config
      form                          // form definition
    );
  }

  // Required: Provide Python imports
  // Imports can be conditional based on config parameters values
  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  // Optional: Provide helper functions
  public provideFunctions({ config }): string[] {
    return [];
  }

  // Required: Generate Python code
  public generateComponentCode({ config, inputName, outputName }): string {
    const param = config.myParameter;
    const option = config.myOption;

    return `
# My New Component
${outputName} = ${inputName}.copy()
# Add your transformation logic here
`;
  }
}
```

### Example: Simple Input Component

```typescript
export class InlineInput extends BaseCoreComponent {
  constructor() {
    const inlineDataDefault = `First Name,Last Name,Age
John,Doe,28
Jane,Smith,34`;

    const defaultConfig = { inlineData: inlineDataDefault };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "codeTextarea",
          label: "Inline Data",
          id: "inlineData",
          placeholder: "Enter your CSV data here",
          tooltip: "Type your CSV-like data directly. First line is header.",
          aiInstructions: "Generate mock CSV-like data for demonstration purposes.",
          aiGeneration: true,
          aiPromptExamples: [
            { label: "Fake user data", value: "Generate fake user data with 5 rows" }
          ]
        }
      ]
    };

    const description = "Manually enter CSV-like data directly in the pipeline.";
    super("Inline Input", "inlineInput", description, "pandas_df_input",
          [], "inputs", editIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "from io import StringIO"];
  }

  public generateComponentCode({ config, outputName }): string {
    const data = config.inlineData?.trim() || "";
    if (!data) {
      throw new Error("No inline data provided.");
    }
    return `
${outputName}_data = """${data}
"""
${outputName} = pd.read_csv(StringIO(${outputName}_data)).convert_dtypes()
`;
  }
}
```

### Example: Simple Transform Component

```typescript
export class Deduplicate extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { keep: "first" };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Keep (survivorship)",
          id: "keep",
          options: [
            {
              value: "first",
              label: "First occurrence",
              tooltip: "Drop duplicates except for the first"
            },
            {
              value: "last",
              label: "Last occurrence",
              tooltip: "Drop duplicates except for the last"
            },
            {
              value: "False",
              label: "Drop all",
              tooltip: "Drop all duplicates"
            }
          ]
        },
        {
          type: "columns",
          label: "Columns",
          id: "subset",
          placeholder: "All columns",
          tooltip: "Columns considered for identifying duplicates"
        }
      ]
    };

    const description = "Remove duplicate rows based on column values.";
    super("Deduplicate Rows", "deduplicateData", description,
          "pandas_df_processor", [], "transforms", dedupIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const subset = config.subset && Array.isArray(config.subset) ? config.subset : [];

    // Build subset parameter
    const columns = subset.length > 0
      ? `subset=[${subset.map(col => col.named ? `"${col.value}"` : col.value).join(', ')}]`
      : '';

    // Handle keep parameter
    let keep;
    if (typeof config.keep === 'boolean') {
      keep = config.keep ? `"first"` : "False";
    } else {
      keep = config.keep === "False" ? "False" : `"${config.keep}"`;
    }

    const params = [columns, columns && keep ? `keep=${keep}` : !columns && keep ? `keep=${keep}` : '']
      .filter(Boolean)
      .join(', ');

    return `
# Deduplicate rows
${outputName} = ${inputName}.drop_duplicates(${params})
`;
  }
}
```

## Form Field Types Reference

Form fields are defined in [packages/pipeline-components-manager/src/configUtils.tsx](packages/pipeline-components-manager/src/configUtils.tsx)

### Field Descriptor Interface

```typescript
export interface FieldDescriptor {
  type: string;                    // Field type (see table below)
  label: string;                   // Display label
  id: string;                      // Field identifier (config key)
  placeholder?: any;               // Placeholder text
  tooltip?: string;                // Help text shown on hover
  required?: boolean;              // Mark as required field
  options?: Option[];              // Options for select/radio
  advanced?: boolean;              // Show in advanced settings modal only
  validation?: string;             // Regex validation pattern
  validationMessage?: string;      // Error message for validation
  condition?: Record<string, any>; // Conditional display logic
  // ... additional properties per field type
}
```

### Available Field Types

#### Basic Input Types

##### `input` - Text Input
```typescript
{
  type: "input",
  label: "File Path",
  id: "filePath",
  placeholder: "/path/to/file.csv",
  tooltip: "Path to the input file",
  required: true,
  validation: "^/.+",  // Regex pattern
  validationMessage: "Path must start with /"
}
```

##### `password` - Password Input
```typescript
{
  type: "password",
  label: "API Key",
  id: "apiKey",
  placeholder: "Enter your API key",
  required: true
}
```

##### `inputNumber` - Numeric Input
```typescript
{
  type: "inputNumber",
  label: "Sample Size",
  id: "sampleSize",
  placeholder: "1000",
  min: 1,
  max: 1000000,
  tooltip: "Number of rows to sample"
}
```

##### `boolean` - Toggle Switch
```typescript
{
  type: "boolean",
  label: "Include Header",
  id: "includeHeader",
  tooltip: "Include column headers in output"
}
```

##### `date` - Date Picker
```typescript
{
  type: "date",
  label: "Start Date",
  id: "startDate",
  placeholder: "Select date"
}
```

#### Text Area Types

##### `textarea` - Multi-line Text
```typescript
{
  type: "textarea",
  label: "Description",
  id: "description",
  placeholder: "Enter description...",
  rows: 5,
  height: 120  // Height in pixels
}
```

##### `codeTextarea` - Code Editor
Code editor with syntax highlighting and AI assistance.

```typescript
{
  type: "codeTextarea",
  label: "Python Code",
  id: "pythonCode",
  mode: "python",  // Language mode
  placeholder: "# Enter Python code",
  tooltip: "Write custom Python transformation",
  height: 200,

  // AI assistance features
  aiGeneration: true,
  aiDataSample: false,  // Don't include data sample in AI prompt
  aiInstructions: "Generate Python code to transform the dataframe",
  aiPromptExamples: [
    { label: "Filter rows", value: "Keep only rows where Age > 18" },
    { label: "Add column", value: "Add a new column 'FullName' by combining FirstName and LastName" }
  ]
}
```

**AI Properties**:
- `aiGeneration`: Enable AI code generation button
- `aiDataSample`: Include input data sample in AI prompt
- `aiInstructions`: Instructions for AI code generation
- `aiPromptExamples`: Quick example prompts for users

#### Selection Types

##### `select` - Single Select Dropdown
```typescript
{
  type: "select",
  label: "File Format",
  id: "fileFormat",
  placeholder: "Select format",
  options: [
    { value: "csv", label: "CSV", tooltip: "Comma-separated values" },
    { value: "json", label: "JSON", tooltip: "JavaScript Object Notation" },
    { value: "xlsx", label: "Excel", tooltip: "Excel spreadsheet" }
  ],
  selectionRemovable: true,  // Allow clearing selection
  noneOption: true  // Add "None" option
}
```

##### `radio` - Radio Button Group
```typescript
{
  type: "radio",
  label: "Filter Type",
  id: "filterType",
  options: [
    { value: "basic", label: "Basic" },
    { value: "advanced", label: "Advanced" }
  ]
}
```

##### `selectCustomizable` - Select with Custom Values
Allows users to enter custom values not in the options list.

```typescript
{
  type: "selectCustomizable",
  label: "Delimiter",
  id: "delimiter",
  placeholder: "Select or enter delimiter",
  options: [
    { value: ",", label: "Comma (,)" },
    { value: ";", label: "Semicolon (;)" },
    { value: "\t", label: "Tab" },
    { value: "|", label: "Pipe (|)" }
  ]
}
```

##### `selectMultipleCustomizable` - Multi-Select with Custom Values
```typescript
{
  type: "selectMultipleCustomizable",
  label: "Tags",
  id: "tags",
  placeholder: "Select or enter tags",
  options: [
    { value: "important", label: "Important" },
    { value: "urgent", label: "Urgent" }
  ]
}
```

##### `cascader` - Hierarchical Dropdown
```typescript
{
  type: "cascader",
  label: "Category",
  id: "category",
  placeholder: "Select category",
  options: [
    {
      value: "electronics",
      label: "Electronics",
      children: [
        { value: "phones", label: "Phones" },
        { value: "laptops", label: "Laptops" }
      ]
    },
    {
      value: "clothing",
      label: "Clothing",
      children: [
        { value: "mens", label: "Men's" },
        { value: "womens", label: "Women's" }
      ]
    }
  ]
}
```

##### `cascaderMultiple` - Multi-Select Hierarchical Dropdown
Same as cascader but allows multiple selections.

#### Column Selection Types

##### `column` - Single Column Selector
Allows selecting a single column from input dataframe.

```typescript
{
  type: "column",
  label: "ID Column",
  id: "idColumn",
  placeholder: "Select column",
  tooltip: "Column containing unique identifiers",
  required: true,
  allowedTypes: ["string", "numeric"],  // Filter by column type
  inputNb: 1  // Which input to get columns from (for multi-input components)
}
```

**Column Value Structure**:
```typescript
{
  value: "ColumnName",  // Column name
  type: "string",       // Column type: "string", "numeric", "datetime", etc.
  named: true          // Whether it's a named column (vs expression)
}
```

##### `columns` - Multiple Column Selector
Allows selecting multiple columns from input dataframe.

```typescript
{
  type: "columns",
  label: "Group By Columns",
  id: "groupByColumns",
  placeholder: "Select columns",
  tooltip: "Columns to group by",
  allowedTypes: ["string", "numeric"],
  inputNb: 1
}
```

**Returns Array**:
```typescript
[
  { value: "FirstName", type: "string", named: true },
  { value: "Age", type: "numeric", named: true }
]
```

#### Data Structure Types

##### `keyvalue` - Key-Value Pairs Editor
```typescript
{
  type: "keyvalue",
  label: "Parameters",
  id: "parameters",
  tooltip: "Additional parameters as key-value pairs"
}
```

**Data Structure**:
```typescript
[
  { key: "param1", value: "value1" },
  { key: "param2", value: "value2" }
]
```

##### `valuesList` - List of Values
```typescript
{
  type: "valuesList",
  label: "Values",
  id: "values",
  elementName: "Value",  // Label for each item
  addItemLabel: "Add Value"  // Button text
}
```

**Data Structure**:
```typescript
[
  { value: "value1" },
  { value: "value2" }
]
```

##### `keyvalueColumns` - Column Mapping
Maps columns to values or other columns.

```typescript
{
  type: "keyvalueColumns",
  label: "Column Mapping",
  id: "columnMapping",
  tooltip: "Map source columns to target columns"
}
```

**Data Structure**:
```typescript
[
  {
    key: { value: "SourceCol", type: "string", named: true },
    value: "TargetCol"
  }
]
```

##### `keyvalueColumnsSelect` - Column to Selection Mapping
```typescript
{
  type: "keyvalueColumnsSelect",
  label: "Type Mapping",
  id: "typeMapping",
  options: [
    { value: "string", label: "String" },
    { value: "integer", label: "Integer" },
    { value: "float", label: "Float" }
  ]
}
```

##### `keyvalueColumnsRadio` - Column to Radio Selection
```typescript
{
  type: "keyvalueColumnsRadio",
  label: "Sort Direction",
  id: "sortDirection",
  options: [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" }
  ]
}
```

##### `dataMapping` - Visual Data Field Mapping
Advanced drag-and-drop field mapping interface.

```typescript
{
  type: "dataMapping",
  label: "Field Mapping",
  id: "fieldMapping",
  tooltip: "Map source fields to target fields"
}
```

##### `formulaColumns` - Formula Builder
Allows building formulas/expressions for columns.

```typescript
{
  type: "formulaColumns",
  label: "Calculated Columns",
  id: "calculatedColumns",
  tooltip: "Create new columns using formulas"
}
```

##### `transferData` - Transfer List
Drag-and-drop interface to move items between lists.

```typescript
{
  type: "transferData",
  label: "Selected Fields",
  id: "selectedFields",
  tooltip: "Select fields to include"
}
```

##### `editableTable` - Editable Table
Inline editable table for structured data.

```typescript
{
  type: "editableTable",
  label: "Data Table",
  id: "dataTable",
  tooltip: "Edit data in table format"
}
```

#### File and Data Source Types

##### `file` - Single File Selector
```typescript
{
  type: "file",
  label: "Input File",
  id: "inputFile",
  placeholder: "Select file",
  allowedExtensions: [".csv", ".txt", ".json"],
  tooltip: "Select input file from file browser"
}
```

##### `files` - Multiple File Selector
```typescript
{
  type: "files",
  label: "Input Files",
  id: "inputFiles",
  placeholder: "Select files",
  allowedExtensions: [".csv", ".json"],
  tooltip: "Select multiple input files"
}
```

##### `table` - Database Table Selector
Connects to database and lists tables.

```typescript
{
  type: "table",
  label: "Source Table",
  id: "sourceTable",
  placeholder: "Select table",
  connection: "databaseConnection",  // ID of connection field
  tooltip: "Select table from database"
}
```

##### `collection` - MongoDB Collection Selector
```typescript
{
  type: "collection",
  label: "Collection",
  id: "collection",
  placeholder: "Select collection",
  connection: "mongoConnection",
  tooltip: "Select MongoDB collection"
}
```

##### `sheets` - Excel Sheet Selector
```typescript
{
  type: "sheets",
  label: "Sheets",
  id: "sheets",
  placeholder: "Select sheets",
  tooltip: "Select Excel sheets to process"
}
```

#### Other Types

##### `info` - Information Display
Read-only information display (not a form input).

```typescript
{
  type: "info",
  label: "Notice",
  id: "notice",
  text: "This component requires pandas >= 2.0"
}
```

##### `selectTokenization` - Token-Based Multi-Select
```typescript
{
  type: "selectTokenization",
  label: "Keywords",
  id: "keywords",
  placeholder: "Enter keywords",
  tooltip: "Enter keywords separated by commas"
}
```

### Common Field Properties

#### Conditional Display

Show/hide fields based on other field values:

```typescript
{
  type: "input",
  label: "Advanced Value",
  id: "advancedValue",
  condition: { filterType: "advanced" }  // Show only if filterType === "advanced"
}

// Multiple possible values
{
  type: "columns",
  label: "Key Fields",
  id: "keyFields",
  condition: {
    comparisonMode: ["field_data", "differing_fields"]  // Show if comparisonMode is one of these
  }
}
```

#### Advanced Fields

Fields marked as `advanced: true` are hidden from the main form and shown only in the advanced settings modal:

```typescript
{
  type: "radio",
  label: "Execution Engine",
  id: "executionEngine",
  options: [
    { value: "pandas", label: "Pandas" },
    { value: "polars", label: "Polars" }
  ],
  advanced: true  // Hidden in basic view
}
```

#### Validation

Add client-side validation:

```typescript
{
  type: "input",
  label: "Email",
  id: "email",
  validation: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  validationMessage: "Please enter a valid email address"
}
```

#### Tooltips

Add helpful tooltips:

```typescript
{
  type: "select",
  label: "Encoding",
  id: "encoding",
  tooltip: "Character encoding of the file. Use 'utf-8' for most modern files.",
  options: [
    {
      value: "utf-8",
      label: "UTF-8",
      tooltip: "Universal encoding, recommended for most files"
    },
    {
      value: "latin-1",
      label: "Latin-1",
      tooltip: "Western European encoding"
    }
  ]
}
```

## Code Generation

### Required Methods

#### `provideImports()`
Returns array of Python import statements needed by the component.

```typescript
public provideImports({ config }): string[] {
  const imports = ["import pandas as pd"];

  // Conditional imports based on config
  if (config.useNumpy) {
    imports.push("import numpy as np");
  }

  if (config.fileType === "parquet") {
    imports.push("import pyarrow.parquet as pq");
  }

  return imports;
}
```

#### `provideFunctions()`
Returns array of Python helper function definitions.

```typescript
public provideFunctions({ config }): string[] {
  return [`def custom_transform(df):
    """Custom transformation function"""
    df = df.copy()
    # Transformation logic
    return df`];
}
```

#### `generateComponentCode()`
Main code generation method. Returns Python code as a string.

**Parameters**:
- `config`: Component configuration object (from form fields)
- `inputName`: Variable name of input dataframe(s)
- `outputName`: Variable name for output dataframe

**For single input components**:
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  // inputName is a string (e.g., "df_1")
  const param = config.myParameter;

  return `
# My transformation
${outputName} = ${inputName}.copy()
${outputName}['new_column'] = ${outputName}['old_column'] * 2
`;
}
```

**For double input components**:
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  // inputName is an array (e.g., ["df_1", "df_2"])
  const leftDf = inputName[0];
  const rightDf = inputName[1];

  return `
# Merge dataframes
${outputName} = pd.merge(${leftDf}, ${rightDf}, on='id', how='inner')
`;
}
```

**For input components**:
```typescript
public generateComponentCode({ config, outputName }): string {
  // No inputName - this is a data source
  const filePath = config.filePath;

  return `
# Read CSV file
${outputName} = pd.read_csv("${filePath}").convert_dtypes()
`;
}
```

**For output components**:
```typescript
public generateComponentCode({ config, inputName }): string {
  // No outputName - this is a data sink
  const filePath = config.outputPath;

  return `
# Write CSV file
${inputName}.to_csv("${filePath}", index=False)
`;
}
```

### Code Generation Best Practices

#### 1. Handle Missing Configuration
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  const columns = config.columns || [];

  if (columns.length === 0) {
    throw new Error("No columns selected. Please select at least one column.");
  }

  // Continue with code generation
}
```

#### 2. Escape Strings Properly
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  // Escape quotes in strings
  const searchText = config.searchText.replace(/"/g, '\\"');

  return `
${outputName} = ${inputName}[${inputName}['text'].str.contains("${searchText}")]
`;
}
```

#### 3. Handle Column Metadata
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  const columns = config.columns || [];

  // Build column list
  const columnList = columns
    .map(col => col.named ? `"${col.value}"` : col.value)
    .join(', ');

  return `
${outputName} = ${inputName}[[${columnList}]]
`;
}
```

#### 4. Use Multi-line Strings for Readability
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  const query = config.sqlQuery;

  return `
# Execute SQL query
query = """
${query}
"""
${outputName} = pd.read_sql_query(query, connection)
`;
}
```

#### 5. Add Comments
```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  const operation = config.operation;

  return `
# ${this._name}: ${operation}
${outputName} = ${inputName}.${operation}()
`;
}
```

## Advanced Patterns

### Pattern 1: Conditional Code Generation

Generate different code based on configuration:

```typescript
export class Filter extends BaseCoreComponent {
  public generateComponentCode({ config, inputName, outputName }): string {
    // Advanced mode: use query expression
    if (config.filterType === "advanced") {
      const expr = config.pythonExpression.replace(/"/g, '\\"');
      return `
# Advanced filter using pandas query
${outputName} = ${inputName}.query("${expr}")
`;
    }

    // Basic mode: build filter expression
    const column = config.column.value;
    const condition = config.condition;
    const value = config.conditionValue;

    let filterExpr;
    switch (condition) {
      case "==":
        filterExpr = `${inputName}["${column}"] == "${value}"`;
        break;
      case ">":
        filterExpr = `${inputName}["${column}"] > ${value}`;
        break;
      case "notnull":
        filterExpr = `${inputName}["${column}"].notnull()`;
        break;
      // ... more conditions
    }

    return `
# Basic filter
${outputName} = ${inputName}[${filterExpr}]
`;
  }
}
```

### Pattern 2: Multi-Input Components

Components that take two dataframe inputs:

```typescript
export class JoinDataframes extends BaseCoreComponent {
  constructor() {
    // ... form definition
    super(
      "Join Dataframes",
      "joinDataframes",
      description,
      "pandas_df_double_processor",  // Two inputs
      [],
      "transforms",
      joinIcon,
      defaultConfig,
      form
    );
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    // inputName is an array: [left_df, right_df]
    const leftDf = inputName[0];
    const rightDf = inputName[1];
    const joinType = config.joinType;
    const leftKey = config.leftKey.value;
    const rightKey = config.rightKey.value;

    return `
# Join dataframes
${outputName} = pd.merge(
    ${leftDf},
    ${rightDf},
    left_on="${leftKey}",
    right_on="${rightKey}",
    how="${joinType}"
)
`;
  }
}
```

### Pattern 3: Dynamic Form Fields

Use `condition` to show/hide fields based on other values:

```typescript
const form = {
  idPrefix: "component__form",
  fields: [
    {
      type: "radio",
      label: "Mode",
      id: "mode",
      options: [
        { value: "simple", label: "Simple" },
        { value: "advanced", label: "Advanced" }
      ]
    },
    {
      type: "input",
      label: "Simple Value",
      id: "simpleValue",
      condition: { mode: "simple" }  // Only shown in simple mode
    },
    {
      type: "codeTextarea",
      label: "Advanced Expression",
      id: "advancedExpression",
      condition: { mode: "advanced" }  // Only shown in advanced mode
    }
  ]
};
```

### Pattern 4: Column Type Filtering

Filter columns by data type:

```typescript
{
  type: "columns",
  label: "Numeric Columns",
  id: "numericColumns",
  allowedTypes: ["numeric", "integer", "float"],  // Only show numeric columns
  tooltip: "Select numeric columns for calculation"
}
```

### Pattern 5: AI-Assisted Code Generation

Enable AI assistance for complex expressions:

```typescript
{
  type: "codeTextarea",
  label: "Transformation Logic",
  id: "transformCode",
  mode: "python",
  aiGeneration: true,
  aiDataSample: true,  // Include sample data in AI prompt
  aiInstructions: "Generate Python code to transform the dataframe. Use variable 'df' for the input dataframe.",
  aiPromptExamples: [
    {
      label: "Calculate age from birthdate",
      value: "Calculate age from 'birthdate' column and create new 'age' column"
    },
    {
      label: "Text cleaning",
      value: "Clean 'description' column: remove special characters, convert to lowercase, trim whitespace"
    },
    {
      label: "Category mapping",
      value: "Map 'status' values: 'A' -> 'Active', 'I' -> 'Inactive', 'P' -> 'Pending'"
    }
  ]
}
```

### Pattern 6: Custom Validation

Add custom validation logic:

```typescript
public generateComponentCode({ config, inputName, outputName }): string {
  // Validate configuration
  if (!config.columns || config.columns.length === 0) {
    throw new Error("Please select at least one column");
  }

  if (config.threshold < 0 || config.threshold > 100) {
    throw new Error("Threshold must be between 0 and 100");
  }

  // Generate code
  return `
${outputName} = ${inputName}.copy()
`;
}
```

### Pattern 7: Helper Methods

Use private helper methods for cleaner code:

```typescript
export class CSVOutput extends BaseCoreComponent {
  private buildWriteOptions(config: any): string {
    const options: string[] = ['index=False'];

    if (config.encoding) {
      options.push(`encoding="${config.encoding}"`);
    }

    if (config.delimiter) {
      options.push(`sep="${config.delimiter}"`);
    }

    if (config.includeHeader === false) {
      options.push('header=False');
    }

    return options.join(', ');
  }

  public generateComponentCode({ config, inputName }): string {
    const filePath = config.filePath;
    const options = this.buildWriteOptions(config);

    return `
# Write CSV file
${inputName}.to_csv("${filePath}", ${options})
`;
  }
}
```

## Testing and Registration

### Step 1: Export Component

Add your component to [packages/pipeline-components-core/src/components/index.ts](packages/pipeline-components-core/src/components/index.ts):

```typescript
// Inputs
export { CSVInput } from './inputs/CSVInput';
export { InlineInput } from './inputs/InlineInput';
export { MyNewInput } from './inputs/MyNewInput';  // Add your component

// Transforms
export { Filter } from './transforms/Filter';
export { Deduplicate } from './transforms/Deduplicate';
export { MyNewTransform } from './transforms/MyNewTransform';  // Add your component

// Outputs
export { CSVOutput } from './outputs/CSVOutput';
export { MyNewOutput } from './outputs/MyNewOutput';  // Add your component
```

### Step 2: Build the Extension

```bash
cd jupyterlab-amphi
jlpm install
jlpm build
```

### Step 3: Install in JupyterLab

```bash
jupyter labextension develop . --overwrite
```

### Step 4: Test the Component

1. Start JupyterLab: `jupyter lab`
2. Create new pipeline (`.ampln` file)
3. Find your component in the component palette
4. Drag it onto the canvas
5. Configure the component
6. Run the pipeline
7. Check console for generated code and errors

### Step 5: Test Code Generation

Create a test script to verify code generation:

```python
# test_component.py
from amphi.pipeline_components_core import MyNewComponent

component = MyNewComponent()
config = {
    'myParameter': 'test value',
    'myOption': 'option1'
}

code = component.generateComponentCode({
    'config': config,
    'inputName': 'df_input',
    'outputName': 'df_output'
})

print(code)
```

### Common Issues

#### Component not appearing in palette
- Check that component is exported in [index.ts](packages/pipeline-components-core/src/components/index.ts)
- Rebuild: `jlpm build`
- Refresh browser

#### Form fields not rendering
- Check field type spelling
- Verify `idPrefix` is set
- Check for required properties (type, label, id)

#### Code generation errors
- Add error handling for missing config values
- Test with various configurations
- Check for proper string escaping

#### Validation errors
- Ensure required fields are marked with `required: true`
- Add validation patterns where needed
- Test with invalid inputs

## Component Development Checklist

- [ ] Create component class extending `BaseCoreComponent`
- [ ] Define `defaultConfig` with all form field defaults
- [ ] Define `form` with all field descriptors
- [ ] Write clear `description` (supports markdown)
- [ ] Implement `provideImports()` method
- [ ] Implement `generateComponentCode()` method
- [ ] Add error handling for invalid configurations
- [ ] Test with various input configurations
- [ ] Export component in [index.ts](packages/pipeline-components-core/src/components/index.ts)
- [ ] Build extension: `jlpm build`
- [ ] Test in JupyterLab
- [ ] Verify generated Python code
- [ ] Test pipeline execution
- [ ] Add helpful tooltips
- [ ] Consider adding AI assistance for complex fields

## Additional Resources

- **Component Examples**: [packages/pipeline-components-core/src/components/](packages/pipeline-components-core/src/components/)
- **Form Utilities**: [packages/pipeline-components-manager/src/configUtils.tsx](packages/pipeline-components-manager/src/configUtils.tsx)
- **Component Service**: [packages/pipeline-components-manager/src/ComponentService.ts](packages/pipeline-components-manager/src/ComponentService.ts)
- **Base Component**: [packages/pipeline-components-core/src/components/BaseCoreComponent.tsx](packages/pipeline-components-core/src/components/BaseCoreComponent.tsx)

## Questions?

For issues or questions about component development, refer to the existing components in [pipeline-components-core](packages/pipeline-components-core/src/components/) as examples.

---

**Last Updated**: 2026-02-05
