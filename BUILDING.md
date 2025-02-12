# Building Amphi from Source

This document explains how to build Amphi from source code. Amphi consists of two main components:
1. `jupyterlab-amphi`: The core JupyterLab extension containing the main application logic
2. `amphi-etl`: The full Amphi ETL application that builds upon the core extension

## Prerequisites
Python must be installed on your machine.
Before starting the build process, we strongly recommend setting up a Python virtual environment. This helps avoid conflicts between Python packages and ensures a clean installation. You can create one using either `venv` or `conda`:

### Creating a Virtual Environment

Using venv:

#### On Windows
```bash
python -m venv venv
.\venv\Scripts\activate
```
another example
```bash
python -m venv C:\Users\yourusername\building_amphi
cd C:\Users\yourusername\building_amphi
Scripts\activate
```
on cmd, you must see the name of your virtual environment on the left.

#### On macOS/Linux
```bash
python3 -m venv venv
source venv/bin/activate
```

Using conda:
```bash
# Create a new environment
conda create -n amphi python=3.x
conda activate amphi
```

Keep this virtual environment active throughout the entire build process.

## Building jupyterlab-amphi

The first step is to build the core JupyterLab extension.

1. Navigate to the jupyterlab-amphi directory:
```bash
cd jupyterlab-amphi
```

2. Install and build the extension:

**On macOS/Linux:**
```bash
jlpm install
jlpm run build
python3 -m pip install .
```

**On Windows:**
```bash
jlpm install
jlpm run build
python -m pip install .
```

3. To test the extension in JupyterLab:

**On macOS/Linux:**
```bash
jupyter lab --notebook-dir=/path/to/your/workspace
```

**On Windows:**
```bash
jupyter lab --notebook-dir=C:\path\to\your\workspace
```

Replace `/path/to/your/workspace` or `C:\path\to\your\workspace` with your desired workspace directory.

Note: You can add `--ContentManager.allow_hidden=True` to the launch command if you want to show hidden files in the file browser.

## Building amphi-etl

After successfully building `jupyterlab-amphi`, you can proceed with building the full Amphi ETL application.

1. Navigate to the amphi-etl directory:
```bash
cd ../amphi-etl
```

2. Modify requirements.txt to use the local jupyterlab-amphi build:
   - Open `requirements.txt`
   - Find the line containing `jupyterlab-amphi==X.X.X`
   - Replace it with `../jupyterlab-amphi`

3. Install the requirements:
```bash
python -m pip install -r requirements.txt
```

4. Launch Amphi ETL:
```bash
jupyter lab --notebook-dir=/path/to/your/workspace
```
(Use appropriate path format for Windows as shown above)

## Component Overview

- **jupyterlab-amphi**: This is the core extension that contains the main application logic. It can be run independently within JupyterLab for development and testing purposes.
  
- **amphi-etl**: This is the complete Amphi ETL application. It incorporates the `jupyterlab-amphi` extension and adds Amphi's custom theme, styling, and additional features to create a standalone application experience.

## Troubleshooting

If you encounter any issues:

1. Ensure your virtual environment is activated
2. Verify all prerequisites are installed correctly
3. Check that paths in commands match your system's directory structure
4. Make sure you're using compatible versions of Python and JupyterLab

## Notes

- Always use the virtual environment when installing Python packages to maintain a clean development environment
- The build process must be completed in order: first jupyterlab-amphi, then amphi-etl

## Additional Resources

For more detailed information about:
- JupyterLab extensions: [JupyterLab Documentation](https://jupyterlab.readthedocs.io/)
- Python virtual environments: [Python venv documentation](https://docs.python.org/3/library/venv.html)
- Conda environments: [Conda documentation](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html)

## Adding a new component
1. a component is stored as a .tsx file in the amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\components repository, within a sub-folder related to its category.
Note there is a  amphi-etl\jupyterlab-amphi\packages\pipeline-components-local for components that are not packaged with amphi for snowflake (Snowpark pandas).
 
2. component is mainly composed of two parts : the form and the code generator. you can have some form examples in developer\FormExample.tsx
 
3. component must be registered in two indexes files:
amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\index.ts
amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\components\index.ts
 
4. icons are stored in  amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\style\icons\ 
it must me registered  in amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\icon.ts and the icon is a svg square of 24.

5. Component categories are created on the fly, with the super{} function, you don’t need to create a category.
