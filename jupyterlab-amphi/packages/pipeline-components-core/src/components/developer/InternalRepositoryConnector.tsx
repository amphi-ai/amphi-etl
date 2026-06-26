// Import necessary icons and the base component
import { internalRepositoryIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

// Main component definition
export class InternalRepositoryConnector extends BaseCoreComponent {
  
  // Constructor to define the component's structure
  constructor() {
    const defaultConfig = {
        tsCFselectTableName: "scheduler_runs",
        tsCFinputNumberLimit: ""
};

    // Define the form structure
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "info",
          id: "tsCFinfoPath",
          text: "⚠️Right now, it requires that your pipeline is in the root path.",
          advanced: false
        },
        {
          type: "select",
          label: "Table Name",
          id: "tsCFselectTableName",
          options: [
            { value: "scheduler_runs", label: "scheduler_runs", tooltip: "Result of Amphi job runs" },
            { value: "apscheduler_jobs", label: "apscheduler_jobs", tooltip: "List of Jobs" }
          ],
          advanced: false
        },
        {
          type: "inputNumber",
          label: "Number of rows to read",
          id: "tsCFinputNumberLimit",
          min: 0,
          advanced: true
        }
      ]
    };

    // Tooltip description for the component in the menu
    const description = "Retrieve Data from Amphi Internal Repository";

    // Call the parent class constructor with component details
    super(
      "Internal Repository",
      "InternalRepositoryConnector",
      description,
      "pandas_df_input",
      [],
      "developer",
      internalRepositoryIcon,
      defaultConfig,
      form
    );
  }

  // List of additional Python package imports required for this component
  public provideImports({ config }): string[] {
    return [
      "import os",
      "import json",
      "import logging",
      "import subprocess",
      "import sys",
      "from typing import Optional",
      "import threading",
      "import sqlite3",
      "from jupyter_server.base.handlers import APIHandler",
      "from jupyter_server.utils import url_path_join",
      "import datetime as dt",
      "import pandas as pd"
    ];
  }

  // Define the Python function
  public provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";

    const tsGetRepositoryTableFunction = `
def py_fn_get_repository_table(
    py_arg_table_name: str,
    py_arg_limit: Optional[int] = None,
) -> pd.DataFrame:
    """
    Retrieve data from a repository SQLite table and return it as a Pandas
    DataFrame with pandas-native data types.

    Parameters
    ----------
    py_arg_table_name : str
        Table name to retrieve.
        Supported values:
        - scheduler_runs
        - apscheduler_jobs

    py_arg_limit : Optional[int], default None
        Maximum number of rows to return.
        If None, all rows are returned.

    Returns
    -------
    pd.DataFrame
        DataFrame containing the table data with pandas-native dtypes.

    Raises
    ------
    RuntimeError
        If the repository database path is not initialized.

    ValueError
        If the table name is not supported.
    """
    #Initialise the pipeline-scheduler extension.
    global _AMPHI_ROOT
    nb_server_app=1
    _AMPHI_ROOT = (
        getattr(nb_server_app, "preferred_dir", None)
        or getattr(nb_server_app, "root_dir", None)
        or os.getcwd()
    )
    amphi_data_dir = os.path.join(_AMPHI_ROOT, ".amphi")
    _RUNS_DB_PATH = os.path.join(amphi_data_dir, "scheduler.sqlite")

    print(_RUNS_DB_PATH)

    if not _RUNS_DB_PATH:
        raise RuntimeError("Repository database path is not initialized.")

    py_allowed_tables = {
        "scheduler_runs",
        "apscheduler_jobs",
    }

    if py_arg_table_name not in py_allowed_tables:
        raise ValueError(
            f"Unsupported table '{py_arg_table_name}'. "
            f"Supported tables: {sorted(py_allowed_tables)}"
        )

    py_sql_query = f"SELECT * FROM {py_arg_table_name}"

    if py_arg_table_name == "scheduler_runs":
        py_sql_query += " ORDER BY id DESC"

    if py_arg_limit is not None:
        py_sql_query += f" LIMIT {int(py_arg_limit)}"

    with sqlite3.connect(_RUNS_DB_PATH) as py_connection:

        py_schema_rows = py_connection.execute(
            f"PRAGMA table_info({py_arg_table_name})"
        ).fetchall()

        py_dataframe = pd.read_sql_query(
            py_sql_query,
            py_connection,
        )

    py_column_types = {}

    for py_schema_row in py_schema_rows:
        py_column_name = py_schema_row[1]
        py_sqlite_type = (py_schema_row[2] or "").upper()

        py_column_types[py_column_name] = py_sqlite_type

    for py_column_name, py_sqlite_type in py_column_types.items():

        if py_column_name not in py_dataframe.columns:
            continue

        if any(
            py_type in py_sqlite_type
            for py_type in ("CHAR", "TEXT", "CLOB", "VARCHAR")
        ):
            py_dataframe[py_column_name] = (
                py_dataframe[py_column_name]
                .astype("string")
            )

        elif "BOOL" in py_sqlite_type:
            py_dataframe[py_column_name] = (
                py_dataframe[py_column_name]
                .astype("boolean")
            )

        elif any(
            py_type in py_sqlite_type
            for py_type in ("DATE", "TIME", "TIMESTAMP")
        ):
            py_dataframe[py_column_name] = pd.to_datetime(
                py_dataframe[py_column_name],
                errors="coerce",
            )

        elif "INT" in py_sqlite_type:
            py_dataframe[py_column_name] = (
                py_dataframe[py_column_name]
                .astype("Int64")
            )

        elif any(
            py_type in py_sqlite_type
            for py_type in (
                "REAL",
                "FLOAT",
                "DOUBLE",
                "NUMERIC",
                "DECIMAL",
            )
        ):
            py_dataframe[py_column_name] = (
                py_dataframe[py_column_name]
                .astype("Float64")
            )

    return py_dataframe
    `;

    return [tsGetRepositoryTableFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, outputName }: { config: any; outputName: string }): string {
    let tsConstTableName = 'None';
    if (config.tsCFselectTableName && config.tsCFselectTableName.trim() !== '' 
	) {
      tsConstTableName = '"' + config.tsCFselectTableName+ '"';
    }
	
    let tsCFConstLimit = 'None';
    if (config.tsCFinputNumberLimit && config.tsCFinputNumberLimit.trim() !== '' 
	) {
      tsCFConstLimit = config.tsCFinputNumberLimit;
    }

    return `
${outputName}=py_fn_get_repository_table(
    py_arg_table_name=${tsConstTableName},
    py_arg_limit=${tsCFConstLimit}
)
    `;
  }
}
