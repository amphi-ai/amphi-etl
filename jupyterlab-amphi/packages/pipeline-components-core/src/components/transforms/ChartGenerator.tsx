import { chartGeneratorIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class ChartGenerator extends BaseCoreComponent {
  constructor() {
    const description = 'Generate a Chart';
    const defaultConfig = {
        tsCFselectFigureType:"",
        //py_arg_X: str = None,
        //py_arg_Slice: str = None, #pie chart
        //tsCFY: str = None,
        tsCFkeyvalueColumnsSelectAggregation:"", //dict to define,
        tsCFcolumnGroupby:"",
        tsCFradioSort:"Asc", //maybe not on scatter
        tsCFselectSortAggregation:"",
        tsCFcolumnSortColumn:"",
        tsCFselectColor:"",
        tsCFselectColorAggregation:"",
        tsCFcolumnColorColumn:"",
        tsCFbooleanLegend:true,
        tsCFinputTitle:""//,
		//do not forget to change the name
        //tsCFXlabel: str = None,
        //tsCFYlabel: str = None,
        //tsCFSize: tuple = (10, 6),
        //tsCFMarker: str = 'o',
        //tsCFLineWidth: float = 1.0,
        //tsCFLineStyle: str = '-',
        //tsCFExplode: tuple = None,
        //tsCFShadow: bool = False,
        //tsCFStartAngle: float = 0,
        //tsCFAutoPct: str = '%1.1f%%',
        //tsCFPctDistance: float = 0.6,
        //tsCFLabelDistance: float = 1.1,
        //tsCFXAggregation: str = None,
        //tsCFYAggregation: str = None
	};
    const form = {
      idPrefix: 'component__form_name',
      fields: [
 		{
          type: "select",
          label: "Figure Type",
          id: "tsCFselectFigureType",
		  options: [
            { value: "bar", label: "Bar (Vertical)"},
            { value: "barh", label: "Bar (Horizontal)"},
            { value: "line", label: "Line" },
			//{ value: "scatter", label: "Scatter Plot" },
			{ value: "pie", label: "Years" }
          ],
          advanced: false
        },
        {
          type: "keyvalueColumnsSelect",
          label: "Aggregation",
          id: "tsCFkeyvalueColumnsSelectAggregation",
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
        },
	    {
          type: "column",
          label: "Group by",
          id: "tsCFcolumnGroupby",
          advanced: true
        },
		{
          type: "radio",
          label: "Sort",
          id: "tsCFradioSort",
          options: [
            { value: "Asc", label: "Ascending" },
            { value: "Desc", label: "Descending" }
          ],
          advanced: true
        },
	    {
          type: "column",
          label: "Sort Column",
          id: "tsCFcolumnSortColumn",
		  columnId: 1,		  
          advanced: true
        },
		{
          type: "select",
          label: "Sort Aggregation",
          id: "tsCFselectSortAggregation",
          placeholder: "Select column",
          options: [
            { value: "", label: "None", tooltip: "No aggregation" },		  
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
		  columnId: 1,
		  advanced: true
        },
	   {
          type: "select",
          label: "Default color",
          id: "tsCFselectColor",
		  options: [
            { value: "", label: "None"},
            { value: "blue", label: "Blue"},
            { value: "red", label: "Red" },
			{ value: "green", label: "Green" },
			{ value: "yellow", label: "Yellow" },
            { value: "orange", label: "Orange" },
			{ value: "black", label: "Black" }
          ],
          advanced: true
        },
		{
          type: "column",
          label: "Color Column",
		  columnId: 2,
          id: "tsCFcolumnColorColumn",
          advanced: true
        },
		{
          type: "select",
          label: "Color Aggregation",
          id: "tsCFselectColorAggregation",
          placeholder: "Select column",
          options: [
            { value: "", label: "None", tooltip: "No aggregation" },		  
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
		  columnId: 2,
		  advanced: true
        },
        {
          type: "boolean",
          label: "Display Legend",
          id: "tsCFbooleanLegend",
          advanced: true
        },
		{
          type: "input",
          label: "Title",
          id: "tsCFinputTitle",
          advanced: true
        } 
	  ]
    };

    super('Chart Generator', 'chart_generator', description, 'pandas_df_processor', [], 'exploration', chartGeneratorIcon, defaultConfig, form);
  }

  provideImports() {
    return [
"import pandas as pd",
"import matplotlib.pyplot as plt",
"import numpy as np",
"from typing import Dict, List,Union,Any"
];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsChartFunction = `
def py_fn_create_figure(
    py_arg_dataframe: pd.DataFrame,
    py_arg_figure_type: str,
    py_arg_x: str = None,
    py_arg_slice: str = None, #pie chart
    py_arg_y: str = None,
    py_arg_aggregation: dict = None,
    py_arg_groupby: str = None,
    py_arg_sort: str = 'None',
    py_arg_sort_aggregation: str = None,
    py_arg_sort_column: str = None,
    py_arg_color: str = 'blue',
    py_arg_color_aggregation: str = None,
    py_arg_color_column: str = None,
    py_arg_legend: bool = False,
    py_arg_title: str = None,
    py_arg_xlabel: str = None,
    py_arg_ylabel: str = None,
    py_arg_size: tuple = (10, 6),
    py_arg_marker: str = 'o',
    py_arg_linewidth: float = 1.0,
    py_arg_linestyle: str = '-',
    py_arg_explode: tuple = None,
    py_arg_shadow: bool = False,
    py_arg_startangle: float = 0,
    py_arg_autopct: str = '%1.1f%%',
    py_arg_pctdistance: float = 0.6,
    py_arg_labeldistance: float = 1.1,
    py_arg_x_aggregation: str = None,
    py_arg_y_aggregation: str = None
) -> plt.Figure:
    """
    Creates a matplotlib figure based on the input pandas DataFrame and the specified parameters.

    Parameters:
    - py_arg_dataframe (pd.DataFrame): The input DataFrame.
    - py_arg_figure_type (str): The type of figure to create (e.g., 'bar', 'barh' 'line', 'scatter', 'pie').
    - py_arg_x (str, optional): The column to use for the x-axis. Defaults to None.
    - py_arg_y (str, optional): The column to use for the y-axis. Defaults to None.
    - py_arg_aggregation (dict, optional): The aggregation to apply to the DataFrame. Defaults to None.
    - py_arg_groupby (str, optional): The column to group by. Defaults to None.
    - py_arg_sort (str, optional): The sort order. Defaults to 'None'.
    - py_arg_sort_aggregation (str, optional): The aggregation to use for sorting. Defaults to Asc.
    - py_arg_sort_column (str, optional): The column to use for sorting. Defaults to None.
    - py_arg_color (str, optional): The color of the bars, lines, or markers. Defaults to 'blue'.
    - py_arg_color_aggregation (str, optional): The aggregation to use for coloring. Defaults to None.
    - py_arg_color_column (str, optional): The column to use for coloring. Defaults to None.
    - py_arg_legend (bool, optional): Whether to display the legend. Defaults to False.
    - py_arg_title (str, optional): The title of the figure. Defaults to ''.
    - py_arg_xlabel (str, optional): The label for the x-axis. Defaults to None.
    - py_arg_ylabel (str, optional): The label for the y-axis. Defaults to None.
    - py_arg_size (tuple, optional): The size of the figure. Defaults to (10, 6).
    - py_arg_marker (str, optional): The marker style for scatter plots. Defaults to 'o'.
    - py_arg_linewidth (float, optional): The line width for line charts. Defaults to 1.0.
    - py_arg_linestyle (str, optional): The line style for line charts. Defaults to '-'.
    - py_arg_explode (tuple, optional): The fraction of the radius with which to offset each wedge. Defaults to None.
    - py_arg_shadow (bool, optional): Whether to draw a shadow beneath the pie. Defaults to False.
    - py_arg_startangle (float, optional): The angle by which the start of the pie is rotated, counterclockwise from the x-axis. Defaults to 0.
    - py_arg_autopct (str, optional): The format string for the percentage of each wedge. Defaults to '%1.1f%%'.
    - py_arg_pctdistance (float, optional): The ratio between the center of each pie slice and the start of the text. Defaults to 0.6.
    - py_arg_labeldistance (float, optional): The radial distance at which the pie labels are drawn. Defaults to 1.1.
    - py_arg_x_aggregation (str, optional) : aggregation to apply on x axis (scatter) 
    - py_arg_y_aggregation (str, optional) : aggregation to apply on y axis (scatter)
    Returns:
    - matplotlib.figure.Figure: The created figure.
    
    todo next versions : scatter plot (with optional agg for both axis and a mark)
    """

    def _py_fn_create_intermediary_dataframe(
        _py_arg_dataframe: pd.DataFrame,
        _py_arg_aggregation: Dict[str, Union[str, List[str]]] = None,
        _py_arg_groupby: Union[str, List[str], None] = None,
        _py_arg_sort_aggregation: str = None,
        _py_arg_sort_column: str = None,
        _py_arg_color_aggregation: str = None,
        _py_arg_color_column: str = None,
        _py_arg_x_aggregation: str = None,
        _py_arg_y_aggregation: str = None,
        _py_arg_x: str = None,
        _py_arg_sort_y: str = None,
    ) -> pd.DataFrame:

        df = _py_arg_dataframe.copy()
        def _py_fn_as_list(v: Any) -> List[Any]:
            if v is None:
                return []
            if isinstance(v, (list, tuple, set)):
                return list(v)
            return [v]

        def _py_fn_agg_label(agg: Any, col: str) -> str:
            name = getattr(agg, "__name__", str(agg))
            return f"{name.capitalize()} of {col}"

    # Normalize groupby to list
        groupby_cols = _py_fn_as_list(_py_arg_groupby)

    # -------------------------------------------------
    #  Ensure color column is preserved when no aggregation
    # -------------------------------------------------
        if _py_arg_color_column is not None and _py_arg_color_aggregation is None:
            if _py_arg_color_column not in groupby_cols:
                groupby_cols.append(_py_arg_color_column)

    # -------------------------------------------------
    # Merge all requested aggregations
    # -------------------------------------------------
        agg_map: Dict[str, Union[str, List[str]]] = dict(_py_arg_aggregation or {})

        def _py_fn_add_agg(col: str, agg: str):
            if col is None or agg is None:
                return
            if col in agg_map:
                existing = agg_map[col]
                if isinstance(existing, (list, tuple, set)):
                    if agg not in existing:
                        agg_map[col] = list(existing) + [agg]
                else:
                    if existing != agg:
                        agg_map[col] = [existing, agg]
            else:
                agg_map[col] = agg

        _py_fn_add_agg(_py_arg_sort_column, _py_arg_sort_aggregation)
        _py_fn_add_agg(_py_arg_color_column, _py_arg_color_aggregation)

    # -------------------------------------------------
    # If no aggregation → return original df
    # -------------------------------------------------
        if not agg_map:
            return df

    # -------------------------------------------------
    # With groupby
    # -------------------------------------------------
        if groupby_cols:
            named_aggs = {}

            for col, aggs in agg_map.items():
                for a in _py_fn_as_list(aggs):
                    named_aggs[_py_fn_agg_label(a, col)] = (col, a)

            df_out = (
                df.groupby(groupby_cols, dropna=False)
                  .agg(**named_aggs)
                  .reset_index()
            )

            return df_out

    # -------------------------------------------------
    # Without groupby → aggregate whole dataframe
    # -------------------------------------------------
        results = {}
        for col, aggs in agg_map.items():
            for a in _py_fn_as_list(aggs):
                results[_py_fn_agg_label(a, col)] = df[col].agg(a)

        return pd.DataFrame([results])

    # Create the intermediary DataFrame
    py_df_intermediary_dataframe = _py_fn_create_intermediary_dataframe(
        py_arg_dataframe,
        py_arg_aggregation,
        py_arg_groupby,
        py_arg_sort_aggregation,
        py_arg_sort_column,
        py_arg_color_aggregation,
        py_arg_color_column
    )
    
    def _py_fn_get_colors(df: pd.DataFrame, color_column: str, default_color: str):
        """
        Returns color array for matplotlib based on column type.
        - Numeric → continuous colormap
        - Categorical → discrete colormap
        - None → default single color
        """
        if color_column is None:
            return default_color, None

        if color_column not in df.columns:
            return default_color, None

        series = df[color_column]

        # Numeric coloring (continuous)
        if pd.api.types.is_numeric_dtype(series):
            norm = plt.Normalize(series.min(), series.max())
            cmap = plt.cm.viridis
            colors = cmap(norm(series.values))
            return colors, norm

        # Categorical coloring
        categories = series.astype(str)
        unique_categories = categories.unique()
        cmap = plt.cm.tab10
        color_map = {
            cat: cmap(i % 10)
            for i, cat in enumerate(unique_categories)
        }
        colors = categories.map(color_map).values
        return colors, None

    #label for main aggregation
    py_const_aggregation_col, py_const_aggregation_agg = next(iter(py_arg_aggregation.items()))
    py_const_aggregation_label = f"{py_const_aggregation_agg.capitalize()} of {py_const_aggregation_col}"

    # Create the figure
    fig, ax = plt.subplots(figsize=py_arg_size)

    # Set the title and labels
    ax.set_title(py_arg_title)
    ax.set_xlabel(py_arg_xlabel if py_arg_xlabel is not None else py_arg_x)
    ax.set_ylabel(py_arg_ylabel if py_arg_ylabel is not None else py_arg_y)

    # Determine the sort column
    if py_arg_sort_aggregation is not None and py_arg_sort_column is not None:
        sort_column = f"{py_arg_sort_aggregation.capitalize()} of {py_arg_sort_column}"
    else:
        sort_column = py_arg_sort_column

    # Determine the color column
    if py_arg_color_aggregation is not None and py_arg_color_column is not None:
        color_column = f"{py_arg_color_aggregation.capitalize()} of {py_arg_color_column}"
    elif py_arg_color_column is not None:
        color_column = py_arg_color_column      
    else:
        color_column = None

    # Sort the DataFrame if specified
    if py_arg_sort != 'None':
        ascending = py_arg_sort == 'Asc'
        py_df_intermediary_dataframe = py_df_intermediary_dataframe.sort_values(by=sort_column, ascending=ascending)

    # Create the figure based on the specified type
    if py_arg_figure_type == 'bar':
        y_values = py_df_intermediary_dataframe[py_const_aggregation_label]
        x_values = py_df_intermediary_dataframe[py_arg_groupby]
        ax.set_xlabel(py_const_aggregation_label)   
        ax.set_ylabel(py_arg_groupby)
        py_const_default_title=f"{py_const_aggregation_label} by {py_arg_groupby}"
        ax.set_title(py_arg_title if py_arg_title is not None else py_const_default_title)
        colors, norm = _py_fn_get_colors(
            py_df_intermediary_dataframe,
            color_column,
            py_arg_color
        )

        bars = ax.bar(x_values, y_values, color=colors)

        if norm is not None:
            sm = plt.cm.ScalarMappable(cmap=plt.cm.viridis, norm=norm)
            sm.set_array([])
            fig.colorbar(sm, ax=ax)
            

  
    elif py_arg_figure_type == 'barh':
        y_values = py_df_intermediary_dataframe[py_const_aggregation_label]
        x_values = py_df_intermediary_dataframe[py_arg_groupby]
        ax.set_xlabel(py_const_aggregation_label)   
        ax.set_ylabel(py_arg_groupby)
        colors, norm = _py_fn_get_colors(
            py_df_intermediary_dataframe,
            color_column,
            py_arg_color
        )
        py_const_default_title=f"{py_const_aggregation_label} by {py_arg_groupby}"
        ax.set_title(py_arg_title if py_arg_title is not None else py_const_default_title)
        
        bars = ax.barh(x_values, y_values, color=colors)

        if norm is not None:
            sm = plt.cm.ScalarMappable(cmap=plt.cm.viridis, norm=norm)
            sm.set_array([])
            fig.colorbar(sm, ax=ax)

    elif py_arg_figure_type == 'line':
        py_const_default_title=f"{py_const_aggregation_label} by {py_arg_groupby}"
        ax.set_title(py_arg_title if py_arg_title is not None else py_const_default_title)
        # Multiple lines by category (no aggregation on color column)
        if py_arg_color_column is not None and py_arg_color_aggregation is None:

            categories = py_df_intermediary_dataframe[py_arg_color_column].astype(str)
            unique_categories = categories.unique()

            cmap = plt.cm.tab10

            for i, category in enumerate(unique_categories):
                subset = py_df_intermediary_dataframe[
                    py_df_intermediary_dataframe[py_arg_color_column].astype(str) == category
                ]

                ax.plot(
                    subset[py_arg_groupby],
                    subset[py_const_aggregation_label],
                    label=str(category),
                    color=cmap(i % 10),
                    linewidth=py_arg_linewidth,
                    linestyle=py_arg_linestyle,
                    marker=py_arg_marker
                )

            ax.legend()

        else:
            # Standard single line behavior
            y_values = py_df_intermediary_dataframe[py_const_aggregation_label]
            x_values = py_df_intermediary_dataframe[py_arg_groupby]
            ax.plot(
                x_values,
                y_values,
                color=py_arg_color,
                linewidth=py_arg_linewidth,
                linestyle=py_arg_linestyle,
                marker=py_arg_marker
            )

            if py_arg_legend:
                ax.legend()


    elif py_arg_figure_type == 'scatter':
        x_values = py_df_intermediary_dataframe[py_arg_x]
        y_values = py_df_intermediary_dataframe[py_arg_y]

        colors, norm = _py_fn_get_colors(
            py_df_intermediary_dataframe,
            color_column,
            py_arg_color
        )

        sc = ax.scatter(
            x_values,
            y_values,
            s=None,
            c=colors if isinstance(colors, np.ndarray) else py_arg_color,
            marker=py_arg_marker
        )

        if norm is not None:
            sm = plt.cm.ScalarMappable(cmap=plt.cm.viridis, norm=norm)
            sm.set_array([])
            fig.colorbar(sm, ax=ax)


    elif py_arg_figure_type == 'pie':
        # Get the values and labels
        values = py_df_intermediary_dataframe[py_const_aggregation_label]
        labels = py_df_intermediary_dataframe[py_arg_groupby]
        py_const_default_title=f"{py_const_aggregation_label} by {py_arg_groupby}"
        ax.set_title(py_arg_title if py_arg_title is not None else py_const_default_title)
        #tot=sum(values)/100.0
        # Create the pie chart
        ax.pie(
            values,
            labels=labels,
            colors=plt.cm.viridis(np.linspace(0, 1, len(values))),
            explode=py_arg_explode,
            shadow=py_arg_shadow,
            startangle=py_arg_startangle,
            autopct=py_arg_autopct,
            #autopct=lambda x: "%d" % round(x*tot),
            pctdistance=py_arg_pctdistance,
            labeldistance=py_arg_labeldistance
        )
        # delete name for axis        
        ax.set_xlabel("")   
        ax.set_ylabel("")

        # Display the legend if specified
        if py_arg_legend:
            ax.legend()

    # Return the figure
    return fig
	    `;
    return [tsChartFunction];
  }
  generateComponentCode({ config, inputName, outputName }) {
		
	let tsConstFigureType = 'None';
    if (config.tsCFselectFigureType && config.tsCFselectFigureType.trim() !== '' 
	) {
      tsConstFigureType = '"' + config.tsCFselectFigureType+ '"';
    }
	let tsConstColor = 'None';
    if (config.tsCFselectColor && config.tsCFselectColor.trim() !== '' 
	) {
      tsConstColor = '"' + config.tsCFselectColor+ '"';
    }
	let tsConstSortAggregation = 'None';
	
    if (config.tsCFselectSortAggregation && config.tsCFselectSortAggregation.trim() !== '' 
	) {
      tsConstSortAggregation = '"' + config.tsCFselectSortAggregation+ '"';
    }
	let tsConstColorAggregation = 'None';
    if (config.tsCFselectColorAggregation && config.tsCFselectColorAggregation.trim() !== '' 
	) {
      tsConstColorAggregation = '"' + config.tsCFselectColorAggregation+ '"';
    }
	
	let tsConstbooleanLegend = config.tsCFbooleanLegend ? 'True' : 'False';
		
    let tsConstGroupby = 'None';
	if (config.tsCFcolumnGroupby && config.tsCFcolumnGroupby.value.trim() !== '' 
	) {
      tsConstGroupby = '"' + config.tsCFcolumnGroupby.value+ '"';
    }
    let tsConstSortColumn = 'None';
	if (config.tsCFcolumnSortColumn && config.tsCFcolumnSortColumn.value.trim() !== '' 
	) {
      tsConstSortColumn = '"' + config.tsCFcolumnSortColumn.value+ '"';
    }
    let tsConstColorColumn = 'None';
	if (config.tsCFcolumnColorColumn && config.tsCFcolumnColorColumn.value.trim() !== '' 
	) {
      tsConstColorColumn = '"' + config.tsCFcolumnColorColumn.value+ '"';
    }

    let tsConstTitle = 'None';
	if (config.tsCFinputTitle && config.tsCFinputTitle.trim() !== '' 
	) {
      tsConstTitle = '"' + config.tsCFinputTitle+ '"';
    }
	
	let tsConstSort = 'None';
	if (config.tsCFradioSort && config.tsCFradioSort.trim() !== '' 
	) {
      tsConstSort = '"' + config.tsCFradioSort+ '"';
    }
		
	// Start constructing the aggregation arguments dynamically. Target : {'Age': 'mean'}
    let tsConstAggregation = "";

    if (config.tsCFkeyvalueColumnsSelectAggregation && config.tsCFkeyvalueColumnsSelectAggregation.length > 0) {
      config.tsCFkeyvalueColumnsSelectAggregation.forEach((op, index) => {
        // Determine how to reference the column based on 'named'
        const tsConstcolumnReference = op.key.named ? `'${op.key.value}'` : op.key.value;
        const tsConstoperation = op.value.value;
        const tsConstcolumnName = op.key.named ? op.key.value : `col${op.key.value}`;
		
        // Construct each aggregation argument
        tsConstAggregation += `{${tsConstcolumnReference}: '${tsConstoperation}'}`;
        if (index < config.tsCFkeyvalueColumnsSelectAggregation.length - 1) {
          tsConstAggregation += ", ";
        }
      });
    }
	
    return `
${outputName}=py_fn_create_figure(
    py_arg_dataframe = ${inputName},
    py_arg_figure_type = ${tsConstFigureType},
    #py_arg_x = None,
    #py_arg_slice = None,
    #py_arg_y = None,
    py_arg_aggregation = ${tsConstAggregation},
    py_arg_groupby = ${tsConstGroupby},
    py_arg_sort = ${tsConstSort},
    py_arg_sort_aggregation = ${tsConstSortAggregation},
    py_arg_sort_column = ${tsConstSortColumn},
    py_arg_color = ${tsConstColor},
    py_arg_color_aggregation = ${tsConstColorAggregation},
    py_arg_color_column = ${tsConstColorColumn},
    py_arg_legend = ${tsConstbooleanLegend},
    py_arg_title = ${tsConstTitle},
    #py_arg_xlabel = None,
    #py_arg_ylabel = None,
    #py_arg_size = None,
    #py_arg_marker = None,
    #py_arg_linewidth = None,
    #py_arg_linestyle = None,
    #py_arg_explode = None,
    #py_arg_shadow = None,
    #py_arg_startangle = None,
    #y_arg_autopct = None,
    #py_arg_pctdistance = None,
    #py_arg_labeldistance = None,
    #py_arg_x_aggregation = None,
    #py_arg_y_aggregation = None
    )
`.trim();
  }
}

