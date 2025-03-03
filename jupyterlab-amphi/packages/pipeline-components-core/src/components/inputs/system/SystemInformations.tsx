//import of icons and BaseCoreComponent
import { systeminformationsIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

//main part
export class SystemInformations extends BaseCoreComponent {
//Typescript for form///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  constructor() {
    const defaultConfig = {};
    const form = {
      idPrefix: "component__form",
      fields: [
	  //one type, label.... by part of the form, separated by comma. The available forms are in amphi-etl\jupyterlab-amphi\packages\pipeline-components-manager\src\forms
	  //forms are displayed sequentially
	  //type : identification of the form. ⚠ it can be different of the file name. where is the good name?
	  //label : label that will be displayed on the top of the form
	  //tooltip : tooltip at the right 
	  //id : ?
	  //placeholders : ??
	  //advanced : you can develop/reduce the component (gear icon). default : true
        {
          type: "info",
          label: "Info",
          id: "instructions",
          text: "Available fields may depend of the Operating System",
		  advanced: false
        }
      ]
          
    };
	//tooltip of the component in the menu
    const description = "Informations about your system";
	//amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\components\BaseCoreComponent.tsx for the super function
	//(name (in the list),id,description,type (cf??),filedrop(??),category (not the label in the list, not the folder name.. but),icon,defaultConfig,form) 
    super("System Informations", "system_informations", description, "pandas_df_input", [], "inputs.System", systeminformationsIcon, defaultConfig, form);
  }
//end of form//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//list of additionnal python package we need to import
  public provideImports({ config }): string[] {
    let imports = ["import os"];
    imports.push("import pandas as pd");
    imports.push("import platform");
    imports.push("import socket");
    imports.push("import psutil");
    imports.push("import datetime");
    imports.push("import sys");
    imports.push("import subprocess");
    return imports;
  }
  
  //since the python code is pretty long, we use a function
  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Function to perform frequency analysis
    const SystemInformationsFunction = `
def get_gpu_info():
    if platform.system() == "Windows":
        try:
            # Run systeminfo and parse for GPU (DXDIAG can also be used)
            output = subprocess.check_output("wmic path win32_VideoController get Name", shell=True).decode()
            # \\ instead of \ for new line in order of escaping
            gpus = [line.strip() for line in output.split('\\n') if line.strip() and "Name" not in line]
            return ', '.join(gpus) if gpus else "N/A"
        except Exception:
            return "N/A"
    elif platform.system() == "Darwin":  # macOS
        try:
            output = subprocess.check_output("system_profiler SPDisplaysDataType | grep Chip", shell=True).decode()
            gpus = [line.split(":")[-1].strip() for line in output.split('\\n') if "Chip" in line]
            return ', '.join(gpus) if gpus else "N/A"
        except Exception:
            return "N/A"
    elif platform.system() == "Linux":
        try:
            output = subprocess.check_output("lspci | grep VGA", shell=True).decode()
            gpus = [line.split(':')[-1].strip() for line in output.split('\\n') if line.strip()]
            return ', '.join(gpus) if gpus else "N/A"
        except Exception:
            return "N/A"
    return "N/A"

def system_informations():
    # Operating System
    os_name = platform.system()
    os_version = platform.version()
    os_release = platform.release()
    # User Account
    user_account = os.getlogin() if hasattr(os, 'getlogin') else 'N/A'
    # Machine and Domain Information
    machine_name = socket.gethostname()
    domain = socket.getfqdn()
    # RAM Info
    total_ram = round(psutil.virtual_memory().total / (1024 ** 3), 2)  # GB
    free_ram = round(psutil.virtual_memory().available / (1024 ** 3), 2)  # GB
    # CPU Info
    cpu_name = platform.processor() or "N/A"
    cpu_count = psutil.cpu_count(logical=True)
    # GPU Info (try different methods based on OS)
    gpu_info = get_gpu_info()
    # UTC Offset
    utc_offset = datetime.datetime.now(datetime.timezone.utc).astimezone().utcoffset()
    # Current Directory
    current_directory = os.getcwd()
    # Combine all into a DataFrame 1 row, several fields on one row and list ([{ because it goes in a dataframe
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
    cols_to_convert = ["Operating System", "User Account", "Machine Name", "Domain", "GPU", "UTC Offset", "Current Directory"]
    result[cols_to_convert] = result[cols_to_convert].astype("string")
    return result
    `;
    return [SystemInformationsFunction];
  }
//python part. we can also have something like { config, inputName1, inputName2, outputName }
  public generateComponentCode({ config, outputName }: { config: any; outputName: string }): string {
  console.log("Generated outputName:", outputName);  // Debug
let code = `
# Run the function
${outputName} = []
${outputName} = system_informations()
`;

    return code;
  }
}