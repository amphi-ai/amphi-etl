import { calendarIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';// Adjust the import path

export class DateTimeConverter extends BaseCoreComponent {
    constructor() {
        const defaultConfig = { conversionType: "stringToDate", language: "en_US.UTF-8", dateTimeFormat: "%d-%m-%Y" };
        const form = {
            idPrefix: "component__form",
            fields: [
                {
                    type: "radio",
                    label: "Conversion Type",
                    id: "conversionType",
                    options: [
                        { value: "dateToString", label: "Date/Time to string" },
                        { value: "stringToDate", label: "String to Date/Time" }
                    ]
                },
                {
                    type: "column",
                    label: "Select column",
                    id: "dateTimeField",
                    placeholder: "Select column(s)"
                },
                {
                    type: "selectCustomizable",
                    label: "DateTime Language",
                    id: "language",
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
                    id: "dateTimeFormat",
                    tooltip: "Select pre-defined format or provide a custom strftime format used for the conversion (in both order)",
                    options: [
                        { value: "%A, %B %d, %Y", label: "day, dd Month, yyyy" },  // Monday, January 01, 2024
                        { value: "%d-%m-%Y", label: "dd-MM-yyyy" },  // 01-01-2024
                        { value: "%d/%m/%Y", label: "dd/MM/yyyy" },  // 01/01/2024
                        { value: "%Y-%m-%d", label: "yyyy-MM-dd" },  // 2024-01-01
                        { value: "%Y/%m/%d", label: "yyyy/MM/dd" },  // 2024/01/01
                        { value: "%B %d, %Y", label: "Month dd, yyyy" },  // January 01, 2024
                        { value: "%m/%d/%Y", label: "MM/dd/yyyy" },  // 01/01/2024
                        { value: "%m-%d-%Y", label: "MM-dd-yyyy" },  // 01-01-2024
                        { value: "%d %b %Y", label: "dd Mon yyyy" },  // 01 Jan 2024
                        { value: "%d %B %Y", label: "dd Month yyyy" },  // 01 January 2024
                        { value: "%d.%m.%Y", label: "dd.MM.yyyy" },  // 01.01.2024
                        { value: "%Y.%m.%d", label: "yyyy.MM.dd" },  // 2024.01.01
                        { value: "%b %d, %Y", label: "Mon dd, yyyy" },  // Jan 01, 2024
                        { value: "%a, %d %b %Y", label: "day, dd Mon yyyy" },  // Mon, 01 Jan 2024
                        { value: "%A, %d %B %Y", label: "day, dd Month yyyy" },  // Monday, 01 January 2024
                        { value: "%Y-%m-%d %H:%M:%S", label: "yyyy-MM-dd HH:mm:ss" },  // 2024-09-19 14:30:00
                        { value: "%d/%m/%Y %H:%M", label: "dd/MM/yyyy HH:mm" },  // 19/09/2024 14:30
                        { value: "%B %d, %Y %H:%M", label: "Month dd, yyyy HH:mm" }  // September 19, 2024 14:30
                    ]
                },
                {
                    type: "boolean",
                    label: "New Column",
                    id: "newColumn",
                    advanced: true
                },
                {
                    type: "input",
                    label: "New column name",
                    id: "newColumnName",
                    placeholder: "Type new column name",
                    condition: { newColumn: true },
                    advanced: true
                }
            ],
        };
        const description = "Use DateTime to convert between date/time formats and strings, allowing for custom formatting and language options.";

        super("DateTime Converter", "datetimeConverter", description, "pandas_df_processor", [], "transforms", calendarIcon, defaultConfig, form);
    }

    public provideImports({ config }): string[] {
        return ["from datetime import datetime", "import locale"];
    }

    public generateComponentCode({ config, inputName, outputName }) {
        const prefix = config?.backend?.prefix ?? "pd";        const { conversionType, dateTimeField, language, dateTimeFormat, newColumn } = config;

        // Extract column details
        const columnName = dateTimeField.value;
        const columnType = dateTimeField.type;
        const columnIsNamed = dateTimeField.named;
        const inputColumnReference = columnIsNamed ? `'${columnName}'` : columnName;

        // Determine the output column reference
        let outputColumnReference = inputColumnReference;
        if (newColumn) {
            const newColumnName = config.newColumnName && config.newColumnName.trim() ? config.newColumnName : `${columnName}_converted`;
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
            'zh_CN.UTF-8': 'Chinese_People\'s Republic of China',
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
        if (language) {
            let locale = language;

            // If Windows is detected, map the Linux locale to the equivalent Windows locale
            if (isWindows && localeMap[language]) {
                locale = localeMap[language];
            }

            code += `
# Set the locale for date parsing/formatting
locale.setlocale(locale.LC_TIME, '${locale}')
        `;
        }

        code += `
${outputName} = ${inputName}.copy()
`;

        if (conversionType === 'dateToString') {
            code += `
# Convert date/time column to string with specified format
${outputName}[${outputColumnReference}] = ${outputName}[${inputColumnReference}].dt.strftime('${dateTimeFormat}').astype('string')
`;
        } else if (conversionType === 'stringToDate') {
            code += `
# Convert string column to datetime with specified format
${outputName}[${outputColumnReference}] = ${prefix}.to_datetime(${outputName}[${inputColumnReference}], format='${dateTimeFormat}')
`;
        }

        return code;
    }


}