import { aiIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';
import { OpenAILookUp } from './OpenAILookUp';
import { OllamaLookUp } from './OllamaLookUp';

export class AIPrompts extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { provider: "openai" };

    const openaiComp = new OpenAILookUp();
    const ollamaComp = new OllamaLookUp();

    const openaiFields = openaiComp._form["fields"].map((field: any) => ({
      ...field,
      condition: { provider: ["openai"], ...(field.condition || {}) },
    }));

    const ollamaFields = ollamaComp._form["fields"].map((field: any) => ({
      ...field,
      condition: { provider: ["ollama"], ...(field.condition || {}) },
    }));

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "radio",
          label: "Provider",
          id: "provider",
          options: [
            { value: "openai", label: "OpenAI" },
            { value: "ollama", label: "Ollama" },
          ],
        },
        ...openaiFields,
        ...ollamaFields,
      ],
    };

    const description =
      "AI Prompts lets you choose OpenAI or Ollama, then runs the selected prompt per row to create a new column.";

    // Pick a neutral icon. Using OpenAI for the group.
    super("AI Prompts", "aiPrompts", description, "pandas_df_processor", [], "transforms", aiIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    if (config.provider === "ollama") return ["ollama"];
    if (config.provider === "openai") return ["openai"];
    return [];
  }

  public provideImports({ config }): string[] {
    const imports: string[] = [];
    if (config.provider === "openai") {
      const openaiComp = new OpenAILookUp();
      imports.push(...openaiComp.provideImports({ config }));
    } else if (config.provider === "ollama") {
      const ollamaComp = new OllamaLookUp();
      imports.push(...ollamaComp.provideImports({ config }));
    }
    const seen = new Set<string>();
    return imports.filter(i => (seen.has(i) ? false : (seen.add(i), true)));
  }

  public provideFunctions({ config }): string[] {
    if (config.provider === "openai") {
      const openaiComp = new OpenAILookUp();
      return openaiComp.provideFunctions({ config });
    }
    if (config.provider === "ollama") {
      const ollamaComp = new OllamaLookUp();
      return ollamaComp.provideFunctions({ config });
    }
    return [];
  }

  public generateComponentCode({ config, inputName, outputName }): string {
    if (config.provider === "openai") {
      const openaiComp = new OpenAILookUp();
      return openaiComp.generateComponentCode({ config, inputName, outputName });
    }
    if (config.provider === "ollama") {
      const ollamaComp = new OllamaLookUp();
      return ollamaComp.generateComponentCode({ config, inputName, outputName });
    }
    return "";
  }
}
