try:
    from ._version import __version__
except ImportError:
    import warnings
    warnings.warn("Importing 'pipeline-scheduler' outside a proper installation.")
    __version__ = "dev"

from . import handler as _h                    # ① centralise logic in handler.py

# ── Jupyter Lab front-end asset ────────────────────────────────────────────
def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "@amphi/pipeline-scheduler"}]

# ── Jupyter Server extension entry-point ───────────────────────────────────
def _jupyter_server_extension_points():
    return [{"module": "pipeline_scheduler"}]   # ② this file is the entry-point

def _load_jupyter_server_extension(server_app):
    """Delegate server-side setup to handler.load_jupyter_server_extension()."""
    _h.load_jupyter_server_extension(server_app)   # ③ call the real initialiser