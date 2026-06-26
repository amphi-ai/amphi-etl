import { packagesActionIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class PackagesAction extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFselectManagementAction: "install",
      tsCFcolumnsPackagesList: [],
      tsCFinputCustomPipCommand:""
    };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "select",
          label: "Packages Actions ",
          id: "tsCFselectManagementAction",
          placeholder: "Select Management Action",
          options: [
            { value: "install", label: "Install package(s)" },
            { value: "uninstall", label: "Uninstall package(s)", tooltip: "Limit the result to numeric columns" },
            { value: "check_existence", label: "Check package(s) existence"}
          ],
        },
        {
          type: "columns",
          label: "Column with packages list",
          id: "tsCFcolumnsPackagesList",
          placeholder: "Select column",
          tooltip: "versions and extras supported",
          inputNb: 1,
          advanced: true
        },
        {
          type: "input",
          label: "Custom pip command",
          id: "tsCFinputCustomPipCommand",
          tooltip: "In case you have a proxy, like --index-url https://repos.tech.mycompany/artifactory/api/pypi/pythonproxy/simple",
          advanced: true
        },
      ],
    };

    const description = "Install, Uninstall or Check Existence of a package with Pip";

    super("Packages Action", "PackagesAction", description, "pandas_df_processor", [], "developer", packagesActionIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return [
      "from __future__ import annotations",
      "import subprocess",
      "import sys",
      "from importlib.metadata import PackageNotFoundError",
      "from importlib.metadata import version",
      "from typing import Optional",
      "import pandas as pd",
      "from packaging.requirements import Requirement"
    ];
  }

  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    // Functions to summary the dataframe
    const tsPackagesActionFunction = `
def _py_fn_get_installed_version(
    py_arg_package_name: str,
) -> Optional[str]:
    """
    Return the installed version of a package.

    Parameters
    ----------
    py_arg_package_name : str
        Package name.

    Returns
    -------
    Optional[str]
        Installed version if the package is installed, otherwise None.
    """
    try:
        return version(py_arg_package_name)
    except PackageNotFoundError:
        return None


def _py_fn_check_requirement(
    py_arg_requirement_string: str,
) -> tuple[bool, bool, Optional[str]]:
    """
    Check whether a requirement is satisfied.

    Parameters
    ----------
    py_arg_requirement_string : str
        Package requirement.

    Returns
    -------
    tuple[bool, bool, Optional[str]]
        (
            package_exists,
            package_exists_with_other_version,
            installed_version
        )
    """
    py_requirement = Requirement(py_arg_requirement_string)

    py_installed_version = _py_fn_get_installed_version(
        py_requirement.name
    )

    if py_installed_version is None:
        return False, False, None

    if not py_requirement.specifier:
        return True, False, py_installed_version

    py_matches = py_requirement.specifier.contains(
        py_installed_version,
        prereleases=True,
    )

    return (
        py_matches,
        not py_matches,
        py_installed_version,
    )


def _py_fn_execute_pip(
    py_arg_arguments: list[str],
) -> tuple[bool, str]:
    """
    Execute a pip command.

    Parameters
    ----------
    py_arg_arguments : list[str]
        Arguments passed to pip.

    Returns
    -------
    tuple[bool, str]
        (
            success,
            stdout_or_stderr
        )
    """
    try:
        py_result = subprocess.run(
            [sys.executable, "-m", "pip", *py_arg_arguments],
            capture_output=True,
            text=True,
            check=True,
        )

        return True, py_result.stdout

    except subprocess.CalledProcessError as py_exception:

        return False, py_exception.stderr


def _py_fn_initialize_result_columns(
    py_arg_dataframe: pd.DataFrame,
    py_arg_management_action: str,
) -> pd.DataFrame:
    """
    Initialize the output columns according to the requested
    management type.

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        DataFrame to initialize.

    py_arg_management_action : str
        install, uninstall or check_existence.

    Returns
    -------
    pd.DataFrame
        DataFrame with initialized nullable columns.
    """

    if py_arg_management_action in ("install", "uninstall"):

        py_arg_dataframe["py_pkg_management_success"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="boolean",
        )

    py_arg_dataframe["py_pkg_error"] = pd.Series(
        pd.NA,
        index=py_arg_dataframe.index,
        dtype="string",
    )

    if py_arg_management_action == "install":

        py_arg_dataframe["py_pkg_installed_version"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="string",
        )

        py_arg_dataframe["py_pkg_existed_before"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="boolean",
        )

    elif py_arg_management_action == "uninstall":

        py_arg_dataframe["py_pkg_existed_before"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="boolean",
        )

    elif py_arg_management_action == "check_existence":

        py_arg_dataframe["py_pkg_installed_version"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="string",
        )

        py_arg_dataframe["py_pkg_exists"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="boolean",
        )

        py_arg_dataframe["py_pkg_exists_with_other_version"] = pd.Series(
            pd.NA,
            index=py_arg_dataframe.index,
            dtype="boolean",
        )

    return py_arg_dataframe


def _py_fn_get_unique_packages(
    py_arg_dataframe: pd.DataFrame,
    py_arg_package_column: str,
    py_arg_management_action: str,
) -> pd.DataFrame:
    """
    Return a DataFrame containing one row per unique package
    specification.

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input DataFrame.

    py_arg_package_column : str
        Package specification column.

    py_arg_management_action : str
        install, uninstall or check_existence.

    Returns
    -------
    pd.DataFrame
        Initialized DataFrame containing unique package
        specifications.
    """

    py_unique_dataframe = (
        py_arg_dataframe[[py_arg_package_column]]
        .drop_duplicates()
        .reset_index(drop=True)
    )

    return _py_fn_initialize_result_columns(
        py_unique_dataframe,
        py_arg_management_action,
    )
    
def _py_fn_install_package(
    py_arg_dataframe: pd.DataFrame,
    py_arg_row_index: int,
    py_arg_package_column: str,
    py_arg_custom_pip_arguments: list[str],
) -> None:
    """
    Install a Python package.

    The package specification may contain version constraints and extras,
    for example:

    - pandas
    - pandas>=2.2
    - pandas~=2.2
    - pandas!=2.1.*
    - SomePackage[PDF]
    - SomePackage[PDF]>=1.0

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        DataFrame containing the unique package specifications.

    py_arg_row_index : int
        Row index.

    py_arg_package_column : str
        Name of the column containing the package specification.

    py_arg_custom_pip_arguments : list[str]
        Additional arguments passed to pip.
    """

    py_requirement_string = str(
        py_arg_dataframe.at[
            py_arg_row_index,
            py_arg_package_column,
        ]
    ).strip()

    try:

        py_requirement = Requirement(py_requirement_string)

        py_package_name = py_requirement.name

        py_existing_version = _py_fn_get_installed_version(
            py_package_name
        )

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_existed_before",
        ] = py_existing_version is not None

        py_success, py_message = _py_fn_execute_pip(
            [
                "install",
                py_requirement_string,
                *py_arg_custom_pip_arguments,
            ]
        )

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_management_success",
        ] = py_success

        if not py_success:

            py_arg_dataframe.at[
                py_arg_row_index,
                "py_pkg_error",
            ] = py_message.strip()

            return

        py_installed_version = _py_fn_get_installed_version(
            py_package_name
        )

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_installed_version",
        ] = py_installed_version

    except Exception as py_exception:

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_management_success",
        ] = False

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_error",
        ] = str(py_exception)
        
def _py_fn_uninstall_package(
    py_arg_dataframe: pd.DataFrame,
    py_arg_row_index: int,
    py_arg_package_column: str,
    py_arg_custom_pip_arguments: list[str],
) -> None:
    """
    Uninstall a Python package.

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        DataFrame containing the unique package specifications.

    py_arg_row_index : int
        Row index.

    py_arg_package_column : str
        Name of the column containing the package specification.

    py_arg_custom_pip_arguments : list[str]
        Additional arguments passed to pip.
    """

    py_requirement_string = str(
        py_arg_dataframe.at[
            py_arg_row_index,
            py_arg_package_column,
        ]
    ).strip()

    try:

        py_requirement = Requirement(py_requirement_string)

        py_package_name = py_requirement.name

        py_existing_version = _py_fn_get_installed_version(
            py_package_name
        )

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_existed_before",
        ] = py_existing_version is not None

        py_success, py_message = _py_fn_execute_pip(
            [
                "uninstall",
                "-y",
                py_package_name,
                *py_arg_custom_pip_arguments,
            ]
        )

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_management_success",
        ] = py_success

        if not py_success:
            py_arg_dataframe.at[
                py_arg_row_index,
                "py_pkg_error",
            ] = py_message.strip()

    except Exception as py_exception:

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_management_success",
        ] = False

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_error",
        ] = str(py_exception)

def _py_fn_check_package(
    py_arg_dataframe: pd.DataFrame,
    py_arg_row_index: int,
    py_arg_package_column: str,
) -> None:
    """
    Check whether a package satisfying the requirement is installed.

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        DataFrame containing the unique package specifications.

    py_arg_row_index : int
        Row index.

    py_arg_package_column : str
        Name of the column containing the package specification.
    """

    py_requirement_string = str(
        py_arg_dataframe.at[
            py_arg_row_index,
            py_arg_package_column,
        ]
    ).strip()

    try:

        (
            py_exists,
            py_exists_with_other_version,
            py_installed_version,
        ) = _py_fn_check_requirement(
            py_requirement_string
        )

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_exists",
        ] = py_exists

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_exists_with_other_version",
        ] = py_exists_with_other_version

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_installed_version",
        ] = py_installed_version

    except Exception as py_exception:

        py_arg_dataframe.at[
            py_arg_row_index,
            "py_pkg_error",
        ] = str(py_exception)
        
def py_fn_manage_python_packages(
    py_arg_dataframe: pd.DataFrame,
    py_arg_management_action: str,
    py_arg_package_column: str,
    py_arg_custom_pip_command: Optional[str] = None,
) -> pd.DataFrame:
    """
    Manage Python packages listed in a pandas DataFrame.

    Supported management types
    --------------------------
    - install
    - uninstall
    - check_existence

    Supported package specifications
    --------------------------------
    - pandas
    - pandas>=2.2
    - pandas~=2.2
    - pandas<3
    - pandas!=2.2.*
    - SomePackage[PDF]
    - SomePackage[PDF]>=1.0

    Parameters
    ----------
    py_arg_dataframe : pd.DataFrame
        Input DataFrame.

    py_arg_management_action : str
        One of:
        - install
        - uninstall
        - check_existence

    py_arg_package_column : str
        Column containing the package specification.

    py_arg_custom_pip_command : Optional[str], default=None
        Additional pip command-line arguments.

        Example
        -------
        "--index-url https://myrepo/simple"

    Returns
    -------
    pd.DataFrame
        Input DataFrame enriched with the columns corresponding to the
        requested management type.
    """

    if py_arg_management_action not in (
        "install",
        "uninstall",
        "check_existence",
    ):
        raise ValueError(
            "Unsupported management type."
        )

    py_custom_pip_arguments = []

    if py_arg_custom_pip_command:

        py_custom_pip_arguments = (
            py_arg_custom_pip_command.split()
        )

    py_unique_dataframe = _py_fn_get_unique_packages(
        py_arg_dataframe=py_arg_dataframe,
        py_arg_package_column=py_arg_package_column,
        py_arg_management_action=py_arg_management_action,
    )

    for py_row_index in py_unique_dataframe.index:

        if py_arg_management_action == "install":

            _py_fn_install_package(
                py_arg_dataframe=py_unique_dataframe,
                py_arg_row_index=py_row_index,
                py_arg_package_column=py_arg_package_column,
                py_arg_custom_pip_arguments=py_custom_pip_arguments,
            )

        elif py_arg_management_action == "uninstall":

            _py_fn_uninstall_package(
                py_arg_dataframe=py_unique_dataframe,
                py_arg_row_index=py_row_index,
                py_arg_package_column=py_arg_package_column,
                py_arg_custom_pip_arguments=py_custom_pip_arguments,
            )

        else:

            _py_fn_check_package(
                py_arg_dataframe=py_unique_dataframe,
                py_arg_row_index=py_row_index,
                py_arg_package_column=py_arg_package_column,
            )

    py_result_dataframe = py_arg_dataframe.merge(
        py_unique_dataframe,
        on=py_arg_package_column,
        how="left",
    )

    return py_result_dataframe
    `;
    return [tsPackagesActionFunction];
  }
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {
    let tsConstManagementAction = 'None';
    if (config.tsCFselectManagementAction && config.tsCFselectManagementAction.trim() !== '' 
    ) {
      tsConstManagementAction = '"' + config.tsCFselectManagementAction+ '"';
    }
    let tsConstCustomPipCommand = 'None';
    if (config.tsCFinputCustomPipCommand && config.tsCFinputCustomPipCommand.trim() !== '' 
    ) {
      tsConstCustomPipCommand = '"' + config.tsCFinputCustomPipCommand+ '"';
    }
	
    let tsConstPackagesList = "None";
//only one column here so not a list
    if (config.tsCFcolumnsPackagesList?.length > 0) {
      tsConstPackagesList = `${config.tsCFcolumnsPackagesList
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}`;
    }

const code =`
${outputName} =  py_fn_manage_python_packages(
    py_arg_dataframe=${inputName},
    py_arg_management_action=${tsConstManagementAction},
    py_arg_package_column=${tsConstPackagesList},
    py_arg_custom_pip_command=${tsConstCustomPipCommand}
)
    `;
    return code + '\n';
  }
}
