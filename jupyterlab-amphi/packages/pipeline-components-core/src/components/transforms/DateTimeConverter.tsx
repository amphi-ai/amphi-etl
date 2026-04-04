import { calendarIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class DateTimeConverter extends BaseCoreComponent {
    constructor() {
        const defaultConfig = {
		tsCFradioConversionType: "stringToDate",
		tsCFselectCustomizableLanguage: "en_US.UTF-8",
		tsCFselectCustomizableDateTimeFormat: "auto",
		tsCFbooleanNewColumn : false
		};
        const form = {
            idPrefix: "component__form",
            fields: [
                {
                    type: "radio",
                    label: "Conversion Type",
                    id: "tsCFradioConversionType",
                    options: [
                        { value: "dateToString", label: "Date/Time to string" },
                        { value: "stringToDate", label: "String to Date/Time" }
                    ]
                },
                {
                    type: "column",
                    label: "Select column",
                    id: "tsCFcolumnDateTimeField",
                    placeholder: "Select column(s)"
                },
                {
                    type: "selectCustomizable",
                    label: "DateTime Language",
                    id: "tsCFselectCustomizableLanguage",
                    tooltip: "Select language or provide custom locale for your system, POSIX-style locale identifier (Linux/Mac) or Windows locale names (Windows)",
                    options: [
                        { value: "en_US.UTF-8", label: "English (US)" },
                        { value: "en_GB.UTF-8", label: "English (UK)" },
                        { value: "fr_FR.UTF-8", label: "French (France)" },
                        { value: "de_DE.UTF-8", label: "German (Germany)" },
                        { value: "es_ES.UTF-8", label: "Spanish (Spain)" },
                        { value: "it_IT.UTF-8", label: "Italian (Italy)" },
                        { value: "pt_PT.UTF-8", label: "Portuguese (Portugal)" },
                        { value: "pt_BR.UTF-8", label: "Portuguese (Brazil)" },
                        { value: "ja_JP.UTF-8", label: "Japanese" },
                        { value: "ko_KR.UTF-8", label: "Korean" },
                        { value: "zh_CN.UTF-8", label: "Chinese (Simplified, China)" },
                        { value: "zh_TW.UTF-8", label: "Chinese (Traditional, Taiwan)" },
                        { value: "nl_NL.UTF-8", label: "Dutch (Netherlands)" },
                        { value: "ru_RU.UTF-8", label: "Russian" },
                        { value: "sv_SE.UTF-8", label: "Swedish (Sweden)" },
                        { value: "da_DK.UTF-8", label: "Danish (Denmark)" },
                        { value: "fi_FI.UTF-8", label: "Finnish (Finland)" },
                        { value: "nb_NO.UTF-8", label: "Norwegian (Norway)" },
                        { value: "pl_PL.UTF-8", label: "Polish (Poland)" },
                        { value: "tr_TR.UTF-8", label: "Turkish (Turkey)" },
                        { value: "cs_CZ.UTF-8", label: "Czech (Czech Republic)" },
                        { value: "hu_HU.UTF-8", label: "Hungarian (Hungary)" },
                        { value: "el_GR.UTF-8", label: "Greek (Greece)" }
                    ],
                    advanced: true
                },
                {
                    type: "selectCustomizable",
                    label: "Select the format",
                    id: "tsCFselectCustomizableDateTimeFormat",
                    tooltip: "Select pre-defined format or provide a custom strftime format used for the conversion (in both orders)",
                    condition: { tsCFradioConversionType: "dateToString"},
                    options: [
                        { value: "%A, %B %d, %Y", label: "day, dd Month, yyyy" },
                        { value: "%d-%m-%Y", label: "dd-MM-yyyy" },
                        { value: "%d/%m/%Y", label: "dd/MM/yyyy" },
                        { value: "%Y-%m-%d", label: "yyyy-MM-dd" },
                        { value: "%Y/%m/%d", label: "yyyy/MM/dd" },
                        { value: "%B %d, %Y", label: "Month dd, yyyy" },
                        { value: "%m/%d/%Y", label: "MM/dd/yyyy" },
                        { value: "%m-%d-%Y", label: "MM-dd-yyyy" },
                        { value: "%d %b %Y", label: "dd Mon yyyy" },
                        { value: "%d %B %Y", label: "dd Month yyyy" },
                        { value: "%d.%m.%Y", label: "dd.MM.yyyy" },
                        { value: "%Y.%m.%d", label: "yyyy.MM.dd" },
                        { value: "%b %d, %Y", label: "Mon dd, yyyy" },
                        { value: "%a, %d %b %Y", label: "day, dd Mon yyyy" },
                        { value: "%A, %d %B %Y", label: "day, dd Month yyyy" },
                        { value: "%Y-%m-%d %H:%M:%S", label: "yyyy-MM-dd HH:mm:ss" },
                        { value: "%d/%m/%Y %H:%M", label: "dd/MM/yyyy HH:mm" },
                        { value: "%B %d, %Y %H:%M", label: "Month dd, yyyy HH:mm" }
                    ]
                },
                {
                    type: "selectCustomizable",
                    label: "Select the format",
                    id: "tsCFselectCustomizableDateTimeFormat",
                    tooltip: "Select pre-defined format, Auto detect (selected by default) or provide a custom strftime format used for the conversion (in both orders)",
                    condition: { tsCFradioConversionType: "stringToDate"},
                    options: [
                        { value: "auto", label: "Auto detect" },
                        { value: "%A, %B %d, %Y", label: "day, dd Month, yyyy" },
                        { value: "%d-%m-%Y", label: "dd-MM-yyyy" },
                        { value: "%d/%m/%Y", label: "dd/MM/yyyy" },
                        { value: "%Y-%m-%d", label: "yyyy-MM-dd" },
                        { value: "%Y/%m/%d", label: "yyyy/MM/dd" },
                        { value: "%B %d, %Y", label: "Month dd, yyyy" },
                        { value: "%m/%d/%Y", label: "MM/dd/yyyy" },
                        { value: "%m-%d-%Y", label: "MM-dd-yyyy" },
                        { value: "%d %b %Y", label: "dd Mon yyyy" },
                        { value: "%d %B %Y", label: "dd Month yyyy" },
                        { value: "%d.%m.%Y", label: "dd.MM.yyyy" },
                        { value: "%Y.%m.%d", label: "yyyy.MM.dd" },
                        { value: "%b %d, %Y", label: "Mon dd, yyyy" },
                        { value: "%a, %d %b %Y", label: "day, dd Mon yyyy" },
                        { value: "%A, %d %B %Y", label: "day, dd Month yyyy" },
                        { value: "%Y-%m-%d %H:%M:%S", label: "yyyy-MM-dd HH:mm:ss" },
                        { value: "%d/%m/%Y %H:%M", label: "dd/MM/yyyy HH:mm" },
                        { value: "%B %d, %Y %H:%M", label: "Month dd, yyyy HH:mm" }
                    ]
                },
                {
                    type: "boolean",
                    label: "New Column",
                    id: "tsCFbooleanNewColumn",
                    advanced: true
                },
                {
                    type: "input",
                    label: "New column name",
                    id: "tsCFinputNewColumnName",
                    placeholder: "Type new column name",
                    condition: { tsCFbooleanNewColumn: true },
                    advanced: true
                }
            ],
        };
        const description = "Use DateTime to convert between date/time formats and strings, allowing for custom formatting and language options.";
        super("DateTime Converter", "datetimeConverter", description, "pandas_df_processor", [], "transforms", calendarIcon, defaultConfig, form);
    }

    public provideImports({ config }): string[] {
        return [
		"from datetime import datetime",
		"import locale"
		];
    }

    public generateComponentCode({ config, inputName, outputName }) {
        const prefix = config?.backend?.prefix ?? "pd";

        // Extract column details
        const columnName = config.tsCFcolumnDateTimeField.value;
        const columnIsNamed = config.tsCFcolumnDateTimeField.named;
        const inputColumnReference = columnIsNamed ? `'${columnName}'` : columnName;

        // Determine the output column reference
        let outputColumnReference = inputColumnReference;
        if (config.tsCFbooleanNewColumn) {
            const newColumnName = config.tsCFinputNewColumnName && config.tsCFinputNewColumnName.trim() ? config.tsCFinputNewColumnName : `${columnName}_converted`;
            outputColumnReference = `'${newColumnName}'`;
        }

        // The locale depends on the OS
        // Use user agent for best guess, otherwise fall back to Linux/Mac
        const isWindows = navigator.userAgent.includes('Windows');

        // Equivalence table between Linux/macOS and Windows locales
        const localeMap: { [key: string]: string } = {
            'en_US.UTF-8': 'English_United States',
            'en_GB.UTF-8': 'English_United Kingdom',
            'fr_FR.UTF-8': 'French_France',
            'de_DE.UTF-8': 'German_Germany',
            'es_ES.UTF-8': 'Spanish_Spain',
            'it_IT.UTF-8': 'Italian_Italy',
            'pt_PT.UTF-8': 'Portuguese_Portugal',
            'pt_BR.UTF-8': 'Portuguese_Brazil',
            'ja_JP.UTF-8': 'Japanese_Japan',
            'ko_KR.UTF-8': 'Korean_Korea',
            'zh_CN.UTF-8': "Chinese_People's Republic of China",
            'zh_TW.UTF-8': 'Chinese_Taiwan',
            'nl_NL.UTF-8': 'Dutch_Netherlands',
            'ru_RU.UTF-8': 'Russian_Russia',
            'sv_SE.UTF-8': 'Swedish_Sweden',
            'da_DK.UTF-8': 'Danish_Denmark',
            'fi_FI.UTF-8': 'Finnish_Finland',
            'nb_NO.UTF-8': 'Norwegian_Norway',
            'pl_PL.UTF-8': 'Polish_Poland',
            'tr_TR.UTF-8': 'Turkish_Turkey',
            'cs_CZ.UTF-8': 'Czech_Czech Republic',
            'hu_HU.UTF-8': 'Hungarian_Hungary',
            'el_GR.UTF-8': 'Greek_Greece'
        };

        let code = '';

        // Only set locale if language is specified
        if (config.tsCFselectCustomizableLanguage) {
            let locale = config.tsCFselectCustomizableLanguage;
            // If Windows is detected, map the Linux locale to the equivalent Windows locale
            if (isWindows && localeMap[config.tsCFselectCustomizableLanguage]) {
                locale = localeMap[config.tsCFselectCustomizableLanguage];
            }
            code += `
# Set the locale for date parsing/formatting
locale.setlocale(locale.LC_TIME, '${locale}')
        `;
        }

        code += `
${outputName} = ${inputName}.copy()
`;

        if (config.tsCFradioConversionType === 'dateToString') {
            code += `
# Convert date/time column to string with specified format
${outputName}[${outputColumnReference}] = ${outputName}[${inputColumnReference}].dt.strftime('${config.tsCFselectCustomizableDateTimeFormat}').astype('string')
`;
        } else if (config.tsCFradioConversionType === 'stringToDate') {
            if (config.tsCFselectCustomizableDateTimeFormat === 'auto') {
                code += `
# Convert string column to datetime with auto-detected format
${outputName}[${outputColumnReference}] = ${prefix}.to_datetime(${outputName}[${inputColumnReference}], infer_datetime_format=True)
`;
            } else {
                code += `
# Convert string column to datetime with specified format
${outputName}[${outputColumnReference}] = ${prefix}.to_datetime(${outputName}[${inputColumnReference}], format='${config.tsCFselectCustomizableDateTimeFormat}')
`;
            }
        }

        return code;
    }
}
