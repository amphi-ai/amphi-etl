import { generateCalendarIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class GenerateCalendar extends BaseCoreComponent {
  constructor() {
    const description = 'Generate a Calendar';
    const defaultConfig = {
        tsCFdateFromDate:"",
        tsCFbooleanFromToday:true,
        tsCFinputNumberFromXBack:"",
        tsCFselectFromWhatBack:"days",
        //tsCFcolumnFromColumn:"",
        tsCFdateToDate:"",
        tsCFbooleanToToday:true,
        tsCFinputNumberToXAhead:"",
        tsCFselectToWhatAhead:"days",
        //tsCFcolumnToColumn:"",
		tsCFselectMultipleCustomizableFieldsToInclude:["date"],
        // tsCFSelectinputEngine:"pandas",
        tsCFSelectoutputEngine:"pandas"
	};
    const form = {
      idPrefix: 'component__form_name_input_hello_df',
      fields: [
		{
          type: "date",
          label: "From Date",
          id: "tsCFdateFromDate",
          advanced: true
        },	  
        {
          type: "boolean",
          label: "From Today",
          id: "tsCFbooleanFromToday",
          advanced: true
        },
		{
          type: "inputNumber",
          label: "From X Back",
          id: "tsCFinputNumberFromXBack",
          advanced: true
        },
		{
          type: "select",
          label: "From what back",
          id: "tsCFselectFromWhatBack",
		  options: [
            { value: "days", label: "Days"},
            { value: "weeks", label: "Weeks"},
            { value: "months", label: "Months" },
			{ value: "years", label: "Years" }
          ],
          advanced: true
        },
		// {
          // type: "column",
          // label: "From Column",
          // id: "tsCFcolumnFromColumn",
          // advanced: true
        // },
		{
          type: "date",
          label: "To Date",
          id: "tsCFdateToDate",
          advanced: true
        },
		{
          type: "boolean",
          label: "To Today",
          id: "tsCFbooleanToToday",
          advanced: true
        },
		{
          type: "inputNumber",
          label: "To X Ahead",
          id: "tsCFinputNumberToXAhead",
          advanced: true
        },
		{
          type: "select",
          label: "To What Ahead",
          id: "tsCFselectToWhatAhead",
		  options: [
            { value: "days", label: "Days"},
            { value: "weeks", label: "Weeks"},
            { value: "months", label: "Months" },
			{ value: "years", label: "Years" }
          ],
          advanced: true
        },
		// {
          // type: "column",
          // label: "To Column",
          // id: "tsCFcolumnToColumn",
          // advanced: true
        // },
        {
          type: "selectMultipleCustomizable",
          label: "Fields to include",
          id: "tsCFselectMultipleCustomizableFieldsToInclude",
          options: [
            { value: "date", label: "Date" },
            { value: "year", label: "Year" },
            { value: "month_name", label: "Month Name" },
            { value: "month_number", label: " Month Number" },
            { value: "weekday_name", label: "Weekday Name" },
            { value: "weekday_number", label: "Weekday Number" },
            { value: "week", label: "Week" },
            { value: "weekend_flag", label: "Week-End Flag" }
          ],
          advanced: true
        },		
		// {
          // type: "select",
          // label: "Input Engine",
          // id: "tsCFSelectinputEngine",
		  // options: [
            // { value: "pandas", label: "Pandas", tooltip: "Mature, easy-to-use, great for small-to-medium datasets." },
            // { value: "polars", label: "Polars", tooltip: "Fast, memory-efficient, great for large-scale in-memory analytics." },
            // { value: "duckdb", label: "DuckDB", tooltip: "SQL-based, excellent for large datasets" }
          // ],
          // advanced: true
        // },
		{
          type: "select",
          label: "Output Engine",
          id: "tsCFSelectoutputEngine",
		  options: [
            { value: "pandas", label: "Pandas", tooltip: "Mature, easy-to-use, great for small-to-medium datasets." },
            { value: "polars", label: "Polars", tooltip: "Fast, memory-efficient, great for large-scale in-memory analytics." },
            { value: "duckdb", label: "DuckDB", tooltip: "SQL-based, excellent for large datasets" }
          ],
          advanced: true
        },
      ],
    };


    super('Generate Calendar', 'GenerateCalendar', description, 'pandas_df_input', [], 'inputs', generateCalendarIcon, defaultConfig, form);
  }

  provideImports() {
    return [
"from datetime import date, datetime",
"from dateutil.relativedelta import relativedelta",
"import pandas as pd",
"import polars as pl",
"import duckdb",
"from typing import Optional, Union, Dict, Tuple, List"
];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsGenerateCalendarFunction = `
def py_fn_generate_calendar(
    py_arg_from_date: date = None,
    py_arg_from_today: bool = False,
    py_arg_from_x_back: int = None,
    py_arg_from_what_back: str = None,
    py_arg_from_dataframe: pd.DataFrame = None,
    py_arg_from_column: str = None,
    py_arg_to_date: date = None,
    py_arg_to_today: bool = False,
    py_arg_to_column: str = None,
    py_arg_to_x_ahead: int = None,
    py_arg_to_what_ahead: str = None,
    py_arg_to_dataframe: pd.DataFrame = None,
    py_arg_calendar_fields_to_include: List[str] = None,
    py_arg_input_engine: str = "pandas",
    py_arg_output_engine: str = "pandas"
):
    """
    Generate a calendar dataframe between a computed start date and end date.

    The start ("from") and end ("to") dates can be derived from:
    - Explicit dates
    - Today
    - Relative offsets (days, weeks, months, years)


    The output calendar can include optional date-related attributes such as
    year, month, weekday, week number, and weekend flag.

    Supported engines:
    - pandas
    - polars
    - duckdb (via pandas intermediary)

    Returns
    -------
    pandas.DataFrame | polars.DataFrame | duckdb relation
        Calendar dataframe in the requested output engine.
    """

    # -----------------------------
    # Helper: resolve base date
    # -----------------------------
    def py_fn_resolve_base_date(
        py_arg_date,
        py_arg_today,
        py_arg_dataframe,
        py_arg_column,
        py_arg_engine,
        py_arg_minmax,
    ):
        if py_arg_date is not None:
            return pd.to_datetime(py_arg_date).date()

        if py_arg_today:
            return date.today()

        raise ValueError("Unable to resolve base date")

    # -----------------------------
    # Helper: apply offset
    # -----------------------------
    def py_fn_apply_calendar_offset(
    py_arg_base_date,
    py_arg_x,
    py_arg_what,
    py_arg_direction
    ):
        if py_arg_x is None or py_arg_what is None:
            return py_arg_base_date

        py_var_multiplier = -1 if py_arg_direction == "back" else 1

        if py_arg_what == "days":
            return py_arg_base_date + relativedelta(days=py_var_multiplier * py_arg_x)
        if py_arg_what == "weeks":
            return py_arg_base_date + relativedelta(weeks=py_var_multiplier * py_arg_x)
        if py_arg_what == "months":
            return py_arg_base_date + relativedelta(months=py_var_multiplier * py_arg_x)
        if py_arg_what == "years":
            return py_arg_base_date + relativedelta(years=py_var_multiplier * py_arg_x)

        raise ValueError("Invalid offset unit")

    # -----------------------------
    # Resolve FROM date
    # -----------------------------
    py_var_from_base_date = py_fn_resolve_base_date(
        py_arg_from_date,
        py_arg_from_today,
        py_arg_from_dataframe,
        py_arg_from_column,
        py_arg_input_engine,
        py_arg_minmax="min",
    )

    py_var_from_date = py_fn_apply_calendar_offset(
        py_var_from_base_date,
        py_arg_from_x_back,
        py_arg_from_what_back,
        py_arg_direction="back",
    )

    # -----------------------------
    # Resolve TO date
    # -----------------------------
    py_var_to_base_date = py_fn_resolve_base_date(
        py_arg_to_date,
        py_arg_to_today,
        py_arg_to_dataframe,
        py_arg_to_column,
        py_arg_input_engine,
        py_arg_minmax="max",
    )

    py_var_to_date = py_fn_apply_calendar_offset(
        py_var_to_base_date,
        py_arg_to_x_ahead,
        py_arg_to_what_ahead,
        py_arg_direction="ahead",
    )

    if py_var_from_date > py_var_to_date:
        raise ValueError("py_var_from_date must be <= py_var_to_date")

    # -----------------------------
    # Generate calendar (pandas base)
    # -----------------------------
    py_df_calendar = pd.DataFrame(
        #{"calendar_date": pd.date_range(start=py_var_from_date, end=py_var_to_date, freq="D").date}
		{"calendar_date": pd.date_range(start=py_var_from_date, end=py_var_to_date, freq="D")}
    )
 
    # Use py_arg_calendar_fields_to_include to determine which fields to include
    if py_arg_calendar_fields_to_include is not None:
        if "year" in py_arg_calendar_fields_to_include:
            py_df_calendar["year"] = py_df_calendar["calendar_date"].dt.year
        if "month_number" in py_arg_calendar_fields_to_include:
            py_df_calendar["month_number"] = py_df_calendar["calendar_date"].dt.month
        if "month_name" in py_arg_calendar_fields_to_include:
            py_df_calendar["month_name"] = py_df_calendar["calendar_date"].dt.month_name().astype("string")
        if "weekday_number" in py_arg_calendar_fields_to_include:
            py_df_calendar["weekday_number"] = py_df_calendar["calendar_date"].dt.weekday + 1
        if "weekday_name" in py_arg_calendar_fields_to_include:
            py_df_calendar["weekday_name"] = py_df_calendar["calendar_date"].dt.day_name().astype("string")
        if "week" in py_arg_calendar_fields_to_include:
            py_df_calendar["week"] = py_df_calendar["calendar_date"].dt.isocalendar().week.astype(int)
        if "weekend_flag" in py_arg_calendar_fields_to_include:
            py_df_calendar["is_weekend"] = py_df_calendar["calendar_date"].dt.weekday >= 5
        if "date" not in py_arg_calendar_fields_to_include:
            py_df_calendar = py_df_calendar.drop(columns=["calendar_date"])
            #without calendar_date, you may have duplicates			
            py_df_calendar=py_df_calendar.drop_duplicates()
    else:
        # Default behavior if py_arg_calendar_fields_to_include is not provided
        py_df_calendar = py_df_calendar.drop(columns=["calendar_date"])
	
		
    # -----------------------------
    # Convert output engine
    # -----------------------------
    if py_arg_output_engine == "pandas":
        return py_df_calendar
    if py_arg_output_engine == "polars":
        return pl.from_pandas(py_df_calendar)
    if py_arg_output_engine == "duckdb":      
        return duckdb.from_df(py_df_calendar)
    raise ValueError("Unsupported output engine")
	    `;
    return [tsGenerateCalendarFunction];
  }
  generateComponentCode({ config, outputName }) {
	const tsConsFieldsToInclude = JSON.stringify(config.tsCFselectMultipleCustomizableFieldsToInclude);
   let tsConstFromDate = 'None';
    if (config.tsCFdateFromDate && config.tsCFdateFromDate.trim() !== '' 
	) {
      tsConstFromDate = '"' + config.tsCFdateFromDate+ '"';
    }
   let tsConstToDate = 'None';
    if (config.tsCFdateToDate && config.tsCFdateToDate.trim() !== '' 
	) {
      tsConstToDate = '"' + config.tsCFdateToDate+ '"';
    }
   let tsConstFromWhatBack = 'None';
    if (config.tsCFselectFromWhatBack && config.tsCFselectFromWhatBack.trim() !== '' 
	) {
      tsConstFromWhatBack = '"' + config.tsCFselectFromWhatBack+ '"';
    }	
   let tsConstToWhatAhead = 'None';
    if (config.tsCFselectToWhatAhead && config.tsCFselectToWhatAhead.trim() !== '' 
	) {
      tsConstToWhatAhead = '"' + config.tsCFselectToWhatAhead+ '"';
    }
   let tsConstFromXBack =0;
    if (config.tsCFinputNumberFromXBack
	) {
      tsConstFromXBack = config.tsCFinputNumberFromXBack;
    }	
   let tsConstToXAhead = 0;
    if (config.tsCFinputNumberToXAhead 
	) {
      tsConstToXAhead =  config.tsCFinputNumberToXAhead;
    }	
	let tsConstFromToday = config.tsCFbooleanFromToday ? 'True' : 'False';
	let tsConstToToday = config.tsCFbooleanToToday ? 'True' : 'False';
    return `
${outputName}=py_fn_generate_calendar(
    py_arg_from_date = ${tsConstFromDate},
    py_arg_from_today = ${tsConstFromToday},
    py_arg_from_x_back = ${tsConstFromXBack},
    py_arg_from_what_back = ${tsConstFromWhatBack},

    py_arg_to_date = ${tsConstToDate},
    py_arg_to_today = ${tsConstToToday},
    py_arg_to_x_ahead = ${tsConstToXAhead},
    py_arg_to_what_ahead = ${tsConstToWhatAhead},
    py_arg_calendar_fields_to_include = ${tsConsFieldsToInclude},
    #py_arg_input_engine = '${config.tsCFSelectoutputEngine}', #replace by input
    py_arg_output_engine = '${config.tsCFSelectoutputEngine}'
    )
`.trim();
  }
}
