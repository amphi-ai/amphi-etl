import { jsonIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';
import { ExpandList } from './ExpandList';
import { FlattenJSON } from './FlattenJSON';
import { ExplodeJSON } from './ExplodeJSON';
import { ValidateJSON } from './ValidateJSON';

export class JSONTools extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFradioToolType: "explodeJSON",
		tsCFbooleanAllLevels: true,
        tsCFcolumnColumnToExplode:"",
		tsCFbooleanKeepColumns:true,
        tsCFinputnumberMaxLevel:"",
		tsCFselectCustomizableLevelSeparator:".",
        tsCFbooleanPrefixTopLevel:true,
        tsCFbooleanFlattenArraysAsRows:true,
        tsCFbooleanFlattenObjectsAsColumns:true,
		tsCFbooleanKeepRawJson:true,
        tsCFselectoutputEngine:"pandas"
	};
	//this tool is actually linked to 4 components
	const explodeJSONComponent = new ExplodeJSON();
    const expandListComponent = new ExpandList();
    const flattenJSONComponent = new FlattenJSON();
    const validateJSONComponent = new ValidateJSON();

    const explodeJSONFields = explodeJSONComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["explodeJSON"], ...(field.condition || {}) }
    }));

    const expandListFields = expandListComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["expandList"], ...(field.condition || {}) }
    }));

    const flattenJSONFields = flattenJSONComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["flattenJSON"], ...(field.condition || {}) }
    }));

    const validateJSONFields = validateJSONComponent._form['fields'].map(field => ({
      ...field,
      condition: { tsCFradioToolType: ["validateJSON"], ...(field.condition || {}) }
    }));
	
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "JSON Tool",
          id: "tsCFradioToolType",
          options: [
            { value: "explodeJSON", label: "Explode JSON" },
            { value: "expandList", label: "Expand JSON List" },
            { value: "flattenJSON", label: "Flatten JSON" },
            { value: "validateJSON", label: "Validate JSON" }
          ]
        },
        ...explodeJSONFields,
        ...expandListFields,
        ...flattenJSONFields,
        ...validateJSONFields
      ]
    };

    const description =
      "Choose between validating, exploding, expanding a JSON list into columns or flattening a JSON object column.";

    super("JSON Tools", "jsonTools", description, "pandas_df_processor", [], "transforms", jsonIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    // No extra runtime dependencies beyond those of the selected tool
    return [];
  }
  public provideFunctions({ config }): string[] {
    if (config.tsCFradioToolType === 'explodeJSON' && typeof (ExplodeJSON as any).prototype.provideFunctions === 'function') {
      return new ExplodeJSON().provideFunctions({ config });
    } else if (config.tsCFradioToolType === 'validateJSON' && typeof (ValidateJSON as any).prototype.provideFunctions === 'function') {
      return new ValidateJSON().provideFunctions({ config });
    }
    return [];
  }
  
  public provideImports({ config }): string[] {
    const tool = config.tsCFradioToolType;
    const importsSets: string[] = [];

    if (tool === "expandList") {
      const expand = new ExpandList();
      importsSets.push(...expand.provideImports({ config }));
    } else if (tool === "flattenJSON") {
      const flatten = new FlattenJSON();
      importsSets.push(...flatten.provideImports({ config }));
    } else if (tool === "explodeJSON") {
      const explode = new ExplodeJSON();
      importsSets.push(...explode.provideImports({ config }));
    } else if (tool === "validateJSON") {
      const validate = new ValidateJSON();
      importsSets.push(...validate.provideImports({ config }));
    }

    // Deduplicate while preserving order
    const seen = new Set<string>();
    return importsSets.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    const tool = config.tsCFradioToolType;
    if (tool === "explodeJSON") {
      const explode = new ExplodeJSON();
      return explode.generateComponentCode({ config, inputName, outputName });
    }
    if (tool === "expandList") {
      const expand = new ExpandList();
      return expand.generateComponentCode({ config, inputName, outputName });
    }
    if (tool === "flattenJSON") {
      const flatten = new FlattenJSON();
      return flatten.generateComponentCode({ config, inputName, outputName });
    }
    if (tool === "validateJSON") {
      const validate = new ValidateJSON();
      return validate.generateComponentCode({ config, inputName, outputName });
    }
    return "";
  }
}
