import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, Notification, ReactWidget } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ComponentManager } from '@amphi/pipeline-components-manager';
import { puzzleIcon } from './icons';

import React, { useEffect, useMemo, useState } from 'react';
import { CloseOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Empty, Input, Modal, Radio, Tree } from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';

import '../style/index.css';

interface ComponentItem {
  _id: string;
  _name: string;
  _type: string;
  _category?: string;
  _description?: string;
  _icon?: any;
  _default?: Record<string, any>;
  _form?: Record<string, any>;
  provideImports?: (ctx: any) => string[];
  generateComponentCode?: (ctx: { config: any; outputName: string }) => string;
  getInstance?: () => ComponentItem;
}

interface ComponentsService {
  getComponents(): ComponentItem[];
  getComponent(id: string): ComponentItem | undefined;
  addComponent(newComponent: ComponentItem): void;
  removeComponent(id: string): void;
}

type SourceMode = 'code' | 'link';

interface ComponentsConfig {
  sources: string[];
}

const AMPHI_DIR_PATH = '.amphi';
const AMPHI_COMPONENTS_DIR = '.amphi/components';

/**
 * Normalize path for Jupyter's contents API.
 * Jupyter's contents API can handle hidden directories (starting with '.'),
 * but we need to ensure paths are clean and relative.
 */
function normalizeForJupyter(path: string): string {
  // Only strip './' prefix, but keep single '.' for hidden directories like '.amphi'
  if (path.startsWith('./')) {
    return path.slice(2);
  }
  return path;
}

function formatCategoryLabel(category: string): string {
  return category
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function isRemoteSource(source: string): boolean {
  return /^https?:\/\//i.test(source.trim());
}

function toStoredSource(input: string): string {
  const value = input.trim();
  if (isRemoteSource(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    throw new Error('Please provide a relative path (for example: ./.amphi/components/my_component.tsx).');
  }

  return value.startsWith('./') ? value : `./${value.replace(/^\.\//, '')}`;
}

function toJupyterPath(source: string): string {
  return source.replace(/^\.\//, '').replace(/^\/+/, '');
}

function normalizeWorkspaceRootPath(path: string): string {
  const value = (path || '').trim();
  if (!value || value === '/' || value === '.') {
    return '';
  }
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function joinWorkspacePath(workspaceRootPath: string, relativePath: string): string {
  const rel = relativePath.replace(/^\/+/, '');
  const root = normalizeWorkspaceRootPath(workspaceRootPath);
  if (!root) {
    return rel;
  }
  return PathExt.join(root, rel);
}

function toWorkspacePathFromSource(source: string, workspaceRootPath: string): string {
  let jupyterPath = toJupyterPath(source);

  // If the path starts with 'components/', it's stored relative to .amphi/ directory
  // Convert it to be relative to workspace root: .amphi/components/...
  if (jupyterPath.startsWith('components/')) {
    jupyterPath = `.amphi/${jupyterPath}`;
  }

  return joinWorkspacePath(workspaceRootPath, jupyterPath);
}

function isManagedLocalSource(source: string, workspaceRootPath: string): boolean {
  if (isRemoteSource(source)) {
    return false;
  }

  const localPath = toWorkspacePathFromSource(source, workspaceRootPath);
  const componentsRoot = joinWorkspacePath(workspaceRootPath, AMPHI_COMPONENTS_DIR);
  return localPath.startsWith(`${componentsRoot}/`) || localPath.startsWith(`${componentsRoot}\\`);
}

function extractSection(content: string, header: string): { before: string; section: string; after: string } {
  const lines = content.split('\n');
  const headerRegex = new RegExp(`^\\s*\\[${header}\\]\\s*$`);
  let start = -1;

  for (let i = 0; i < lines.length; i++) {
    if (headerRegex.test(lines[i])) {
      start = i;
      break;
    }
  }

  if (start < 0) {
    return { before: content, section: '', after: '' };
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[[^\]]+\]\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return {
    before: lines.slice(0, start).join('\n'),
    section: lines.slice(start, end).join('\n'),
    after: lines.slice(end).join('\n')
  };
}

function readArrayBlock(section: string, key: string): string[] {
  const keyRegex = new RegExp(`^\\s*${key}\\s*=\\s*\\[\\s*$`, 'm');
  const match = keyRegex.exec(section);
  if (!match || match.index === undefined) {
    return [];
  }

  const start = section.indexOf('[', match.index);
  if (start < 0) {
    return [];
  }

  let inString = false;
  let escaped = false;
  let depth = 0;
  let end = -1;

  for (let i = start; i < section.length; i++) {
    const ch = section[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '[') {
      depth += 1;
      continue;
    }

    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) {
    return [];
  }

  const body = section.slice(start + 1, end);
  const values: string[] = [];
  const stringRegex = /"((?:[^"\\]|\\.)*)"/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = stringRegex.exec(body)) !== null) {
    const raw = itemMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
    if (raw) {
      values.push(raw);
    }
  }

  return values;
}

function renderArrayBlock(key: string, values: string[]): string {
  const escaped = values.map(value => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
  const renderedItems = escaped.map(value => `  "${value}",`).join('\n');
  return `${key} = [\n${renderedItems}${renderedItems ? '\n' : ''}]`;
}

function parseComponentsConfig(rawToml: string): ComponentsConfig {
  const { section } = extractSection(rawToml, 'components');
  if (!section) {
    return { sources: [] };
  }

  return {
    sources: readArrayBlock(section, 'sources')
  };
}

function applyComponentsConfig(rawToml: string, config: ComponentsConfig): string {
  const normalizedSources = Array.from(new Set(config.sources.map(source => source.trim()).filter(Boolean)));

  const nextSection = [
    '[components]',
    renderArrayBlock('sources', normalizedSources)
  ].join('\n\n');

  const { before, section, after } = extractSection(rawToml, 'components');
  if (!section) {
    const prefix = rawToml.trim();
    return `${prefix}${prefix ? '\n\n' : ''}${nextSection}\n`;
  }

  const beforeTrimmed = before.replace(/\s+$/, '');
  const afterTrimmed = after.replace(/^\s+/, '');
  const parts = [beforeTrimmed, nextSection, afterTrimmed].filter(Boolean);
  return `${parts.join('\n\n')}\n`;
}

const ComponentsPanel: React.FC<{
  app: JupyterFrontEnd;
  componentService: ComponentsService;
  getCurrentBrowserPath: () => string;
  workspaceRootPath: string;
}> = ({ app, componentService, getCurrentBrowserPath, workspaceRootPath }) => {
  const [componentCatalog, setComponentCatalog] = useState<ComponentItem[]>(() => componentService.getComponents());
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(
    () => new Set(componentService.getComponents().map(component => component._id))
  );
  const [componentSourceById, setComponentSourceById] = useState<Record<string, string>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>('code');
  const [codeValue, setCodeValue] = useState('');
  const [linkValue, setLinkValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stopKeyPropagation = (event: React.KeyboardEvent) => {
    event.stopPropagation();
  };

  const stopClipboardPropagation = (event: React.ClipboardEvent) => {
    event.stopPropagation();
  };

  const ensureDirectory = async (_path: string) => {
    // Backend (amphi-scheduler) creates .amphi and .amphi/components at startup
    // We trust it exists and don't verify, since Jupyter's contents API
    // may not expose hidden directories (starting with '.') even if they exist
    // on the filesystem. We'll just try to write files and handle errors there.
    return;
  };

  const readConfigToml = async (): Promise<string> => {
    try {
      // Use backend API to read config.toml from .amphi directory
      const response = await fetch(
        `${app.serviceManager.serverSettings.baseUrl}pipeline-scheduler/components-config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `token ${app.serviceManager.serverSettings.token}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
      return '';
    } catch {
      return '';
    }
  };

  const writeConfigToml = async (config: ComponentsConfig) => {
    await ensureDirectory(joinWorkspacePath(workspaceRootPath, AMPHI_DIR_PATH));
    const current = await readConfigToml();
    const next = applyComponentsConfig(current, config);

    // Use backend API to write config.toml to .amphi directory
    const response = await fetch(
      `${app.serviceManager.serverSettings.baseUrl}pipeline-scheduler/components-config`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${app.serviceManager.serverSettings.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: next })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to write config');
    }
  };

  const readConfig = async (): Promise<ComponentsConfig> => {
    const raw = await readConfigToml();
    return parseComponentsConfig(raw);
  };

  const syncFromService = (showNotification = false) => {
    const liveComponents = componentService.getComponents();
    const nextCatalogById = new Map(componentCatalog.map(component => [component._id, component]));

    for (const component of liveComponents) {
      nextCatalogById.set(component._id, component);
    }

    setComponentCatalog(Array.from(nextCatalogById.values()));
    setRegisteredIds(new Set(liveComponents.map(component => component._id)));

    if (showNotification) {
      Notification.success('Components list refreshed.', { autoClose: 2500 });
    }
  };

  const registerLocalSource = async (storedSource: string) => {
    const path = normalizeForJupyter(toWorkspacePathFromSource(storedSource, workspaceRootPath));
    await app.commands.execute('@amphi/pipeline-components-manager:register-tsx', {
      path: path
    });
  };

  const registerRemoteSource = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load URL (${response.status}).`);
    }

    const source = await response.text();
    const currentPath = getCurrentBrowserPath();
    const fileName = `amphi_component_${Date.now()}.tsx`;
    const tempPath = currentPath ? PathExt.join(currentPath, fileName) : fileName;

    await app.serviceManager.contents.save(tempPath, {
      type: 'file',
      format: 'text',
      content: source
    });

    try {
      await app.commands.execute('@amphi/pipeline-components-manager:register-tsx', {
        path: tempPath
      });
    } finally {
      await app.serviceManager.contents.delete(tempPath).catch(() => undefined);
    }
  };

  const registerSource = async (storedSource: string) => {
    if (isRemoteSource(storedSource)) {
      await registerRemoteSource(storedSource);
    } else {
      await registerLocalSource(storedSource);
    }
  };

  const findComponentIdForSource = (
    beforeIds: Set<string>,
    source: string,
    previousSourceToId: Map<string, string>
  ): string | null => {
    const afterIds = new Set(componentService.getComponents().map(component => component._id));
    const knownId = previousSourceToId.get(source);

    if (knownId && afterIds.has(knownId)) {
      return knownId;
    }

    const added = Array.from(afterIds).filter(id => !beforeIds.has(id));
    if (added.length === 1) {
      return added[0];
    }

    return null;
  };

  const loadConfiguredComponents = async (showNotification = false) => {
    const config = await readConfig();

    const previousSourceToId = new Map<string, string>();
    for (const [componentId, source] of Object.entries(componentSourceById)) {
      previousSourceToId.set(source, componentId);
    }

    const nextComponentSourceById: Record<string, string> = {};

    for (const storedSource of config.sources) {
      const knownComponentId = previousSourceToId.get(storedSource);
      if (knownComponentId && componentCatalog.some(component => component._id === knownComponentId)) {
        nextComponentSourceById[knownComponentId] = storedSource;
        continue;
      }

      try {
        const beforeIds = new Set(componentService.getComponents().map(component => component._id));
        await registerSource(storedSource);
        const componentId = findComponentIdForSource(beforeIds, storedSource, previousSourceToId);
        if (componentId) {
          nextComponentSourceById[componentId] = storedSource;
        }
      } catch (error: any) {
        Notification.warning(
          `Could not register configured component source: ${storedSource}. ${String(error?.message ?? error)}`,
          { autoClose: 5000 }
        );
      }
    }

    setComponentSourceById(nextComponentSourceById);
    syncFromService(showNotification);
  };

  useEffect(() => {
    void loadConfiguredComponents(false);
  }, []);

  const onCheck: TreeProps['onCheck'] = checkedKeysValue => {
    const keys = Array.isArray(checkedKeysValue)
      ? checkedKeysValue
      : (checkedKeysValue.checked as React.Key[]);

    const nextCheckedComponentIds = new Set(
      keys
        .map(value => String(value))
        .filter(value => componentCatalog.some(component => component._id === value))
    );

    const currentRegistered = new Set(componentService.getComponents().map(component => component._id));
    const nextCatalogById = new Map(componentCatalog.map(component => [component._id, component]));

    for (const componentId of nextCheckedComponentIds) {
      if (!currentRegistered.has(componentId)) {
        const component = nextCatalogById.get(componentId);
        if (component) {
          componentService.addComponent(component);
        }
      }
    }

    for (const componentId of currentRegistered) {
      if (!nextCheckedComponentIds.has(componentId)) {
        componentService.removeComponent(componentId);
      }
    }

    setRegisteredIds(nextCheckedComponentIds);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSourceMode('code');
    setCodeValue('');
    setLinkValue('');
  };

  const removeConfiguredComponent = async (componentId: string) => {
    try {
      const source = componentSourceById[componentId];
      if (!source) {
        return;
      }

      const config = await readConfig();
      const nextConfig: ComponentsConfig = {
        sources: config.sources.filter(item => item !== source)
      };
      await writeConfigToml(nextConfig);

      if (isManagedLocalSource(source, workspaceRootPath)) {
        const localPath = toWorkspacePathFromSource(source, workspaceRootPath);
        // Extract filename from path
        const fileName = localPath.split('/').pop() || localPath.split('\\').pop();
        if (fileName) {
          // Use backend API to delete component file
          await fetch(
            `${app.serviceManager.serverSettings.baseUrl}pipeline-scheduler/components-file?filename=${encodeURIComponent(fileName)}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `token ${app.serviceManager.serverSettings.token}`
              }
            }
          ).catch((): void => undefined);
        }
      }

      componentService.removeComponent(componentId);
      setComponentCatalog(prev => prev.filter(component => component._id !== componentId));
      setRegisteredIds(prev => {
        const next = new Set(prev);
        next.delete(componentId);
        return next;
      });

      setComponentSourceById(prev => {
        const next = { ...prev };
        delete next[componentId];
        return next;
      });
    } catch (error: any) {
      Notification.error(String(error?.message ?? error), { autoClose: 5000 });
    }
  };

  const registerNewComponent = async () => {
    try {
      setIsSubmitting(true);

      const config = await readConfig();
      let storedSource = '';

      if (sourceMode === 'code') {
        const code = codeValue.trim();
        if (!code) {
          throw new Error('Please provide component code.');
        }

        await ensureDirectory(joinWorkspacePath(workspaceRootPath, AMPHI_DIR_PATH));
        await ensureDirectory(joinWorkspacePath(workspaceRootPath, AMPHI_COMPONENTS_DIR));

        const fileName = `amphi_component_${Date.now()}.tsx`;

        // Use backend API to save component file to .amphi/components/
        const response = await fetch(
          `${app.serviceManager.serverSettings.baseUrl}pipeline-scheduler/components-file`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${app.serviceManager.serverSettings.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: fileName, content: code })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save component file');
        }

        // Path stored in config.toml (relative to .amphi/ where config.toml lives)
        storedSource = `./components/${fileName}`;
      } else {
        const raw = linkValue.trim();
        if (!raw) {
          throw new Error('Please provide a component URL or relative path.');
        }
        if (!/\.tsx?(\?|#|$)/i.test(raw)) {
          throw new Error('Source must reference a .ts or .tsx file.');
        }

        storedSource = toStoredSource(raw);
      }

      const nextConfig: ComponentsConfig = {
        sources: Array.from(new Set([...config.sources, storedSource]))
      };
      await writeConfigToml(nextConfig);

      const beforeIds = new Set(componentService.getComponents().map(component => component._id));
      await registerSource(storedSource);

      const componentId = findComponentIdForSource(beforeIds, storedSource, new Map());
      if (componentId) {
        setComponentSourceById(prev => ({ ...prev, [componentId]: storedSource }));
      }

      syncFromService();
      closeModal();
    } catch (error: any) {
      Notification.error(String(error?.message ?? error), { autoClose: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const treeData: TreeDataNode[] = useMemo(() => {
    const categories = new Map<string, ComponentItem[]>();

    for (const component of componentCatalog) {
      const category = component._category || 'uncategorized';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(component);
    }

    return Array.from(categories.entries()).map(([category, components]) => ({
      title: formatCategoryLabel(category),
      key: `category:${category}`,
      children: components.map(component => {
        const source = componentSourceById[component._id];
        return {
          title: (
            <div className="amphi-ComponentsPanel__componentRow">
              <span className="amphi-ComponentsPanel__componentName">{component._name}</span>
              {source ? (
                <Button
                  type="text"
                  size="small"
                  className="amphi-ComponentsPanel__removeButton"
                  icon={<CloseOutlined />}
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    void removeConfiguredComponent(component._id);
                  }}
                />
              ) : null}
            </div>
          ),
          key: component._id
        };
      })
    }));
  }, [componentCatalog, componentSourceById]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5F9B97'
        }
      }}
    >
      <div className="amphi-ComponentsPanel">
        <div className="amphi-ComponentsPanel__header">
        </div>
        <div className="amphi-ComponentsPanel__actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="amphi-ComponentsPanel__actionButton"
            onClick={openModal}
          >
            Add Component
          </Button>
          <Button
            icon={<ReloadOutlined />}
            className="amphi-ComponentsPanel__actionButton"
            onClick={() => {
              void loadConfiguredComponents(true);
            }}
          />
        </div>

        <div className="amphi-ComponentsPanel__tree">
          {componentCatalog.length === 0 ? (
            <Empty description="No components found" />
          ) : (
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={Array.from(registeredIds)}
              onCheck={onCheck}
              treeData={treeData}
            />
          )}
        </div>

        <div className="amphi-ComponentsPanel__footer">
          Browse components and enable/disable components.
        </div>

        <Modal
          title="Add Component"
          open={isModalOpen}
          onOk={registerNewComponent}
          okText="Register"
          confirmLoading={isSubmitting}
          onCancel={closeModal}
          destroyOnClose
        >
          <Radio.Group
            value={sourceMode}
            onChange={event => setSourceMode(event.target.value)}
            style={{ marginBottom: 12 }}
          >
            <Radio.Button value="code">Code</Radio.Button>
            <Radio.Button value="link">URL / Relative path</Radio.Button>
          </Radio.Group>

          {sourceMode === 'code' ? (
            <Input.TextArea
              value={codeValue}
              onChange={event => setCodeValue(event.target.value)}
              onKeyDown={stopKeyPropagation}
              onCopy={stopClipboardPropagation}
              onCut={stopClipboardPropagation}
              onPaste={stopClipboardPropagation}
              rows={12}
              placeholder="Paste a component file (.ts or .tsx)."
            />
          ) : (
            <Input
              value={linkValue}
              onChange={event => setLinkValue(event.target.value)}
              onKeyDown={stopKeyPropagation}
              onCopy={stopClipboardPropagation}
              onCut={stopClipboardPropagation}
              onPaste={stopClipboardPropagation}
              placeholder="https://.../component.tsx or ./.amphi/components/component.tsx"
            />
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

namespace CommandIDs {
  export const open = 'components-panel:open';
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/components-panel:plugin',
  autoStart: true,
  requires: [ICommandPalette, ComponentManager, IDefaultFileBrowser],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    componentService: ComponentsService,
    defaultFileBrowser: IDefaultFileBrowser
  ) => {
    const { commands, shell } = app;

    commands.addCommand(CommandIDs.open, {
      label: 'Pipeline Components',
      caption: 'Manage registered pipeline components',
      execute: () => {
        class ComponentsPanelWidget extends ReactWidget {
          // Align with scheduler behavior: always root workspace `.amphi`.
          private _workspaceRootPath = '';

          constructor() {
            super();
            this.id = 'amphi-components-panel';
            this.title.caption = 'Pipeline Components';
            this.title.icon = puzzleIcon;
            this.title.closable = true;
          }

          render() {
            return (
              <ComponentsPanel
                app={app}
                componentService={componentService}
                getCurrentBrowserPath={() => defaultFileBrowser.model.path}
                workspaceRootPath={this._workspaceRootPath}
              />
            );
          }
        }

        let widget: ReactWidget | undefined;
        for (const item of shell.widgets('left')) {
          if (item.id === 'amphi-components-panel') {
            widget = item as ReactWidget;
            break;
          }
        }

        if (!widget || widget.isDisposed) {
          widget = new ComponentsPanelWidget();
        }

        if (!widget.isAttached) {
          shell.add(widget, 'left');
        }
        shell.activateById(widget.id);
      }
    });

    palette.addItem({ command: CommandIDs.open, category: 'Amphi' });
    commands.execute(CommandIDs.open);
  }
};

export default plugin;
