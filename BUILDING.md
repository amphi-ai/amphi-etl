# Building Amphi from Source

This document explains how to build Amphi from source code. Amphi consists of two main components:
1. `jupyterlab-amphi`: The core JupyterLab extension containing the main application logic
2. `amphi-etl`: The full Amphi ETL application that builds upon the core extension

## 👉 Prerequisites 👈
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

## 👷 Building jupyterlab-amphi 👷

The first step is to build the core JupyterLab extension.

1. Navigate to the jupyterlab-amphi directory: (here the cd.. is because you have to go back in the folder hierarchy)
```bash
cd ..
cd jupyterlab-amphi
```

2. Install and build the extension:

**On macOS/Linux:**
```bash
pip install -r requirements.txt
jlpm install
jlpm run build
python3 -m pip install .
```

**On Windows:**
```bash
pip install -r requirements.txt
jlpm install
jlpm run build
python -m pip install .
```
pip install -r requirements.txt may come after

check that the extension is really installed with
```bash
python -m jupyter labextension list
```

3. To test the extension in JupyterLab:
These commands will launch jupyterlab with the extension. Please note you shouldn't get the Amphi interface here. It is highly recommanded to clear your browser cache before this step.
**On macOS/Linux:**
```bash
jupyter lab --notebook-dir=/path/to/your/workspace
```

**On Windows:**
```bash
jupyter lab --notebook-dir=C:\path\to\your\workspace
```

Replace `/path/to/your/workspace` or `C:\path\to\your\workspace` with your desired workspace directory (i.e. the directory where are your pipelines, not your building or installation directory). 

Note: You can add `--ContentManager.allow_hidden=True` to the launch command if you want to show hidden files in the file browser.
to interrupt , close your browser tab and ctrl+c on cmd
## 👷 Building amphi-etl 👷

After successfully building `jupyterlab-amphi`, you can proceed with building the full Amphi ETL application.

1. Navigate to the amphi-etl directory:
```bash
cd ../amphi-etl
```

2. Modify requirements.txt to use the local jupyterlab-amphi build (save a copy somewhere):
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

if ok, don't forget to replace the requirements.txt with the save you made before going further with git.

## 👓 Component Overview 👓

- **jupyterlab-amphi**: This is the core extension that contains the main application logic. It can be run independently within JupyterLab for development and testing purposes.
  
- **amphi-etl**: This is the complete Amphi ETL application. It incorporates the `jupyterlab-amphi` extension and adds Amphi's custom theme, styling, and additional features to create a standalone application experience.

## 🐛 Troubleshooting 🐛

If you encounter any issues:

1. Ensure your virtual environment is activated
2. Verify all prerequisites are installed correctly
3. Check that paths in commands match your system's directory structure
4. Make sure you're using compatible versions of Python and JupyterLab

## 🗈 Notes 🗈

- Always use the virtual environment when installing Python packages to maintain a clean development environment
- The build process must be completed in order: first jupyterlab-amphi, then amphi-etl
- if you use several Python releases (like 3.12 & 3.13), be sure that you're using a supported release when building and that your virtual environment is built with the same version. The easiest way is to set this version as the default. You can check with python -V before creating the virtual environment and inside the virtual environment. You can also check you're using Python from the virtual environment with the where python command (Windows) or which command (Macos/linux). The first result should be in your virtual environement.
- virtual environments are not totally isolated and, depending of your environment variables, you may have a fallback mechanism, meaning that when not finding a package in your virtual environment, it will take it from the system, causing either errors or false positive during building process.

## 📖 Additional Resources 📖

For more detailed information about:
- JupyterLab extensions: [JupyterLab Documentation](https://jupyterlab.readthedocs.io/)
- Python virtual environments: [Python venv documentation](https://docs.python.org/3/library/venv.html)
- Conda environments: [Conda documentation](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html)

## ✚ Adding a new component ✚
1. a component is stored as a .tsx file in the amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\components repository, within a sub-folder related to its category.
Note there is a  amphi-etl\jupyterlab-amphi\packages\pipeline-components-local for components that are not packaged with amphi for snowflake (Snowpark pandas).
 
2. component is mainly composed of two parts : the form and the code generator. you can have some form examples in developer\FormExample.tsx
 
3. component must be registered in two indexes files:
amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\index.ts
amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\components\index.ts
 
4. icons are stored in  amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\style\icons\ 
it must me registered  in amphi-etl\jupyterlab-amphi\packages\pipeline-components-core\src\icon.ts and the icon is a svg square of 24.
The privileged icon library is now https://tabler.io/icons (formerly https://helios.hashicorp.design/icons/library )

5. Component categories are created on the fly, with the super{} function, you don’t need to create a category.

6. Tips : check your output. Usually on transforms and input, it must be a dataframe (not a list). The output types are also important (string, integer, etc.. instead of object). You can check the Python part with the Python Transforms tool. Also be careful when your python code use backslash in your component code (like to escape a double quote), it may disapear when using it and useful to build properly a string (cf compare dataframe tool as an example to handle it)

7. Here an example of dev routine : 7.1 : start with some python code in a python input/transforms. you may use a LLM for that. 7.2 Continue with a custom component. 7.3 Ends with building the Core component (there are only a few things to change between custom and core such as the 3 first rows, the last one, the super function). Such a routine is made to validate each component and to iterate the fastest possible.

## 👮Development rules & norms👮
### Context : 
Without rules, "good" or "common" practices set for the developer team, leading to misunderstanging or rework/correction by the project leader would occur.

First of all, we have to identify the Amphi structure. For this document, we can divide into two main parts : 
-the core which is the brain and backbone of Amphi, providing the UI framework, the console, the scheduler, etc..
-the components. (to simplify, one component is one tool such as _Transpose Dataset_ or _JSON tools_
Right now, as a first attempt, we will adress only the second part.

In a component, you have a mix of different languages such as :
-TypeScript (for the UI)
-Python (for the calculation/processing)
-SQL when applied

And a lot of things such as :
| Language | Item |
|--------|--------|
| TypeScript | Component Forms |
| TypeScript | Function |
| TypeScript | Const |
| Python | Function |
| Python | Input/Output Dataframe|
| Python | Temporary Dataframe|
| Python | Temporary const/var|

### Naming Convention
Even if not stated clearly, the de facto standard is lower camel case (eg : hasDataColumns) and that's all. However, a few things have to be considered.
About the case itself :
- it's a standard for Typescript
- it's based on the difference between upper and lower case but sometimes, lower cases char may looks like other characters in upper case : utilIdiot  
- it's hard to parse for a machine since there is no separator
- the plus side is that's dense

We can also consider for Python code the famous PEP 8 https://peps.python.org/pep-0008/
To sum it up, snake case for Python, except for class.

Therefore, a proposition could be the use of snake case (eg : has_data_columns)
- it respects the PEP 8 for python (except for class)
- all characters can be easily read, no doubt, no confusion posible
- easy to parse for a machine
- 1 minor minus side : it means a few more characters
- 1 major minus side : rework

The other thing is to identify what kind of item it is. Today, you have to search all the code to understand where it comes from.

What is proposed here : 
-snake case for Python except for class
-lower camel case for Typescript
-usage of prefix

Here an illustration :

| Language | Item | Type of case |Prefix |
|--------|--------|--------|--------|
| TypeScript | Component Forms | Camel Case | tsCF{type of form} |
| TypeScript | Function | Camel Case | tsFn |
| TypeScript | Const | Camel Case | tsConst |
| Python | Function | Snake Case | py_fn_  |
| Python | Input/Output Dataframe| Snake Case | py_fn_ |
| Python | Temporary Dataframe | Snake Case | py_df_ |
| Python | Temporary const/var/arg | Snake Case | py_const_ / py_var_ / py_arg_ |


### Python code
Indentation is done with 4 spaces, not tab.

### Python function
In Python function, you can use args or kwargs (key-words arguments) when using it
args
```python
toto=py_fn_myfunction('titi','tutu',3)
``` 
As you can see, the readibility is the not the best, meaning you have to refer to the documentation or the function definition to understand it.

Always use kwargs such as
```python
toto=py_fn_myfunction(py_v_myvar1='titi',py_v_myvar2='tutu',py_v_myvar3=3)
``` 

For documentation, a docstring is mandatory
-Declared using triple quotes (' ' ' or " " ").
-Written just below the definition of a function, class, or module.
-Unlike comments (#), docstrings can be accessed at runtime using __doc__ or help().
```python
def py_fn_greet(name):
    """This function greets the user by their name."""
    return f"Hello, {name}!"

help(py_fn_greet)
Help on function py_fn_greet in module __main__:

py_fn_greet(name)
    This function greets the user by their name.
``` 

The type of the arguments must also been specified such as 

```python
def py_fn_example(
    py_arg_url: str,
    py_arg_method: str = "GET",
    py_arg_params: Optional[Dict[str, str]] = None,    
    py_arg_headers: Optional[Dict[str, str]] = None,
    py_arg_body_form: Optional[Dict[str, str]] = None,
    py_arg_body_raw: Optional[Union[str, object]] = None,
    py_arg_cert: Optional[Union[str, Tuple[str, str]]] = None,
    py_arg_timeout: Optional[Tuple[int, int]] = None,
    py_arg_response_as_string: bool = False,
    py_arg_save_path: Optional[str] = None
) -> pd.DataFrame:
``` 
### Components
a. When you have a select form, a boolean, a radio..., always put a default value (even none or do nothing..). Do not let it undefined.