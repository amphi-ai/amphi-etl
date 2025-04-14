import { extractIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';



export class Extract extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {};
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
          type: "select",
          label: "Regular Expression",
          id: "regex",
          tooltip: "Select a type of data or custom regex",
          placeholder: "Select type or type regex",
          options: [
            { value: "(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)", label: "Email" },
            { value: "(https?://(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b(?:[-a-zA-Z0-9@:%_\\+.~#?&//=]*))", label: "URL" },
            { value: "(\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b)", label: "IPv4 Address" },
            { value: "(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})", label: "IPv6 Address" },
            { value: "(\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b)", label: "Credit Card" },
            { value: "(\\b\\d{3}-\\d{2}-\\d{4}\\b)", label: "SSN" },
            { value: "(\\b\\d{1,3}(\\.\\d{1,2})?%\\b)", label: "Percentage" },
            { value: "(\"([^\"\\\\]*(\\\\.[^\"\\\\]*)*))", label: "JSON String" },
            { value: "(\\b\\d{3}-\\d{10}\\b)", label: "ISBN" },
            { value: "custom", label: "Custom RegEx" },
          ]
        },
        {
          type: "codeTextarea",
          label: "Custom RegEx",
          tooltip: "Write a custom regex (PCRE: Perl Compatible Regular Expressions)",
          id: "customRegex",
          mode: "python",
          height: '300px',
          placeholder: "output = input",
          aiInstructions: "Generate only the raw regular expression pattern with at least one capturing group, no Python code, no quotes, and no prefix like r''. The regex should be compatible with pandas' .str.extract(). For example: ([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)",
          aiGeneration: true,
          aiPromptExamples: [
            { label: "Extract French phone numbers", value: "Write a RegEx to extract french phone numbers." },
            { label: "Extract dates", value: "Extract dates that matches format like 12/31/2025 or 31-12-2025." }
          ],
          advanced: true,
          condition: { regex: "custom" }
        },
        {
          type: "select",
          label: "Flags",
          id: "flags",
          placeholder: "Type or select",
          tooltip: "Choose a flag to modify how the regular expression behaves when parsing data in pandas. These flags control case sensitivity, multiline handling, Unicode matching, and more.",
          options: [
            { value: "IGNORECASE", label: "Ignore Case", tooltip: "Makes the match case-insensitive. For example, it will match both 'abc' and 'ABC'." },
            { value: "MULTILINE", label: "Multiline", tooltip: "Changes the behavior of ^ and $ to match the start and end of each line, not just the start and end of the whole string." },
            { value: "DOTALL", label: "Dot All", tooltip: "Makes the . match any character at all, including a newline; without this flag, . will match anything except a newline." },
            { value: "UNICODE", label: "Unicode", tooltip: "Makes \\w, \\W, \\b, \\B, \\d, \\D, \\s, and \\S sequences dependent on the Unicode character properties database. This is the default behavior in Python 3 for strings." },
            { value: "ASCII", label: "ASCII", tooltip: "Makes \\w, \\W, \\b, \\B, \\d, \\D, \\s, and \\S perform ASCII-only matching instead of full Unicode matching." },
            { value: "VERBOSE", label: "Verbose", tooltip: "Allows you to write regular expressions that are more readable by permitting whitespace and comments within the pattern string." }
          ],
          advanced: true
        }
      ],
    };
    const description = "Use Parse & Extract to parse data from columns based on a pattern (pre-defined RegEx or custom).";

    super("Parse & Extract", "extract", description, "pandas_df_processor", [], "transforms", extractIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import re"];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const columnName = config.column.value;
    const columnNamed = config.column.named;
    const columnAccess = columnNamed ? `'${columnName}'` : `${columnName}`;

    const isCustom = config.regex === 'custom';
    const regex = isCustom && config.customRegex ? config.customRegex : config.regex;

    let flagsCode = '';
    if (config.flags && config.flags.trim() !== '') {
      const flags = config.flags.split(',')
        .filter(flag => flag.trim() !== '')
        .map(flag => `re.${flag}`)
        .join(' | ');
      flagsCode = `, flags=${flags}`;
    }

    const groupCount = (new RegExp(regex + '|')).exec('')?.length - 1 || 1;
    const columnNames = Array.from({ length: groupCount }, (_, i) => `"${outputName}_${i + 1}"`).join(', ');
    const extractedVarName = `${outputName}_extracted`;

    const code = `
# Extract data using regex
${extractedVarName} = ${inputName}[${columnAccess}].str.extract(r"""${regex}"""${flagsCode})
${extractedVarName}.columns = [${columnNames}]
${outputName} = ${inputName}.join(${extractedVarName}, rsuffix="_extracted")
`;
    return code;
  }

}