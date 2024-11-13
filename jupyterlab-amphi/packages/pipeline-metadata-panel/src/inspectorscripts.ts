export namespace Languages {
    export type LanguageModel = {
      initScript: string;
      queryCommand: string;
      matrixQueryCommand: string;
      widgetQueryCommand: string;
      deleteCommand: string;
      deleteAllCommand: string;
    };
  }
  
  export abstract class Languages {
    /**
     * Init and query script for supported languages.
     */
  
    static py_script = `
import json
import sys
import types
import re
from warnings import filterwarnings

filterwarnings("ignore", category=UserWarning, message='.*pandas only supports SQLAlchemy connectable.*')

from importlib import __import__
from IPython import get_ipython
from IPython.core.magics.namespace import NamespaceMagics
from IPython.display import display, HTML

!pip install --quiet pandas==2.2.1 --disable-pip-version-check
!pip install --quiet sqlalchemy==2.0.4 --disable-pip-version-check
!pip install --quiet python-dotenv --disable-pip-version-check

_amphi_metadatapanel_nms = NamespaceMagics()
_amphi_metadatapanel_Jupyter = get_ipython()
# _amphi_metadatapanel_nms.shell = _amphi_metadatapanel_Jupyter.kernel.shell  
__np = None
__pd = None
__pl = None
__pyspark = None
__tf = None
__K = None
__torch = None
__ipywidgets = None
__xr = None
  
def _attempt_import(module):
    try:
        return __import__(module)
    except ImportError:
        return None


def _check_imported():
    global __np, __pd, __pyspark, __tf, __K, __torch, __ipywidgets, __xr

    __np = _attempt_import('numpy')
    __pd = _attempt_import('pandas')
    __pyspark = _attempt_import('pyspark')
    __tf = _attempt_import('tensorflow')
    __K = _attempt_import('keras.backend') or _attempt_import('tensorflow.keras.backend')
    __torch = _attempt_import('torch')
    __ipywidgets = _attempt_import('ipywidgets')
    __xr = _attempt_import('xarray')


def _amphi_metadatapanel_getsizeof(x):
    if type(x).__name__ in ['ndarray', 'Series']:
        return x.nbytes
    elif __pyspark and isinstance(x, __pyspark.sql.DataFrame):
        return "?"
    elif __tf and isinstance(x, __tf.Variable):
        return "?"
    elif __torch and isinstance(x, __torch.Tensor):
        return x.element_size() * x.nelement()
    elif __pd and type(x).__name__ == 'DataFrame':
        return x.memory_usage().sum()
    else:
        return sys.getsizeof(x)


def _amphi_metadatapanel_getshapeof(x):
    if __pd and isinstance(x, __pd.DataFrame):
        return "%d rows x %d cols" % x.shape
    if __pd and isinstance(x, __pd.Series):
        return "%d rows" % x.shape
    if __np and isinstance(x, __np.ndarray):
        shape = " x ".join([str(i) for i in x.shape])
        return "%s" % shape
    if __pyspark and isinstance(x, __pyspark.sql.DataFrame):
        return "? rows x %d cols" % len(x.columns)
    if __tf and isinstance(x, __tf.Variable):
        shape = " x ".join([str(int(i)) for i in x.shape])
        return "%s" % shape
    if __tf and isinstance(x, __tf.Tensor):
        shape = " x ".join([str(int(i)) for i in x.shape])
        return "%s" % shape
    if __torch and isinstance(x, __torch.Tensor):
        shape = " x ".join([str(int(i)) for i in x.shape])
        return "%s" % shape
    if __xr and isinstance(x, __xr.DataArray):
        shape = " x ".join([str(int(i)) for i in x.shape])
        return "%s" % shape
    if isinstance(x, list):
        return "%s" % len(x)
    if isinstance(x, dict):
        return "%s keys" % len(x)
    return None


def _amphi_metadatapanel_getcontentof(x):
    def check_unnamed_columns(df):
        # Consider columns with purely integer labels as unnamed, all others (including empty strings) as named
        unnamed_columns = [col for col in df.columns if isinstance(col, int)]
        return unnamed_columns

    # Check if the input is a Pandas DataFrame and handle it
    if __pd and isinstance(x, __pd.DataFrame):
        unnamed_cols = check_unnamed_columns(x)
        colnames = ', '.join([f"{col} ({dtype}, {'unnamed' if col in unnamed_cols else 'named'})" for col, dtype in zip(x.columns, x.dtypes)])
        content = "%s" % colnames

    # Check if the input is an Ibis Table and handle it similarly
    elif "ibis" in globals() and isinstance(x, ibis.expr.types.Table):
        schema = x.schema()
        colnames = ', '.join([f"{col} ({dtype}, named)" for col, dtype in schema.items()])
        content = "%s" % colnames

    # Handle other types accordingly
    elif __pd and isinstance(x, __pd.Series):
        content = f"{x.name} ({x.dtype}, {'unnamed' if x.name == '' or isinstance(x.name, int) else 'named'}), " + str(x.values).replace(" ", ", ")[1:-1]
        content = content.replace("\\n", "")
    elif __np and isinstance(x, __np.ndarray):
        content = f"ndarray (shape={x.shape}, dtype={x.dtype})"
    elif __xr and isinstance(x, __xr.DataArray):
        content = f"DataArray (shape={x.shape}, dtype={x.dtype})"
    else:
        content = f"{type(x).__name__}, " + str(x)

    return content


def _amphi_metadatapanel_is_matrix(x):
    # True if type(x).__name__ in ["DataFrame", "ndarray", "Series"] else False
    if __pd and isinstance(x, __pd.DataFrame):
        return True
    if __pd and isinstance(x, __pd.Series):
        return True
    if __np and isinstance(x, __np.ndarray) and len(x.shape) <= 2:
        return True
    if __pyspark and isinstance(x, __pyspark.sql.DataFrame):
        return True
    if __tf and isinstance(x, __tf.Variable) and len(x.shape) <= 2:
        return True
    if __tf and isinstance(x, __tf.Tensor) and len(x.shape) <= 2:
        return True
    if __torch and isinstance(x, __torch.Tensor) and len(x.shape) <= 2:
        return True
    if __xr and isinstance(x, __xr.DataArray) and len(x.shape) <= 2:
        return True
    if isinstance(x, list):
        return True
    return False


def _amphi_metadatapanel_is_widget(x):
    return __ipywidgets and issubclass(x, __ipywidgets.DOMWidget)


def get_camel_case_variables():
    camel_case_pattern = re.compile(r'^[a-z]+(?:[A-Z][a-z]+)*(?:\\d+)?$')
    variable_names = []
    for key, value in globals().items():
        # Skip built-in, imported modules/objects, and certain IPython/Jupyter objects
        if not key.startswith('_') and not hasattr(__builtins__, key) and not key in ['exit', 'quit', 'get_ipython', 'In', 'Out'] and not isinstance(value, (type(sys), types.ModuleType)) and camel_case_pattern.match(key):
            variable_names.append(key)
    return variable_names

def _amphi_metadatapanel_dict_list():
    _check_imported()

    def keep_cond(obj):
        try:
            if isinstance(obj, str):
                return True
            if __tf and isinstance(obj, __tf.Variable):
                return True
            if __pd and __pd is not None and (
                isinstance(obj, __pd.core.frame.DataFrame)
                or isinstance(obj, __pd.core.series.Series)):
                return True
            if __xr and __xr is not None and isinstance(obj, __xr.DataArray):
                return True
            if str(obj)[0] == "<":
                return False
            return True
        except:
            return False

    camel_case_vars = get_camel_case_variables()
    vardic = [
        {
            'varName': var_name,
            'varType': type(eval(var_name)).__name__, 
            'varSize': str(_amphi_metadatapanel_getsizeof(eval(var_name))), 
            'varShape': str(_amphi_metadatapanel_getshapeof(eval(var_name))) if _amphi_metadatapanel_getshapeof(eval(var_name)) else '', 
            'varContent': str(_amphi_metadatapanel_getcontentof(eval(var_name))),
            'isMatrix': _amphi_metadatapanel_is_matrix(eval(var_name)),
            'isWidget': _amphi_metadatapanel_is_widget(type(eval(var_name)))
        }
        for var_name in camel_case_vars if keep_cond(eval(var_name))
    ]
    return json.dumps(vardic, ensure_ascii=False)
  
def _amphi_metadatapanel_getmatrixcontent(x, max_rows=10000):
    # to do: add something to handle this in the future
    threshold = max_rows

    if __pd and __pyspark and isinstance(x, __pyspark.sql.DataFrame):
        df = x.limit(threshold).toPandas()
        return _amphi_metadatapanel_getmatrixcontent(df.copy())
    elif __np and __pd and type(x).__name__ == "DataFrame":
        if threshold is not None:
            x = x.head(threshold)
        x.columns = x.columns.map(str)
        return x.to_json(orient="table", default_handler=_amphi_metadatapanel_default, force_ascii=False)
    elif __np and __pd and type(x).__name__ == "Series":
        if threshold is not None:
            x = x.head(threshold)
        return x.to_json(orient="table", default_handler=_amphi_metadatapanel_default, force_ascii=False)
    elif __np and __pd and type(x).__name__ == "ndarray":
        df = __pd.DataFrame(x)
        return _amphi_metadatapanel_getmatrixcontent(df)
    elif __tf and (isinstance(x, __tf.Variable) or isinstance(x, __tf.Tensor)):
        df = __K.get_value(x)
        return _amphi_metadatapanel_getmatrixcontent(df)
    elif __torch and isinstance(x, __torch.Tensor):
        df = x.cpu().numpy()
        return _amphi_metadatapanel_getmatrixcontent(df)
    elif __xr and isinstance(x, __xr.DataArray):
        df = x.to_numpy()
        return _amphi_metadatapanel_getmatrixcontent(df)
    elif isinstance(x, list):
        s = __pd.Series(x)
        return _amphi_metadatapanel_getmatrixcontent(s)
  
  
def _amphi_metadatapanel_displaywidget(widget):
    display(widget)
  
  
def _amphi_metadatapanel_default(o):
    if isinstance(o, __np.number): return int(o)  
    raise TypeError
  
def _amphi_metadatapanel_deletevariable(x):
    exec("del %s" % x, globals())

def _amphi_metadatapanel_deleteallvariables():
    camel_case_pattern = re.compile(r'^[a-z]+(?:[A-Z][a-z]+)*(?:\\d+)?$')
    variable_names = []
    for key, value in list(globals().items()):
        if not key.startswith('_') and not hasattr(__builtins__, key) and not key in ['exit', 'quit', 'get_ipython', 'In', 'Out', 'Session', 'session', 'warehouse', 'mpd'] and not isinstance(value, (type(sys), types.ModuleType)) and camel_case_pattern.match(key):
            exec("del %s" % key, globals())

def __amphi_display_dataframe(df, dfName=None, nodeId=None, runtime=None):
    result_df = None  # Initialize result_df

    # Check if the input is a pandas DataFrame
    if __pd and isinstance(df, __pd.DataFrame):
        runtime = runtime or "local (pandas)"
        result_df = df.copy()
        result_df.columns = [f"{col} ({df[col].dtype})" for col in df.columns]

    elif mpd and isinstance(x, mpd.DataFrame):
        runtime = runtime or "Snowflake (Snowpark pandas API)"
        result_df = df.copy()
        result_df.columns = [f"{col} ({df[col].dtype})" for col in df.columns]

    # Check if the input is an Ibis Table
    elif "ibis" in globals() and isinstance(df, ibis.expr.types.Table):
        runtime = runtime or "ibis"
        schema = df.schema()
        result_df = df.execute()
        result_df.columns = [
            f"{col} ({dtype})" for col, dtype in schema.items()
        ]

    # If result_df is set, display with metadata
    if result_df is not None:
        metadata = {
            'runtime': runtime,
            'nodeId': nodeId if nodeId else None,
            'dfName': dfName if dfName else None
        }
        display(result_df, metadata=metadata)
    else:
        raise ValueError("Unsupported dataframe type: The provided dataframe is neither a pandas DataFrame nor an ibis Table.")


def __amphi_display_pandas_dataframe(df, dfName=None, nodeId=None, runtime="local (pandas)"):
    df_with_types = df.copy()
    df_with_types.columns = [f"{col} ({df[col].dtype})" for col in df.columns]

    # Use the parameters to define metadata
    metadata = {}
    metadata['runtime'] = runtime
    if nodeId:
        metadata['nodeId'] = nodeId
    if dfName:
        metadata['dfName'] = dfName

    display(df_with_types, metadata=metadata)

def _amphi_display_documents_as_html(documents):
    html_content = "<div id='documents'>"
    total_docs = len(documents)
    maxDoc = 10
    
    if total_docs > maxDoc:
        # Display first maxDoc // 2 documents
        for i, doc in enumerate(documents[:(maxDoc // 2)]):
            html_content += "<div class='_amphi_document'>"
            html_content += f"<div class='_amphi_nb'>{i+1}</div>"
            html_content += f"<div class='_amphi_page_content'><strong>Document Content:</strong> {doc.page_content}</div>"
            html_content += f"<div class='_amphi_metadata'><strong>Metadata:</strong> {doc.metadata}</div>"
            html_content += "</div>"
        
        # Ellipsis to indicate skipped documents
        html_content += "<div>...</div>"
        
        # Display last maxDoc // 2 documents
        for i, doc in enumerate(documents[-(maxDoc // 2):], start=total_docs - (maxDoc // 2)):
            html_content += "<div class='_amphi_document'>"
            html_content += f"<div class='_amphi_nb'>{i+1}</div>"
            html_content += f"<div class='_amphi_page_content'><strong>Document Content:</strong> {doc.page_content}</div>"
            html_content += f"<div class='_amphi_metadata'><strong>Metadata:</strong> {doc.metadata}</div>"
            html_content += "</div>"
    else:
        # Display all documents if total is maxDoc or less
        for i, doc in enumerate(documents):
            html_content += "<div class='_amphi_document'>"
            html_content += f"<div class='_amphi_nb'>{i+1}</div>"
            html_content += f"<div class='_amphi_page_content'><strong>Document Content:</strong> {doc.page_content}</div>"
            html_content += f"<div class='_amphi_metadata'><strong>Metadata:</strong> {doc.metadata}</div>"
            html_content += "</div>"
    
    html_content += "</div>"
    display(HTML(html_content))
`;
  
  
    static scripts: { [index: string]: Languages.LanguageModel } = {
      python3: {
        initScript: Languages.py_script,
        queryCommand: '_amphi_metadatapanel_dict_list()',
        matrixQueryCommand: '_amphi_metadatapanel_getmatrixcontent',
        widgetQueryCommand: '_amphi_metadatapanel_displaywidget',
        deleteCommand: '_amphi_metadatapanel_deletevariable',
        deleteAllCommand: '_amphi_metadatapanel_deleteallvariables'
      },
      python2: {
        initScript: Languages.py_script,
        queryCommand: '_amphi_metadatapanel_dict_list()',
        matrixQueryCommand: '_amphi_metadatapanel_getmatrixcontent',
        widgetQueryCommand: '_amphi_metadatapanel_displaywidget',
        deleteCommand: '_amphi_metadatapanel_deletevariable',
        deleteAllCommand: '_amphi_metadatapanel_deleteallvariables'
      },
      python: {
        initScript: Languages.py_script,
        queryCommand: '_amphi_metadatapanel_dict_list()',
        matrixQueryCommand: '_amphi_metadatapanel_getmatrixcontent',
        widgetQueryCommand: '_amphi_metadatapanel_displaywidget',
        deleteCommand: '_amphi_metadatapanel_deletevariable',
        deleteAllCommand: '_amphi_metadatapanel_deleteallvariables'
      }
    };
  
    static getScript(lang: string): Promise<Languages.LanguageModel> {
      return new Promise((resolve, reject) => {
        if (lang in Languages.scripts) {
          resolve(Languages.scripts[lang]);
        } else {
          reject('Language ' + lang + ' not supported yet!');
        }
      });
    }
  }