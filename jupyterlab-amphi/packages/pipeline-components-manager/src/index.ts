// index.ts — working provider + TS/TSX registrator with safe path handling and icon support

import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { Token } from '@lumino/coreutils';
import { ICommandPalette, Notification } from '@jupyterlab/apputils';
import { IFileBrowserFactory, IDefaultFileBrowser } from '@jupyterlab/filebrowser';

// === Public re-exports (keep as you had) ===
export { setDefaultConfig, onChange, GenerateUIFormComponent, FieldDescriptor, Option } from './configUtils';
export { renderComponentUI, renderHandle, createZoomSelector } from './rendererUtils';
export { PipelineComponent } from './PipelineComponent';
export { CodeGenerator } from './CodeGenerator';
export { CodeGeneratorDagster } from './CodeGeneratorDagster';
export { PipelineService } from './PipelineService';
export { RequestService } from './RequestService';
export { InputFile, InputRegular, SelectRegular, SelectColumns, CodeTextarea, CodeTextareaMirror } from './forms';

// === Types ===
interface ComponentItem {
  _id: string;
  _name: string;
  _type: string;                       // "inputs" | "transforms" | "outputs" | ...
  _category?: string;                  // optional, e.g. "inputs.something"
  _icon?: any;                         // LabIcon or { react?: FC; svgstr?: string }
  _default?: Record<string, any>;
  _form?: Record<string, any>;
  _description?: string;
  provideImports?: (ctx: any) => string[];
  generateComponentCode?: (ctx: { config: any; outputName: string }) => string;
  getInstance?: () => ComponentItem;
}

interface Components {
  getComponents(): ComponentItem[];
  getComponent(id: string): ComponentItem | undefined;
  addComponent(newComponent: ComponentItem): void;
  getComponentCount(): number;
  removeComponent(id: string): void;
}

export const ComponentManager = new Token<Components>('@amphi/pipeline-components-manager:provider');

// === Service ===
class ComponentService implements Components {
  _components: ComponentItem[] = [];
  getComponents() { return this._components; }
  getComponent(id: string) { return this._components.find(c => c._id === id); }
  addComponent(newComponent: ComponentItem) {
    const idx = this._components.findIndex(c => c._id === newComponent._id);
    if (idx >= 0) {
      this._components[idx] = newComponent;
      console.info(`[Amphi] Replaced component with id "${newComponent._id}".`);
    } else {
      this._components.push(newComponent);
    }
  }
  getComponentCount() { return this._components.length; }
  removeComponent(id: string) { this._components = this._components.filter(c => c._id !== id); }
}

// === Provider plugin ===
const managerPlugin: JupyterFrontEndPlugin<Components> = {
  id: '@amphi/pipeline-components-manager:plugin',
  description: 'Provider plugin for the pipeline editor "component" service object.',
  autoStart: true,
  provides: ComponentManager,
  activate: () => {

    console.log('JupyterLab extension (@amphi/pipeline-components-manager/provider) activated');
    return new ComponentService();
  }
};

// Remove imports and JSX to keep blob-import self-contained
function sanitizeSource(src: string): string {
  // 1) Disallow any import statements
  if (/\bimport\s+.*from\s+['"][^'"]+['"]\s*;?/.test(src) || /\bimport\s*['"][^'"]+['"]\s*;?/.test(src)) {
    throw new Error('[Amphi] External imports are not allowed in dynamically registered files.');
  }

  // 2) Strip comments
  const withoutBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/(^|[^:])\/\/.*$/gm, '$1'); // keep "http://"

  // 3) Strip string literals before JSX detection to avoid false positives
  //    Single quotes, double quotes, and template literals
  const stripSingles = withoutLineComments.replace(/'(?:\\.|[^'\\])*'/g, "''");
  const stripDoubles = stripSingles.replace(/"(?:\\.|[^"\\])*"/g, '""');
  // Replace template contents with empty template to keep line numbers roughly stable
  const strippedForJsxCheck = stripDoubles.replace(/`(?:\\.|[^\\`]|\\`|\$\{[^}]*\})*`/g, '``');

  // 4) Basic JSX detection on stripped source
  //    This catches real JSX like <Div ...> but ignores anything that was in strings/comments
  if (/<[A-Za-z][\w:-]*(\s[^>]*)?>/.test(strippedForJsxCheck)) {
    throw new Error('[Amphi] JSX is not allowed. Export a plain object or functions.');
  }

  // 5) Strip type-only exports and convert exported declarations to local
  let out = withoutLineComments.replace(/\bexport\s+type\s+[^;]+;?/g, '');
  out = out.replace(/\bexport\s+(?=(const|let|var|class|function)\b)/g, '');

  return out;
}

// Turn {svgstr} into a LabIcon if available (works without static imports)
async function maybeWrapAsLabIcon(icon: any): Promise<any> {
  if (!icon || typeof icon === 'function' || icon?.react) return icon;
  if (!icon?.svgstr) return icon;

  try {
    const w: any = (globalThis as any) || (window as any);
    const ui = w?.require ? w.require('@jupyterlab/ui-components') : null;
    const LabIcon = ui?.LabIcon ?? (await import('@jupyterlab/ui-components')).LabIcon;
    if (LabIcon) {
      return new LabIcon({ name: icon.name || 'amphi-inline', svgstr: icon.svgstr });
    }
  } catch {
    // fallback: leave as inline svgstr; the UI supports it
  }
  return icon;
}

// Normalize minimal component shape
async function normalizeComponent(candidate: any): Promise<ComponentItem | null> {
  const g: any = globalThis as any;
  const Base = g?.Amphi?.BaseCoreComponent;

  const inst = typeof candidate?.getInstance === 'function' ? candidate.getInstance() : candidate;
  if (!inst || typeof inst !== 'object') return null;

  // If it’s really a BaseCoreComponent instance, keep it intact
  if (Base && inst instanceof Base) {
    if (inst._icon) inst._icon = await maybeWrapAsLabIcon(inst._icon);
    // ensure required fields exist
    inst._type = String(inst._type || 'uncategorized');
    inst._category = String(inst._category || inst._type || 'uncategorized');
    inst._default = inst._default ?? {};
    inst._form = inst._form ?? {};
    inst._description = inst._description ?? '';
    return inst as unknown as ComponentItem;
  }

  // Fallback: plain-object path (legacy)
  if (!inst._id || !inst._name) return null;
  return {
    _id: String(inst._id),
    _name: String(inst._name),
    _type: String(inst._type || 'uncategorized'),
    _category: String(inst._category || inst._type || 'uncategorized'),
    _icon: await maybeWrapAsLabIcon(inst._icon),
    _default: inst._default ?? {},
    _form: inst._form ?? {},
    _description: inst._description ?? '',
    provideImports: inst.provideImports,
    generateComponentCode: inst.generateComponentCode,
    getInstance: undefined
  };
}

// === Command plugin: register TS/TSX component ===
const addTsxComponentPlugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-manager:add-tsx-component',
  autoStart: true,
  requires: [ComponentManager, IFileBrowserFactory, IDefaultFileBrowser, ICommandPalette],
  activate: async (
    app: JupyterFrontEnd,
    componentService: Components,
    _browserFactory: IFileBrowserFactory,
    defaultFileBrowser: IDefaultFileBrowser,
    palette: ICommandPalette
  ) => {
    console.log('JupyterLab extension (@amphi/pipeline-components-manager/add-tsx-component) activated');

    const command = '@amphi/pipeline-components-manager:register-tsx';

    app.commands.addCommand(command, {
      label: () => 'Add Component',
      caption: 'Transpile and register this TS/TSX file as an Amphi component',
      execute: async args => {
        try {
          // Resolve a string path
          let path = typeof args['path'] === 'string' ? (args['path'] as string) : '';
          if (!path) {
            const it = defaultFileBrowser.selectedItems().next();
            if (!it || it.done || !it.value) {
              Notification.error('No file selected in the file browser.', {
                actions: [{ label: 'Reload and try again', callback: () => location.reload() }],
                autoClose: 6000
              });
              return;
            }
            path = (it.value as any).path ?? '';
          }
          if (!path || typeof path !== 'string') {
            Notification.error('Could not resolve a valid string path.', {
              actions: [{ label: 'Reload and try again', callback: () => location.reload() }],
              autoClose: 6000
            });
            return;
          }

          if (!/\.(ts|tsx)$/i.test(path)) {
            Notification.error('Please select a .ts or .tsx file.', { autoClose: 6000 });
            return;
          }

          // Load file text
          const model = await app.serviceManager.contents.get(path, { content: true });
          const raw = (model as any).content as string;
          if (typeof raw !== 'string') {
            Notification.error('File content is not text.', { autoClose: 6000 });
            return;
          }

          // Sanitize before transpile
          let source: string;
          try {
            source = sanitizeSource(raw);
          } catch (e: any) {
            Notification.error(String(e?.message ?? e), {
              actions: [{ label: 'Reload and try again', callback: () => location.reload() }],
              autoClose: 8000
            });
            return;
          }

          // Transpile
          const ts = await import('typescript');
          const transpiled = ts.transpileModule(source, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2020,
              module: ts.ModuleKind.ES2020,
              esModuleInterop: false,
              jsx: ts.JsxEmit.Preserve
            }
          });
          if (transpiled.diagnostics?.length) {
            console.warn('[Amphi] Diagnostics:', transpiled.diagnostics);
          }

          // Import from blob
          const blob = new Blob([transpiled.outputText], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          try {
            const mod: any = await import(/* webpackIgnore: true */ url);
            const candidate = mod?.default ?? mod?.Component ?? mod;
            const normalized = await normalizeComponent(candidate);

            if (!normalized) {
              Notification.error('No valid component export found. Expect default export with {_id, _name}.', {
                autoClose: 7000
              });
              return;
            }

            // Ensure required fields
            if (!normalized._category) normalized._category = normalized._type || 'uncategorized';

            const existed = !!componentService.getComponent(normalized._id);
            componentService.addComponent(normalized);

            Notification.success(
              existed
                ? `Component "${normalized._name}" (${normalized._id}) updated successfully.`
                : `Component "${normalized._name}" (${normalized._id}) added successfully.`,
              { autoClose: 4000 }
            );

            console.log('[Amphi] Component registered:', normalized._id, normalized);
          } catch (err: any) {
            console.error('[Amphi] Failed to import transpiled module', err);
            Notification.error(`Failed to import transpiled module. ${String(err?.message ?? err)}`, {
              actions: [{ label: 'Reload and try again', callback: () => location.reload() }],
              autoClose: 8000
            });
          } finally {
            URL.revokeObjectURL(url);
          }
        } catch (err: any) {
          console.error('[Amphi] Unexpected error while processing file', err);
          Notification.error(`Unexpected error while processing file. ${String(err?.message ?? err)}`, {
            actions: [{ label: 'Reload and try again', callback: () => location.reload() }],
            autoClose: 8000
          });
        }
      }
    });

    // Palette and context menu
    palette.addItem({ command, category: 'Pipeline', args: { isPalette: true } });
    app.contextMenu.addItem({ command, selector: '.jp-DirListing-item', rank: 100 });
    palette.addItem({ command, category: 'Amphi' });
  }
};

export { ComponentItem, Components };
const plugins: JupyterFrontEndPlugin<any>[] = [managerPlugin, addTsxComponentPlugin];
export default plugins;