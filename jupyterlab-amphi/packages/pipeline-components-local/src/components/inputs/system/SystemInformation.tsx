// Import necessary icons and the base component
import { systemInformationIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

// Main component definition
export class SystemInformation extends BaseCoreComponent {
  
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
          id: "instructions",
          text: "Available fields may depend on the Operating System",
          advanced: false // No expandable options
        }
      ]
    };

    // Tooltip description for the component in the menu
    const description = "Information about your system";

    // Call the parent class constructor with component details
    super(
      "System Information",    // Display name
      "system_informations",   // Component ID
      description,             // Description
      "pandas_df_input",       // Component type
      [],                      // File drop (unused)
      "inputs.System",         // Category
      systemInformationIcon,  // Component icon
      defaultConfig,           // Default configuration
      form                     // Form structure
    );
  }

  // List of additional Python package imports required for this component
  public provideImports({ config }): string[] {
    return [
      "import os",
      "import pandas as pd",
      "import platform",
      "import socket",
      "import psutil",
      "import datetime",
      "import sys",
      "import subprocess"
    ];
  }

  // Define the Python function to fetch system information
  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";

    const SystemInformationFunction = `
def get_gpu_info():
    """Retrieve GPU information based on the operating system."""
    try:
        if platform.system() == "Windows":
            output = subprocess.check_output("wmic path win32_VideoController get Name", shell=True).decode()
            gpus = [line.strip() for line in output.split('\\n') if line.strip() and "Name" not in line]
            return ', '.join(gpus) if gpus else "N/A"

        elif platform.system() == "Darwin":  # macOS
            output = subprocess.check_output("system_profiler SPDisplaysDataType | grep Chip", shell=True).decode()
            gpus = [line.split(":")[-1].strip() for line in output.split('\\n') if "Chip" in line]
            return ', '.join(gpus) if gpus else "N/A"

        elif platform.system() == "Linux":
            output = subprocess.check_output("lspci | grep VGA", shell=True).decode()
            gpus = [line.split(':')[-1].strip() for line in output.split('\\n') if line.strip()]
            return ', '.join(gpus) if gpus else "N/A"

    except Exception:
        return "N/A"

    return "N/A"

def system_informations():
    """Gather system information including OS, hardware, and network details."""

    # Operating System details
    os_name = platform.system()
    os_version = platform.version()
    os_release = platform.release()

    # User Account information
    user_account = os.getlogin() if hasattr(os, 'getlogin') else 'N/A'

    # Machine and Network details
    machine_name = socket.gethostname()
    domain = socket.getfqdn()

    # RAM details (in GB)
    total_ram = round(psutil.virtual_memory().total / (1024 ** 3), 2)
    free_ram = round(psutil.virtual_memory().available / (1024 ** 3), 2)

    # CPU details
    cpu_name = platform.processor() or "N/A"
    cpu_count = psutil.cpu_count(logical=True)

    # GPU details
    gpu_info = get_gpu_info()

    # UTC Offset
    utc_offset = datetime.datetime.now(datetime.timezone.utc).astimezone().utcoffset()

    # Current working directory
    current_directory = os.getcwd()

    # Convert information into a Pandas DataFrame
    result = ${prefix}.DataFrame([{
        "Operating System": f"{os_name} {os_release} (Version: {os_version})",
        "User Account": user_account,
        "Machine Name": machine_name,
        "Domain": domain,
        "Total RAM (GB)": total_ram,
        "Free RAM (GB)": free_ram,
        "CPU Name": cpu_name,
        "CPU Cores": cpu_count,
        "GPU": gpu_info,
        "UTC Offset": str(utc_offset),
        "Current Directory": current_directory
    }])

    # Convert string-based columns to a proper type
    cols_to_convert = [
        "Operating System", "User Account", "Machine Name",
        "Domain", "GPU", "UTC Offset", "Current Directory"
    ]
    result[cols_to_convert] = result[cols_to_convert].astype("string")

    return result
    `;

    return [SystemInformationFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, outputName }: { config: any; outputName: string }): string {
    console.log("Generated outputName:", outputName);  // Debugging output

    return `
# Execute the system information retrieval function
${outputName} = []
${outputName} = system_informations()
    `;
  }
}
