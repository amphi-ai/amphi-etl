# Load environment variables from .env file if it exists
-include .env
export

PYTHON := python3
VENV := amphi_venv
ACT := . $(VENV)/bin/activate;

# Python package name from your wheel
PY_PKG := amphi_etl

# JS bits
JS_DIR := packages/pipeline-scheduler

# Workspace directory - can be overridden by environment variable
WORKSPACE_DIR ?= $(HOME)/Documents/amphi-workspace

.PHONY: dev build build-js build-py install lab clean

dev: $(VENV)
	$(ACT) pip install -U pip build
	$(ACT) pip install -r requirements.txt
	@echo "✅ Dev env ready. Use 'make build' or 'make lab'."

$(VENV):
	$(PYTHON) -m venv $(VENV)

build: build-js build-py

build-js:
	$(ACT) cd $(JS_DIR) && jlpm install && jlpm run build

build-py:
	$(ACT) python -m build --wheel

install: build
	# pick the newest wheel matching the actual python package name
	$(ACT) python -m pip install "$$(ls -1t dist/$(PY_PKG)-*.whl | head -n 1)" --force-reinstall
	@echo "ℹ️ If your server extension isn't auto-enabled, run:"
	@echo "   $(ACT) jupyter server extension enable $(PY_PKG)"

lab: dev install
	$(ACT) jupyter lab --notebook-dir=$(WORKSPACE_DIR)

clean:
	@rm -rf $(VENV) build dist .pytest_cache .ruff_cache
	@find . -name "__pycache__" -o -name "*.egg-info" -o -name "*.tsbuildinfo" | xargs rm -rf
	@echo "🧹 Cleaned."
