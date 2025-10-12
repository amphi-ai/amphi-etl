# Load env vars from .env if present
-include .env
export

SHELL := /bin/bash

.PHONY: clean clean-deep build run

PYTHON ?= python3
VENV ?= amphi_venv
VENV_BIN := $(VENV)/bin
ACT := . $(VENV_BIN)/activate;

WORKSPACE_DIR ?= /Users/thibaut/Documents/myfolder

CLEAN_DIRS := dist $(VENV) build node_modules amphi amphi.egg-info .jupyterlite.doit.db
CLEAN_FILES := package-lock.json yarn.lock

clean:
	@echo "Cleaning up..."
	@rm -rf $(CLEAN_DIRS) $(CLEAN_FILES)
	@npm cache clean --force

clean-deep: clean
	@echo "Deep Cleaning"
	@find packages -type f -name tsconfig.tsbuildinfo -exec rm {} + -o -type d \( -name lib -o -name node_modules \) -exec rm -rf {} +

$(VENV):
	$(PYTHON) -m venv $(VENV)

build: $(VENV)
	$(ACT) pip install -r requirements.txt
	$(ACT) pip install pandas
	$(ACT) jlpm install
	$(ACT) jlpm run build

run: clean build
	$(ACT) jupyter lab --notebook-dir="$(WORKSPACE_DIR)" --ContentManager.allow_hidden=True
