// Import necessary icons and the base component
import { PackagesListIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

// Main component definition
export class PackagesList extends BaseCoreComponent {
  
  // Constructor to define the component's structure
  constructor() {
    const defaultConfig = {};

    // Define the form structure
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",  // Form type
          label: "Info", // Display label
          id: "description",
          text: "List of the installed python packages",
          advanced: false // No expandable options
        }
      ]
    };

    // Tooltip description for the component in the menu
    const description = "List of the installed python packages";

    // Call the parent class constructor with component details
    super(
      "Packages List",    // Display name
      "packages_list",   // Component ID
      description,             // Description
      "pandas_df_input",       // Component type
      [],                      // File drop (unused)
      "developer",         // Category
      PackagesListIcon,  // Component icon
      defaultConfig,           // Default configuration
      form                     // Form structure
    );
  }

  // List of additional Python package imports required for this component
  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "import importlib.metadata",
	  "import datetime",
	  "import os",
	  "import sys"
    ];
  }

  // Define the Python function
  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";

    const PackagesListFunction = `

def packages_list():
    rows = []
    for dist in importlib.metadata.distributions():
        name = dist.metadata.get("Name") or ""
        version = dist.version or ""

        # approximate install date as a datetime object
        try:
            location = dist.locate_file("")
            ts = os.path.getmtime(location)
            install_date = datetime.datetime.fromtimestamp(ts)
        except Exception:
            install_date = pd.NaT  # use pandas Not-a-Time for missing values

        # check if global or in venv
        try:
            scope = "venv" if str(location).startswith(sys.prefix) else "global"
        except Exception:
            scope = pd.NA

        rows.append((str(name), str(version), install_date, scope))

    result = pd.DataFrame(rows, columns=["Package", "Version", "InstallDate", "Scope"])

    # normalize and enforce string dtype for text columns
    for col in ["Package", "Version", "Scope"]:
        result[col] = result[col].astype("string").str.strip()

    # sort alphabetically by package
    result = (
        result.assign(_sort_key=result["Package"].str.lower())
              .sort_values("_sort_key")
              .drop(columns="_sort_key")
              .reset_index(drop=True)
    )
    return result

# Example usage
output = packages_list()
    `;

    return [PackagesListFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, outputName }: { config: any; outputName: string }): string {
    console.log("Generated outputName:", outputName);  // Debugging output

    return `
# Execute the function
${outputName} = []
${outputName} = packages_list()
    `;
  }
}
