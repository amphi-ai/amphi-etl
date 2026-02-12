# Amphi Scheduler - Architecture and Main Components

## Purpose
`amphi-scheduler` is a JupyterLab extension package that provides:
- A frontend scheduler UI (React + JupyterLab plugin) to create/manage pipeline jobs.
- A backend Jupyter Server extension (Tornado handlers + APScheduler) to persist and execute jobs.

It schedules Amphi pipelines using date, interval, or cron triggers, persists jobs in SQLite, and allows manual run-on-demand.

## High-Level Architecture
```text
JupyterLab (frontend plugin)
  -> REST calls to /pipeline-scheduler/*
Jupyter Server extension (Python handlers)
  -> APScheduler (BackgroundScheduler)
  -> SQLAlchemyJobStore (SQLite in <workspace>/.amphi/scheduler.sqlite)
  -> subprocess execution of pipeline file or generated Python code
```

## Repository Structure
### Workspace and build root
- `package.json`: Yarn/Lerna workspace orchestration for build/lint/test/distribution.
- `pyproject.toml`: Python package build config, includes labextension assets and server config.
- `amphi/pipeline-scheduler/`: built/prebuilt labextension artifacts distributed with wheel.

### Main package
- `packages/pipeline-scheduler/src/`: TypeScript frontend plugin code.
- `packages/pipeline-scheduler/pipeline_scheduler/`: Python backend server extension.
- `packages/pipeline-scheduler/schema/amphi-scheduler.json`: server extension enablement config.
- `packages/pipeline-scheduler/install.json`: JupyterLab package manager metadata.

## Frontend Components
### Plugin entry and UI shell
- `packages/pipeline-scheduler/src/index.tsx`
- Registers command `pipeline-scheduler:open`.
- Auto-opens a left sidebar `ReactWidget` (`SchedulerPanel`) at startup.
- Adds command to command palette under `Amphi`.

### Scheduler panel
- `SchedulerPanel` in `index.tsx`
- Responsibilities:
- Load jobs via `GET /jobs`.
- Poll jobs every 30 seconds.
- Render task list with run/edit/delete actions.
- Open modal for new/edit form.
- Convert `.ampln` files to Python when creating jobs.

### Job form and file selection
- `JobForm` in `index.tsx`
- Supports schedule types:
- `date` with subtypes: `once`, `daily`, `weekly`, `monthly`, `every_x_days`
- `interval` (seconds)
- `cron` (expression)
- Uses custom browser dialog:
- `packages/pipeline-scheduler/src/BrowseFileDialog.tsx`
- Extension filtering (`.ampln`, `.py`) with optional "show all files" toggle.

### Frontend API layer
- `packages/pipeline-scheduler/src/handler.ts`
- `requestScheduler(endpoint, options)` wraps Jupyter `ServerConnection`.
- JSON request/response helper with optional stream mode.

- `SchedulerAPI` in `index.tsx` exposes:
- `listJobs()`
- `getJob(id)`
- `createJob(job)` (also used for updates when `id` is present)
- `deleteJob(id)`
- `runJob(id)`

### Pipeline code generation path
- In `index.tsx`, `getPythonCode(...)`:
- Reads selected file from Jupyter contents API.
- If `.ampln`, calls command `pipeline-editor:generate-code`.
- Sends generated Python as `python_code` during job creation.

## Backend Components
### Server extension bootstrap
- `packages/pipeline-scheduler/pipeline_scheduler/handler.py`
- `load_jupyter_server_extension(server_app)`:
- Resolves workspace root (`preferred_dir`/`root_dir`/cwd).
- Creates `<root>/.amphi/scheduler.sqlite`.
- Configures `BackgroundScheduler` with:
- `SQLAlchemyJobStore` (persistent jobs),
- `ThreadPoolExecutor`,
- `ProcessPoolExecutor`.
- Registers REST handlers under `/pipeline-scheduler/*`.

- `packages/pipeline-scheduler/pipeline_scheduler/__init__.py`
- Exposes server extension points and delegates to `handler.load_jupyter_server_extension`.

### Trigger creation and serialization
- `_make_trigger(body)` in `handler.py` converts request payload into APScheduler triggers.
- `_serialise(job)` returns stable job JSON for frontend rendering.
- `_parse_iso_datetime`, `_cron_from_string`, `_cron_to_crontab` support date/cron parsing.

### Pipeline execution
- `run_pipeline(pipeline_or_code, **meta)` in `handler.py`:
- If argument resolves to existing file path, runs `python <file>`.
- Otherwise runs `python -c "<code>"`.
- Uses workspace root as process cwd.
- Returns `{success, output, error, exit_code}`.

### REST API handlers
- `SchedulerListHandler`
- `GET /pipeline-scheduler/jobs`: list jobs.
- `POST /pipeline-scheduler/jobs`: create/update job.

- `SchedulerJobHandler`
- `GET /pipeline-scheduler/jobs/{id}`: fetch one job.
- `DELETE /pipeline-scheduler/jobs/{id}`: delete job.
- `PUT /pipeline-scheduler/jobs/{id}`: modify metadata/trigger.

- `SchedulerRunHandler`
- `POST /pipeline-scheduler/run/{id}`: execute job immediately.

- `SchedulerConfigHandler`
- `GET /pipeline-scheduler/config`: returns resolved workspace dir.

## End-to-End Flows
### 1) Create schedule
1. User fills form in `SchedulerPanel`.
2. Frontend optionally generates Python from `.ampln`.
3. Frontend sends payload to `POST /jobs`.
4. Backend builds trigger, stores metadata in job kwargs, persists via SQLite job store.
5. Frontend refreshes list and displays `next_run_time`.

### 2) Scheduled execution
1. APScheduler fires trigger.
2. `run_pipeline` executes script/code in subprocess.
3. Logs are written through Jupyter server logger.

### 3) Manual run now
1. User clicks Run action.
2. Frontend calls `POST /run/{id}`.
3. Backend executes same `run_pipeline` immediately and returns output/error.

## Packaging and Distribution
- JS packaging: Yarn/Lerna workspace, frontend built to `amphi/pipeline-scheduler/`.
- Python packaging: Hatchling (`pyproject.toml`) includes:
- Python server package `pipeline_scheduler`.
- Labextension static assets.
- Jupyter server config schema that enables `pipeline_scheduler`.

## Current Gaps / Technical Debt
- `schema/extension.json` defines `dbPath`, but backend currently ignores it (DB path is fixed to `<workspace>/.amphi/scheduler.sqlite`).
- Frontend computes `pythonCode` in `handleRunJob` but does not send it on run-now path; this work is currently unused.
- Frontend never calls `PUT /jobs/{id}`; "edit" flow uses `POST /jobs` with `id` and `replace_existing`.
- `requestScheduler` stream mode is implemented but not used.
- Runtime security is permissive: backend can execute arbitrary Python text via `python -c`.

## Development Guidelines (Recommended)
### Backend
- Add strict validation for `pipeline_path` and optional sandbox/allowlist for executable paths.
- Wire `dbPath` config from schema/settings into `load_jupyter_server_extension`.
- Add explicit timezone strategy in scheduler configuration.
- Consider structured run history persistence (status, duration, output snippet, timestamp).

### Frontend
- Use `PUT /jobs/{id}` for explicit update semantics.
- Remove or complete unused code path in `handleRunJob`.
- Add UI feedback for validation errors returned by backend (`error` body parsing).
- Consider live log streaming if stream mode is introduced.

### Testing
- Add backend tests for `_make_trigger`, cron parsing, and API handlers.
- Add integration test for persistence/reload of jobs from SQLite.
- Add frontend contract tests for payload shapes (`date_type`, `interval_days`, cron).

## Key Files Quick Reference
- `packages/pipeline-scheduler/src/index.tsx`
- `packages/pipeline-scheduler/src/handler.ts`
- `packages/pipeline-scheduler/src/BrowseFileDialog.tsx`
- `packages/pipeline-scheduler/pipeline_scheduler/handler.py`
- `packages/pipeline-scheduler/pipeline_scheduler/__init__.py`
- `packages/pipeline-scheduler/schema/amphi-scheduler.json`
- `pyproject.toml`
- `package.json`
