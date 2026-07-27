import { calendarIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class DateTimeConverter extends BaseCoreComponent {
    constructor() {
        const defaultConfig = {
        tsCFradioConversionType: "string_to_datetime",
        tsCFcolumnsDateTimeField : [],
        tsCFselectCustomizableLanguage: "English (US)",
        tsCFselectCustomizableDateTimeFormat: "auto",
        tsCFbooleanCreateNewColumn : false,
        tsCFselectTokenizationNewColumnName : [],
        tsCFselectErrorHandling : "warning"
        };
        const form = {
            idPrefix: "component__form",
            fields: [
                {
                    type: "radio",
                    label: "Conversion Type",
                    id: "tsCFradioConversionType",
                    options: [
                        { value: "datetime_to_string", label: "Date/Time to string" },
                        { value: "string_to_datetime", label: "String to Date/Time" }
                    ]
                },
                {
                    type: "columns",
                    label: "Select column(s) to convert",
                    id: "tsCFcolumnsDateTimeField",
                    placeholder: "Select column(s)"
                },
                {
                    type: "selectCustomizable",
                    label: "DateTime Language",
                    id: "tsCFselectCustomizableLanguage",
                    tooltip: "Select language or provide custom locale for your system, POSIX-style locale identifier (Linux/Mac) or Windows locale names (Windows)",
                    options: [
                        { value: "English (US)", label: "English (US)" },
                        { value: "English (UK)", label: "English (UK)" },
                        { value: "French (France)", label: "French (France)" },
                        { value: "German (Germany)", label: "German (Germany)" },
                        { value: "Spanish (Spain)", label: "Spanish (Spain)" },
                        { value: "Italian (Italy)", label: "Italian (Italy)" },
                        { value: "Portuguese (Portugal)", label: "Portuguese (Portugal)" },
                        { value: "Portuguese (Brazil)", label: "Portuguese (Brazil)" },
                        { value: "Japanese", label: "Japanese" },
                        { value: "Korean", label: "Korean" },
                        { value: "Chinese (Simplified, China)", label: "Chinese (Simplified, China)" },
                        { value: "Chinese (Traditional, Taiwan)", label: "Chinese (Traditional, Taiwan)" },
                        { value: "Dutch (Netherlands", label: "Dutch (Netherlands)" },
                        { value: "Russian", label: "Russian" },
                        { value: "Swedish (Sweden)", label: "Swedish (Sweden)" },
                        { value: "Danish (Denmark)", label: "Danish (Denmark)" },
                        { value: "Finnish (Finland)", label: "Finnish (Finland)" },
                        { value: "Norwegian (Norway)", label: "Norwegian (Norway)" },
                        { value: "Polish (Poland)", label: "Polish (Poland)" },
                        { value: "Turkish (Turkey)", label: "Turkish (Turkey)" },
                        { value: "Czech (Czech Republic)", label: "Czech (Czech Republic)" },
                        { value: "Hungarian (Hungary)", label: "Hungarian (Hungary)" },
                        { value: "Greek (Greece)", label: "Greek (Greece)" }
                    ],
                    advanced: true
                },
                {
                    type: "selectCustomizable",
                    label: "Select the format",
                    id: "tsCFselectCustomizableDateTimeFormat",
                    tooltip: "Select pre-defined format or provide a custom format (either yyyy-MM-dd or %Y-%m-%d style)",
                    options: [
                        { value: "auto", label: "auto" },
                        { value: "day, dd Month, yyyy", label: "day, dd Month, yyyy" },
                        { value: "dd-MM-yyyy", label: "dd-MM-yyyy" },
                        { value: "dd/MM/yyyy", label: "dd/MM/yyyy" },
                        { value: "yyyy-MM-dd", label: "yyyy-MM-dd" },
                        { value: "yyyy/MM/dd", label: "yyyy/MM/dd" },
                        { value: "Month dd, yyyy", label: "Month dd, yyyy" },
                        { value: "MM/dd/yyyy", label: "MM/dd/yyyy" },
                        { value: "MM-dd-yyyy", label: "MM-dd-yyyy" },
                        { value: "dd Mon yyyy", label: "dd Mon yyyy" },
                        { value: "dd Month yyyy", label: "dd Month yyyy" },
                        { value: "dd.MM.yyyy", label: "dd.MM.yyyy" },
                        { value: "yyyy.MM.dd", label: "yyyy.MM.dd" },
                        { value: "Mon dd, yyyy", label: "Mon dd, yyyy" },
                        { value: "day, dd Mon yyyy", label: "day, dd Mon yyyy" },
                        { value: "day, dd Month yyyy", label: "day, dd Month yyyy" },
                        { value: "yyyy-MM-dd HH:mm:ss", label: "yyyy-MM-dd HH:mm:ss" },
                        { value: "dd/MM/yyyy HH:mm", label: "dd/MM/yyyy HH:mm" },
                        { value: "Month dd, yyyy HH:mm", label: "Month dd, yyyy HH:mm" }
                    ]
                },
                {
                    type: "boolean",
                    label: "New Column",
                    id: "tsCFbooleanCreateNewColumn",
                    advanced: true
                },
                {
                    type: "selectTokenization",
                    label: "New column(s) name",
                    id: "tsCFselectTokenizationNewColumnName",
                    placeholder: "Type new column name",
                    options: [],
                    condition: { tsCFbooleanCreateNewColumn: true },
                    advanced: true
                },
                {
                    type: "select",
                    label: "Error handling",
                    id: "tsCFselectErrorHandling",
                    options: [
                        { value: "error", label: "Error" },
                        { value: "warning", label: "Warning" },
                        { value: "ignore", label: "Ignore" }
                    ]
                },
            ],
        };
        const description = "Convert between date/time formats and strings, allowing for custom formatting and language options.";
        super("DateTime Converter", "datetimeConverter", description, "pandas_df_processor", [], "transforms", calendarIcon, defaultConfig, form);
    }

    public provideImports({ config }): string[] {
        return [
        "from datetime import datetime",
        "import locale",
        "from __future__ import annotations",
        "import warnings",
        "from contextlib import contextmanager",
        "import pandas as pd",
        "import re"
        ];
    }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const DateTimeConverterFunction = `
def py_fn_datetime_conversion(
    py_arg_dataframe:pd.DataFrame,
    py_arg_columns:list[str],
    py_arg_create_new_columns:bool = False,
    py_arg_new_columns:list[str]|None = None,
    py_arg_direction:str = "string_to_datetime",
    py_arg_language:str = "English (US)",
    py_arg_datetime_format:str = "auto",
    py_arg_error_handling:str = "warning"
)->pd.DataFrame:
    """
    Convert one or more columns between string and datetime.
    
    Parameters
    ----------
    py_arg_dataframe:pd.DataFrame
        Concerned Dataframe
    py_arg_direction:str
        Direction:
        - string_to_datetime (default)
        - datetime_to_string
    py_arg_columns:list[str]
        columns to convert
    py_arg_create_new_columns:bool
        if creation of new columns, else modify the existing columns
    py_arg_new_columns:list[str]|None
        name of the new columns to create
    py_arg_language:str
        Language in the form English (US)
    py_arg_datetime_format:str
        Date/Time Format in the form dd-MM-yyyy
    py_arg_error_handling:str
        Error handling:
        - error
        - warning (default)
        - ignore

    Returns
    -------
    pd.DataFrame
        a Dataframe with the converted columns
        



    """
    LANGUAGE_MAPPING = {
        "English (US)": "en_US.UTF-8",
        "English (UK)": "en_GB.UTF-8",
        "French (France)": "fr_FR.UTF-8",
        "German (Germany)": "de_DE.UTF-8",
        "Spanish (Spain)": "es_ES.UTF-8",
        "Italian (Italy)": "it_IT.UTF-8",
        "Portuguese (Portugal)": "pt_PT.UTF-8",
        "Portuguese (Brazil)": "pt_BR.UTF-8",
        "Japanese": "ja_JP.UTF-8",
        "Korean": "ko_KR.UTF-8",
        "Chinese (Simplified, China)": "zh_CN.UTF-8",
        "Chinese (Traditional, Taiwan)": "zh_TW.UTF-8",
        "Dutch (Netherlands)": "nl_NL.UTF-8",
        "Russian": "ru_RU.UTF-8",
        "Swedish (Sweden)": "sv_SE.UTF-8",
        "Danish (Denmark)": "da_DK.UTF-8",
        "Finnish (Finland)": "fi_FI.UTF-8",
        "Norwegian (Norway)": "nb_NO.UTF-8",
        "Polish (Poland)": "pl_PL.UTF-8",
        "Turkish (Turkey)": "tr_TR.UTF-8",
        "Czech (Czech Republic)": "cs_CZ.UTF-8",
        "Hungarian (Hungary)": "hu_HU.UTF-8",
        "Greek (Greece)": "el_GR.UTF-8",
    }

    FORMAT_MAPPING = {
        "auto":"auto",
        "day, dd Month, yyyy":"%A, %B %d, %Y",
        "dd-MM-yyyy":"%d-%m-%Y",
        "dd/MM/yyyy":"%d/%m/%Y",
        "yyyy-MM-dd":"%Y-%m-%d",
        "yyyy/MM/dd":"%Y/%m/%d",
        "Month dd, yyyy":"%B %d, %Y",
        "MM/dd/yyyy":"%m/%d/%Y",
        "MM-dd-yyyy":"%m-%d-%Y",
        "dd Mon yyyy":"%d %b %Y",
        "dd Month yyyy":"%d %B %Y",
        "dd.MM.yyyy":"%d.%m.%Y",
        "yyyy.MM.dd":"%Y.%m.%d",
        "Mon dd, yyyy":"%b %d, %Y",
        "day, dd Mon yyyy":"%a, %d %b %Y",
        "day, dd Month yyyy":"%A, %d %B %Y",
        "yyyy-MM-dd HH:mm:ss":"%Y-%m-%d %H:%M:%S",
        "dd/MM/yyyy HH:mm":"%d/%m/%Y %H:%M",
        "Month dd, yyyy HH:mm":"%B %d, %Y %H:%M",
    }

    @contextmanager
    def _py_fn_locale(py_arg_locale:str):
        #purpose : 
        #Save the current locale.
        #Switch to the requested locale.
        #Perform the conversion.
        #Restore the original locale, even if an exception occurs.
        previous=locale.setlocale(locale.LC_TIME)
        try:
            locale.setlocale(locale.LC_TIME, py_arg_locale)
            yield
        finally:
            locale.setlocale(locale.LC_TIME, previous)

    _TOKEN_MAP = {
        "yyyy": "%Y",
        "Month": "%B",
        "Mon": "%b",
        "MM": "%m",
        "dd": "%d",
        "day": "%A",
        "HH": "%H",
        "mm": "%M",
        "ss": "%S",
        "nnnnnnnnn": "%f",  # nanoseconds -> microseconds (best Python supports)
        "ffffff": "%f",
    }

    _PATTERN = re.compile("|".join(sorted(_TOKEN_MAP, key=len, reverse=True)))

    def _to_python_datetime_format(py_arg_fmt: str) -> str:
        # Already a strftime format? Leave it alone.
        if "%" in py_arg_fmt:
            return py_arg_fmt

        return _PATTERN.sub(lambda m: _TOKEN_MAP[m.group()], py_arg_fmt)

    def _py_fn_validate_arguments(py_arg_direction:str,
        py_arg_columns:list[str],
        py_arg_create_new_columns:bool,
        py_arg_new_columns:list[str]|None,
        py_arg_error_handling:str)->None:
        if py_arg_direction not in ("string_to_datetime","datetime_to_string"):
            raise ValueError("Invalid direction.")
        if py_arg_error_handling not in ("error","warning","ignore"):
            raise ValueError("Invalid error handling.")
        if py_arg_create_new_columns:
            if py_arg_new_columns is None or len(py_arg_new_columns)!=len(py_arg_columns):
                raise ValueError("Invalid new columns.")

    _py_fn_validate_arguments(py_arg_direction,py_arg_columns,py_arg_create_new_columns,py_arg_new_columns,py_arg_error_handling)

##TODO allow to pass custom locale
    locale_name = LANGUAGE_MAPPING.get(py_arg_language, py_arg_language)
    fmt = _to_python_datetime_format(FORMAT_MAPPING.get(py_arg_datetime_format, py_arg_datetime_format))
    errors="raise" if py_arg_error_handling=="error" else "coerce"
    py_result_dataframe=py_arg_dataframe.copy()
    with _py_fn_locale(locale_name):
        for i,col in enumerate(py_arg_columns):
            destination=py_arg_new_columns[i] if py_arg_create_new_columns else col
            before_na=py_result_dataframe[col].isna().sum()
            if py_arg_direction=="string_to_datetime":
                if fmt=="auto":
                    converted=pd.to_datetime(py_result_dataframe[col],errors=errors)
                else:
                    converted=pd.to_datetime(py_result_dataframe[col],format=fmt,errors=errors)
            else:
                if fmt=="auto":
                    converted=pd.to_datetime(py_result_dataframe[col],errors=errors).astype('string')
                else:
                    converted=pd.to_datetime(py_result_dataframe[col],errors=errors).dt.strftime(fmt).astype('string')
                converted=converted.where(converted.notna(), pd.NA)
            py_result_dataframe[destination]=converted
            if py_arg_error_handling=="warning":
                after_na=py_result_dataframe[destination].isna().sum()
                invalid=max(0,after_na-before_na)
                if invalid:
                    warnings.warn(f"Column '{col}' contains {invalid} invalid value(s) that could not be converted.")
    return py_result_dataframe

    `;
    return [DateTimeConverterFunction];
  }
  
  
    public generateComponentCode({ config, inputName, outputName }) {
        const prefix = config?.backend?.prefix ?? "pd";

   //for select, radio, input, date..
   //initialization to None
    let tsConstConversionType = 'None';
    if (config.tsCFradioConversionType && config.tsCFradioConversionType.trim() !== '' 
    ) {
      tsConstConversionType = '"' + config.tsCFradioConversionType+ '"';
    }

    let tsConstLanguage = 'None';
    if (config.tsCFselectCustomizableLanguage && config.tsCFselectCustomizableLanguage.trim() !== '' 
	) {
      tsConstLanguage = '"' + config.tsCFselectCustomizableLanguage+ '"';
    }
	
    let tsConstDateTimeFormat = 'None';
    if (config.tsCFselectCustomizableDateTimeFormat && config.tsCFselectCustomizableDateTimeFormat.trim() !== '' 
	) {
      tsConstDateTimeFormat = '"' + config.tsCFselectCustomizableDateTimeFormat+ '"';
    }
    let tsConstErrorHandling = 'None';
    if (config.tsCFselectErrorHandling && config.tsCFselectErrorHandling.trim() !== '' 
	) {
      tsConstErrorHandling = '"' + config.tsCFselectErrorHandling+ '"';
    }
	
	
    //for select multiple, select multiple customizable..
	let tsConstRemoveUnwantedCharacters = 'None';
    if (config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters && config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters.length > 0
	) {
      tsConstRemoveUnwantedCharacters = JSON.stringify(config.tsCFselectMultipleCustomizableRemoveUnwantedCharacters);
    }	

	let tsConstNewColumnName = 'None';
    if (config.tsCFselectTokenizationNewColumnName && config.tsCFselectTokenizationNewColumnName.length > 0) {
      tsConstNewColumnName =  JSON.stringify(config.tsCFselectTokenizationNewColumnName);
    }

	//for boolean
	let tsConstCreateNewColumn = config.tsCFbooleanCreateNewColumn ? 'True' : 'False';

    //for columns,
	let tsConstDateTimeField = "None";
    if (config.tsCFcolumnsDateTimeField?.length > 0) {
      tsConstDateTimeField = `[${config.tsCFcolumnsDateTimeField
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }

    return `
${outputName} = py_fn_datetime_conversion(
    py_arg_dataframe=${inputName},
    py_arg_direction=${tsConstConversionType},
    py_arg_columns=${tsConstDateTimeField},
    py_arg_create_new_columns=${tsConstCreateNewColumn},
    py_arg_new_columns=${tsConstNewColumnName},
    py_arg_language=${tsConstLanguage},
    py_arg_datetime_format=${tsConstDateTimeFormat},
    py_arg_error_handling=${tsConstErrorHandling}
)
`;
  }
}