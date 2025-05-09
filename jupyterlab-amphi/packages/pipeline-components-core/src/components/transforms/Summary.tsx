import { eyeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Summary extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      statisticsType: "all",
      pivot: "rows", // Set default pivot to 'rows'
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Apply to ",
          id: "statisticsType",
          placeholder: "Select statistics type",
          options: [
            { value: "all", label: "All columns" },
            { value: "numerical", label: "Numerical columns", tooltip: "Limit the result to numeric columns" },
            { value: "categorical", label: "Categorical columns", tooltip: "Limit the result to categorical columns" },
            { value: "select", label: "Select columns (advanced)", tooltip: "Limit the result to the selected columns" },
          ],
        },
        {
          type: "columns",
          label: "Columns",
          id: "columns",
          placeholder: "Select columns",
          tooltip: "Select which columns to analyze",
          condition: { statisticsType: "select" },
          advanced: true
        },
        {
          type: "radio",
          label: "Resulting Table Columns",
          id: "pivot",
          placeholder: "Select how should the resulting table be formatted",
          options: [
            { value: "rows", label: "As rows" },
            { value: "columns", label: "As columns" }
          ],
        }
      ],
    };

    const description = "Use Summary Component to provide a statistical summary of the incoming data.";

    super("Summary", "summary", description, "pandas_df_processor", [], "Data Exploration", eyeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "import numpy as np"];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Functions to summary the dataframe
    const SummaryFunction = `
def describe_dataset(df, column_type='all', orientation='columns_as_row', selected_columns=None):
    if column_type == 'numerical':
        df = df.select_dtypes(include=[np.number])
    elif column_type == 'categorical':
        df = df.select_dtypes(include=['object', 'category'])
    elif column_type == 'select':
        if selected_columns is None:
            raise ValueError("You must provide 'selected_columns' when column_type is 'select'.")
        df = df[selected_columns]
    elif column_type != 'all':
        raise ValueError("Invalid value for column_type. Choose from 'all', 'numerical', 'categorical', 'select'.")

    summary = []
    expected_describe_columns = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max', 'unique', 'top', 'freq']
    base_summary = df.describe(include='all').transpose()
    base_summary.reset_index(inplace=True)
    base_summary.rename(columns={'index': 'field_name'}, inplace=True)
    for col in expected_describe_columns:
      if col not in base_summary.columns:
          base_summary[col] = pd.NA
    
    expected_custdescribe_columns = ['field_name', 'type', 'count', 'unique', 'most freq value', 'max freq', 'least freq value', 'min', 'max', 'mean', 'std','avg_length','min_length','max_length','shortest','longest']      
    for col in df.columns:
        dtype = df[col].dtype
        col_data = df[col].dropna()

        data = {
            'field_name': col,
            'type': str(dtype),
            'count': int(col_data.count()),
            'unique': int(col_data.nunique()),
            'most freq value': col_data.value_counts().idxmax() if not col_data.value_counts().empty else "",
            'max freq': int(col_data.value_counts().max() if not col_data.value_counts().empty else 0),
            'least freq value': col_data.value_counts().idxmin() if not col_data.value_counts().empty else "",
            'min': col_data.min(),
            'max': col_data.max(),

        }

        if pd.api.types.is_numeric_dtype(dtype) or pd.api.types.is_datetime64_dtype(dtype):
            data.update({
            'mean': col_data.mean(),
            'std': col_data.std()
            })
        elif pd.api.types.is_string_dtype(dtype) or isinstance(dtype, pd.CategoricalDtype):
            str_data = col_data.astype(str)
            lengths = str_data.map(len)
            if not str_data.empty:
                data.update({
                    'avg_length': lengths.mean(),
                    'min_length': lengths.min(),
                    'max_length': lengths.max(),
                    'shortest': str_data[lengths == lengths.min()].iloc[0],
                    'longest': str_data[lengths == lengths.max()].iloc[0]
                })

        summary.append(data)
        
    #force output column (shouldn't depend on types)
    result_df = pd.DataFrame(summary)
    for col in expected_custdescribe_columns:
      if col not in result_df.columns:
          result_df[col] = pd.NA
    result_df = result_df[expected_custdescribe_columns]
    
    # Set correct data types
    numeric_cols = ['count', 'unique', ' max freq', 'avg_length', 'min_length', 'max_length']
    for col in numeric_cols:
        if col in result_df.columns:
            result_df[col] = pd.to_numeric(result_df[col], errors='coerce')
            
    # Define columns to cast explicitly
    float_cols = ['avg_length']
    int_cols = ['count', 'unique', 'max freq', 'min_length', 'max_length']

    for col in float_cols:
       if col in result_df.columns:
            result_df[col] = pd.to_numeric(result_df[col], errors='coerce')

    for col in int_cols:
        if col in result_df.columns:
            result_df[col] = pd.to_numeric(result_df[col], errors='coerce').astype('Int64')
    
    conflicting_cols = ['count', 'unique', 'top', 'freq', 'min', 'max','mean','std']  
    base_summary = base_summary.drop(columns=[col for col in conflicting_cols if col in base_summary.columns])        
    result_df = pd.merge(result_df, base_summary, on='field_name', how='left')
    # Cast string columns. When potentially mixed result, set object. 
    result_df['field_name'] = result_df['field_name'].astype('string')
    result_df['type'] = result_df['type'].astype('string')
    result_df['most freq value'] = result_df['most freq value'].astype('object')
    result_df['least freq value'] = result_df['least freq value'].astype('object')
    result_df['shortest'] = result_df['shortest'].astype('object')
    result_df['longest'] = result_df['longest'].astype('object')
    result_df['min'] = result_df['min'].astype('object')
    result_df['max'] = result_df['max'].astype('object')
    result_df['mean'] = result_df['mean'].astype('object')
    result_df['std'] = result_df['std'].astype('object')
    result_df['25%'] = result_df['25%'].astype('object')
    result_df['50%'] = result_df['50%'].astype('object')
    result_df['75%'] = result_df['75%'].astype('object')
    if orientation == 'columns_as_column':
        result_df = result_df.set_index("field_name").transpose().reset_index().rename(columns={'index': 'stat'})
    return result_df
    `;
    return [SummaryFunction];
  }
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    const statisticsType = config.statisticsType;
    const pivot = config.pivot;
    let orientation="";
    let code = `# Generate summary statistics\n`;

    // Handle subset selection based on statisticsType.
    if (statisticsType === "select") {
      const selectedColumns = config.columns.map((col: any) => col.value);
      code += `df_subset = ${inputName}[${JSON.stringify(selectedColumns)}]\n`;
    } else if (statisticsType === "numerical") {
      code += `df_subset = ${inputName}.select_dtypes(include=['number'])\n`;
    } else if (statisticsType === "categorical") {
      code += `df_subset = ${inputName}.select_dtypes(include=['object', 'category'])\n`;
    } else {
      code += `df_subset = ${inputName}\n`;
    }

    // Apply pivot if specified.
    if (pivot === "rows") {
      //code += `${outputName} = ${outputName}.transpose()\n`;
      orientation="columns_as_row"
    } else {
      orientation="columns_as_column"
    }
    //execute the function
    code += `
# Execute the detect unique key function
${outputName} = []
${outputName} = describe_dataset(df_subset, 'all', '${orientation}')
del df_subset
    `;
    return code + '\n';
  }
}
