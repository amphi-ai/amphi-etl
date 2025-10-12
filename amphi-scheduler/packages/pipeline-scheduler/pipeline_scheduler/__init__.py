try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'pipeline-scheduler' outside a proper installation.")
    __version__ = "dev"

from . import handler as _h                    # ① centralise logic in handler.py

def _jupyter_labextension_paths():
    # Points JupyterLab at the bundled front-end
    return [{"src": "amphi/pipeline-scheduler", "dest": "@amphi/pipeline-scheduler"}]

# If you expose a server extension, keep this (or remove if not used)
def _jupyter_server_extension_points():
    return [{"module": "pipeline_scheduler"}]

def _load_jupyter_server_extension(server_app):
    """Delegate server-side setup to handler.load_jupyter_server_extension()."""
    _h.load_jupyter_server_extension(server_app)   # ③ call the real initialiser