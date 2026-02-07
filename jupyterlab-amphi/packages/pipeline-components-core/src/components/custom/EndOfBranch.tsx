import { codeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent'; // Adjust the import path

export class EndOfBranch extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { inputName: "" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          label: "Stop, End of this Branch, Row",
          id: "instructions",
          text: "This is the component, that stop, end this branch, row.",
        } 
      ],
    };

    const description = "Use this component, when you want to stop, end this branch, row.";

    super("Stop, End", "endOfBranch", description, "pandas_df_output", [], "outputs", codeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [];
  }

  public provideDependencies({ config }): string[] { 
    return [];
  }

  public generateComponentCode({ config, inputName }): string { 
    console.log("With config:", config);

    return `\n
    # End of Branch reached. No further processing. 
    print(f"End of branch reached for customTitle: ${config.customTitle}")
    \n`;
  }
}
