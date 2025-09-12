# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Amphi for JupyterLab is a Micro ETL (Extract, Transform, Load) extension designed for building data pipelines with a graphical user interface. The project generates native Python code that can be deployed anywhere. It's currently in beta and uses a monorepo architecture with Lerna for package management.

## Commands

### Development & Building
```bash
# Install dependencies and set up project
jlpm                              # Install JS dependencies
python -m pip install -e ".[dev,lint,test,docs]"  # Install Python dependencies

# Build commands
jlpm build                        # Build all packages in development mode
jlpm build:prod                   # Build all packages for production
jlpm build:py                     # Build Python components

# Clean commands
jlpm clean                        # Clean built files
jlpm clean:all                    # Clean all build artifacts and caches
```

### Code Quality & Linting
```bash
# Linting (run before commits)
jlpm lint                         # Lint both JS and Python code
jlpm lint:js                      # Lint and fix JavaScript/TypeScript
jlpm lint:py                      # Lint and fix Python code

# Check-only versions (for CI)
jlpm lint:check                   # Check linting without fixing
jlpm eslint:check                 # Check ESLint without fixing
jlpm prettier:check               # Check Prettier formatting
```

### Testing
```bash
jlpm test                         # Run Python tests
jlpm test:py                      # Run Python tests (alias)
pytest                           # Run Python tests directly
```

### Package Management
```bash
jlpm deduplicate                  # Remove duplicate dependencies
lerna run <script> --stream       # Run script across all packages
lerna version                     # Version packages
```

### Development Workflow
```bash
# Watch mode for active development
jlpm watch                        # Watch and rebuild on changes (in package directories)

# Building individual packages
cd packages/<package-name>
jlpm build                        # Build specific package
```

## Architecture

### Monorepo Structure
- **Root**: Contains main `package.json`, Lerna configuration, and build orchestration
- **packages/**: Contains 6 main packages organized by functionality
  - `pipeline-editor`: Main JupyterLab extension and React-based pipeline editor UI
  - `pipeline-components-manager`: Core component management and code generation
  - `pipeline-components-core`: Standard ETL components (transforms, inputs, outputs)
  - `pipeline-components-local`: Local-specific components
  - `pipeline-console`: Pipeline execution logging and console
  - `pipeline-metadata-panel`: Metadata inspection panel

### Key Technologies
- **Frontend**: React, TypeScript, JupyterLab extension architecture
- **Flow Editor**: ReactFlow for visual pipeline editing
- **UI Library**: Ant Design components
- **Build**: Lerna monorepo, TypeScript compilation, JupyterLab builder
- **Python**: JupyterLab server extensions, Pandas for data processing

### Component System Architecture
The project uses a plugin-based component system:

1. **ComponentManager** (`packages/pipeline-components-manager`): 
   - Central registry for all pipeline components
   - Provides `ComponentService` that manages component lifecycle
   - Token-based dependency injection pattern using JupyterLab's `Token` system

2. **Component Definition Pattern**:
   - Each component implements `ComponentItem` interface
   - Components define: `_id`, `_name`, `_type`, `_icon`, `_default`, `_form`
   - Form definitions drive dynamic UI generation

3. **Code Generation**:
   - `CodeGenerator` class converts visual pipeline to Python code
   - `CodeGeneratorDagster` for Dagster-specific code generation
   - Supports incremental execution and dependency management

### JupyterLab Integration
- **File Types**: Custom `.ampln` (pipeline) and `.amcpn` (component) file formats
- **Document Model**: Custom document registry integration
- **Commands**: Extensive command palette integration for all operations
- **Context Menus**: Right-click actions on components and files
- **Kernel Integration**: Direct Python kernel execution for pipeline runs

### Data Flow
1. **Visual Design**: User creates pipeline in ReactFlow-based editor
2. **JSON Representation**: Pipeline stored as JSON with nodes/edges structure
3. **Code Generation**: JSON converted to executable Python code
4. **Execution**: Code runs in JupyterLab kernel with dependency management
5. **Output**: Results displayed in console/data panels

## Development Guidelines

### Building New Components
- Extend base classes in `packages/pipeline-components-core/src/components/`
- Follow the `ComponentItem` interface pattern
- Register components with `ComponentManager` service
- Implement both UI form definition and code generation logic

### Package Dependencies
- Core packages follow dependency hierarchy: `core` ← `local` ← `manager` ← `editor`
- Use workspace resolution for internal packages (`"file:./../package-name"`)
- JupyterLab extensions use shared package configuration to avoid duplication

### File Extensions
- `.ampln`: Pipeline files (JSON format)
- `.amcpn`: Component files (JSON format)
- Use JSON editor as fallback for both file types

### Python Integration
- All generated code targets pandas-based data processing
- Automatic dependency installation via pip commands
- Kernel session management for execution context