import { jsonIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { ExpandList } from './ExpandList';
import { FlattenJSON } from './FlattenJSON';

export class JSONTools extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		toolType: "expandList",
		boolean_keepColumns: true,
		boolean_alllevels: true,
        selectCustomizable_levelseparator	: "."
	};
	//this tool is actually linked to two components
    const expandListComponent = new ExpandList();
    const flattenJSONComponent = new FlattenJSON();

    const expandListFields = expandListComponent._form['fields'].map(field => ({
      ...field,
      condition: { toolType: ["expandList"], ...(field.condition || {}) }
    }));

    const flattenJSONFields = flattenJSONComponent._form['fields'].map(field => ({
      ...field,
      condition: { toolType: ["flattenJSON"], ...(field.condition || {}) }
    }));

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "JSON Tool",
          id: "toolType",
          options: [
            { value: "expandList", label: "Expand JSON List" },
            { value: "flattenJSON", label: "Flatten JSON" }
          ]
        },
        ...expandListFields,
        ...flattenJSONFields
      ]
    };

    const description =
      "JSON Tools lets you choose between expanding a JSON list into columns or flattening a JSON object column.";

    super("JSON Tools", "jsonTools", description, "pandas_df_processor", [], "transforms", jsonIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    // No extra runtime dependencies beyond those of the selected tool
    return [];
  }

  public provideImports({ config }): string[] {
    const tool = config.toolType;
    const importsSets: string[] = [];

    if (tool === "expandList") {
      const expand = new ExpandList();
      importsSets.push(...expand.provideImports({ config }));
    } else if (tool === "flattenJSON") {
      const flatten = new FlattenJSON();
      importsSets.push(...flatten.provideImports({ config }));
    }

    // Deduplicate while preserving order
    const seen = new Set<string>();
    return importsSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const tool = config.toolType;

    if (tool === "expandList") {
      const expand = new ExpandList();
      return expand.generateComponentCode({ config, inputName, outputName });
    }
    if (tool === "flattenJSON") {
      const flatten = new FlattenJSON();
      return flatten.generateComponentCode({ config, inputName, outputName });
    }
    return "";
  }
}
