# Amphi ETL - Agent Guide

This document explains the architecture, structure, and key components of the Amphi ETL project for AI coding assistants and developers.

## Project Overview

Amphi ETL is a visual data preparation and ETL (Extract, Transform, Load) platform built on top of JupyterLab. It provides a React-based visual pipeline editor where users can design data workflows using drag-and-drop components, which are then converted to executable Python code.

## Repository Structure

This is a **monorepo** containing three main components:

```
amphi-etl-git/
└── amphi-etl/                           # Root monorepo
    ├── jupyterlab-amphi/                # Core JupyterLab extension
    ├── amphi-etl/                       # Standalone ETL application
    └── amphi-scheduler/                 # Job scheduling extension
```

### Component Relationships

1. **jupyterlab-amphi** (Foundation Layer)
   - Core JupyterLab extension providing the visual pipeline editor
   - Can be installed independently in any JupyterLab environment
   - Version: 0.9.5
   - License: ELv2 (Elastic License 2.0)

2. **amphi-etl** (Complete Application)
   - A distribution of JupyterLab with jupyterlab-amphi pre-installed
   - Adds custom Amphi theme and UI changes
   - Provides standalone application with CLI: `amphi start`
   - Version: 0.9.5

3. **amphi-scheduler** (Scheduling Extension)
   - Separate JupyterLab extension for scheduling pipeline execution
   - Allows pipelines to run at specific times/intervals
   - Uses APScheduler with SQLite persistence
   - Version: 0.9.5

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Pipeline Editor**: ReactFlow (for visual node-based editing)
- **UI Components**: Ant Design
- **Data Grid**: Glide Data Grid (@glideapps/glide-data-grid)
- **Build Tool**: Yarn Berry with Lerna (monorepo management)
- **TypeScript**: ~5.2-5.8

### Backend
- **Server**: JupyterLab 4.x
- **Server Framework**: Jupyter Server with Tornado HTTP handlers
- **Python**: ≥3.8 (tested up to 3.12)
- **Data Processing**: Pandas 2.0+
- **Scheduling**: APScheduler with SQLAlchemy
- **Build System**: Hatchling (Python packaging)

### Build & Deployment
- **Package Manager**: Lerna (monorepo orchestration)
- **Python Packaging**: hatchling with jupyter-builder hooks
- **Container**: Docker (Python 3.11 slim base)

## Architecture Details

### jupyterlab-amphi Structure

The extension is organized as a **Lerna monorepo** with 6 interdependent packages:

#### 1. pipeline-editor
The main JupyterLab extension and React-based UI.

**Key Files**:
- `PipelineEditorWidget.tsx` - Main pipeline canvas widget
- `Commands.tsx` - JupyterLab command palette integration
- `Sidebar.tsx` - Component palette sidebar
- `PipelineRunService.tsx` - Pipeline execution service
- `PipelineDataViewService.tsx` - Data inspection service

**Responsibilities**:
- Visual pipeline design interface
- Pipeline serialization/deserialization (.ampln format)
- Code generation orchestration
- JupyterLab integration (commands, menus, sidebars)

#### 2. pipeline-components-manager
Central component registry and lifecycle management.

**Key Concepts**:
- `ComponentService` - Main service for component registration
- Token-based dependency injection (JupyterLab Token pattern)
- Component lifecycle management
- Code generation orchestration

**Usage**:
```typescript
const componentService = app.serviceManager.get(IComponentService);
const component = componentService.getComponent('FilterComponent');
```

#### 3. pipeline-components-core
Library of 29+ standard ETL components.

**Component Categories**:

**Inputs** (8 components):
- File: CSV, JSON, Excel, XML, Parquet
- Database: SQL query, MongoDB
- API: REST endpoints
- Script: Python input

**Transforms** (20+ components):
- Data Quality: Filter, Deduplicate, FillMissing, ReplaceValue
- Data Shaping: Aggregate, Pivot, Unpivot, Join, Union
- Data Type: DateTimeConverter, TypeConverter
- Column Operations: Rename, Reorder, Select, Drop, Split
- Text Processing: Extract (regex), TextCleaner
- Calculations: Expressions, Formula

**Outputs** (6 components):
- File: CSV, JSON, Excel, Parquet
- Database: SQL insert/update
- API: REST POST
- Script: Python output

**Settings & Annotations**:
- PipelineSettings
- TextAnnotation

**Component Structure**:
```typescript
interface ComponentItem {
  _id: string;              // Unique identifier
  _name: string;            // Display name
  _type: string;            // Category (inputs/transforms/outputs)
  _icon: string;            // Icon identifier
  _default: object;         // Default configuration
  _form: FormField[];       // Dynamic form definition
  generateComponentCode(): string;  // Code generation
}
```

#### 4. pipeline-components-local
Local-specific components for custom/development use. Same structure as core components but for organization-specific or experimental components.

#### 5. pipeline-console
Pipeline execution logging and console output display.

**Features**:
- Real-time execution logs
- Error/warning highlighting
- Execution history

#### 6. pipeline-metadata-panel
Data inspection and metadata viewing.

**Features**:
- Schema analysis
- Data profiling
- Column statistics
- Sample data preview

### Code Generation Flow

```
┌─────────────────────────┐
│  Visual Pipeline (JSON) │
│  (.ampln file format)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ComponentManager       │
│  Registry               │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  CodeGenerator class    │
│  (per component)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Python Code            │
│  (pandas-based)         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Jupyter Kernel         │
│  Execution              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Results/Console Output │
└─────────────────────────┘
```

**`.amcpn` - Component files** (JSON format for custom components)

### amphi-scheduler Architecture

**Backend** ([packages/pipeline-scheduler/pipeline_scheduler/handler.py](amphi-scheduler/packages/pipeline-scheduler/pipeline_scheduler/handler.py)):
- `SchedulerListHandler` - List all scheduled jobs
- `SchedulerJobHandler` - CRUD operations on individual jobs
- `SchedulerRunHandler` - Manual job execution
- `run_pipeline()` - Executes .py files or raw Python code

**Job Triggers**:
- **Cron**: Traditional cron expressions
- **Date**: Once, daily, weekly, monthly
- **Interval**: Every N seconds/minutes/hours/days

**Persistence**:
- SQLite database at `.amphi/scheduler.sqlite`
- SQLAlchemy ORM for job metadata
- APScheduler for execution engine

**Frontend** ([packages/pipeline-scheduler/src/index.tsx](amphi-scheduler/packages/pipeline-scheduler/src/index.tsx)):
- React-based job management UI
- Job creation/editing forms
- Execution history viewer

### amphi-etl Structure

The standalone application adds 2 packages to the extension:

#### 1. theme-light
Custom Amphi light theme with branding and color scheme.

#### 2. ui-component
Shared UI components for the standalone application interface.

**Entry Point** ([amphi/main.py](amphi-etl/amphi/main.py)):
```python
def main():
    # CLI: amphi start -w <workspace> -p <port> -i <ip>
    # Launches JupyterLab with Amphi configuration
```

**Configuration**:
- `config/labconfig/` - JupyterLab UI configuration (splash screen, themes)
- `config/settings/` - Extension settings overrides
- `config/server-config/` - Jupyter server configuration

## Build Workflow

### Installation Order
1. Build jupyterlab-amphi (foundation)
2. Build amphi-etl (wraps jupyterlab-amphi + adds theme)
3. Deploy with amphi-scheduler (optional)

### Build Scripts

**JavaScript/TypeScript**:
```bash
jlpm install          # Install JS dependencies
jlpm build            # Build all packages (dev)
jlpm build:prod       # Build all packages (production)
jlpm lint             # Run linting (JS + Python)
jlpm test             # Run tests
```

**Python**:
```bash
pip install -e .      # Editable install
pip install build     # Build wheel
python -m build       # Create distribution
```

### Development Mode

**jupyterlab-amphi**:
```bash
cd jupyterlab-amphi
jlpm install
jlpm build
jupyter labextension develop . --overwrite
```

**amphi-etl**:
```bash
cd amphi-etl
pip install -e .
amphi start -w ~/workspace
```

## Key Files Reference

### Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `package.json` | NPM workspace definition, build scripts | Root of each component |
| `pyproject.toml` | Python project config, hatchling setup | Root of each component |
| `lerna.json` | Lerna monorepo configuration | Each component |
| `tsconfigbase.json` | TypeScript base config | Each component |
| `.yarnrc.yml` | Yarn Berry configuration | Each component |
| `Dockerfile` | Container image | amphi-etl/ |
| `Makefile` | Build automation | Each component |

### Important Source Files

**jupyterlab-amphi**:
- [packages/pipeline-editor/src/PipelineEditorWidget.tsx](jupyterlab-amphi/packages/pipeline-editor/src/PipelineEditorWidget.tsx) - Main pipeline canvas
- [packages/pipeline-components-manager/src/ComponentService.ts](jupyterlab-amphi/packages/pipeline-components-manager/src/ComponentService.ts) - Component registry
- [packages/pipeline-components-core/src/components/](jupyterlab-amphi/packages/pipeline-components-core/src/components/) - ETL components library

**amphi-etl**:
- [amphi/main.py](amphi-etl/amphi/main.py) - CLI entry point
- [config/labconfig/](amphi-etl/config/labconfig/) - JupyterLab configuration

**amphi-scheduler**:
- [packages/pipeline-scheduler/pipeline_scheduler/handler.py](amphi-scheduler/packages/pipeline-scheduler/pipeline_scheduler/handler.py) - Backend API
- [packages/pipeline-scheduler/src/index.tsx](amphi-scheduler/packages/pipeline-scheduler/src/index.tsx) - Frontend UI

## Common Development Tasks

### Adding a New ETL Component

1. Create component class in [jupyterlab-amphi/packages/pipeline-components-core/src/components/](jupyterlab-amphi/packages/pipeline-components-core/src/components/)
2. Extend `BaseCoreComponent` or `PipelineComponent`
3. Define `_form` for dynamic UI generation
4. Implement `generateComponentCode()` for Python code generation
5. Register in component registry

Example:
```typescript
export class MyNewComponent extends BaseCoreComponent {
  public _id = 'myNewComponent';
  public _name = 'My New Component';
  public _type = 'transforms';
  public _icon = 'icon-name';
  public _default = { /* default config */ };
  public _form = { /* form definition */ };

  generateComponentCode(config: any): string {
    return `# Generated Python code
df = df.transform(...)`;
  }
}
```

### Modifying the Pipeline Editor UI

Edit files in [jupyterlab-amphi/packages/pipeline-editor/src/](jupyterlab-amphi/packages/pipeline-editor/src/):
- `PipelineEditorWidget.tsx` - Main canvas
- `Sidebar.tsx` - Component palette
- `PipelineNode.tsx` - Node rendering
- `PipelineEdge.tsx` - Edge rendering

### Adding a New Scheduler Trigger Type

1. Modify [amphi-scheduler/packages/pipeline-scheduler/pipeline_scheduler/handler.py](amphi-scheduler/packages/pipeline-scheduler/pipeline_scheduler/handler.py)
2. Update `_make_trigger()` function
3. Add UI in [amphi-scheduler/packages/pipeline-scheduler/src/index.tsx](amphi-scheduler/packages/pipeline-scheduler/src/index.tsx)

### Manual Testing
```bash
# Start amphi-etl in development mode
cd amphi-etl
amphi start -w ~/test-workspace -p 8888

# Or use JupyterLab directly
jupyter lab
```

## Deployment

### PyPI Installation
```bash
# Install jupyterlab-amphi as extension
pip install jupyterlab-amphi

# Or install full amphi-etl application
pip install amphi-etl
amphi start
```
## Resources

- **JupyterLab Extension Development**: https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html
- **ReactFlow Documentation**: https://reactflow.dev/
- **Ant Design Components**: https://ant.design/components/overview/
- **APScheduler Documentation**: https://apscheduler.readthedocs.io/

## License

This project is licensed under the Elastic License 2.0 (ELv2). See LICENSE file for details.

---

**Last Updated**: 2026-02-05

For questions or issues, please refer to the project's issue tracker or documentation.
