import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, Notification, ReactWidget } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ComponentManager } from '@amphi/pipeline-components-manager';
import { puzzleIcon } from './icons';

import React, { useMemo, useState } from 'react';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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

type SourceMode = 'code' | 'url';

function formatCategoryLabel(category: string): string {
  return category
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

const ComponentsPanel: React.FC<{
  app: JupyterFrontEnd;
  componentService: ComponentsService;
  getCurrentBrowserPath: () => string;
}> = ({ app, componentService, getCurrentBrowserPath }) => {
  const [componentCatalog, setComponentCatalog] = useState<ComponentItem[]>(() => componentService.getComponents());
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(
    () => new Set(componentService.getComponents().map(component => component._id))
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>('code');
  const [codeValue, setCodeValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stopKeyPropagation = (event: React.KeyboardEvent) => {
    event.stopPropagation();
  };
  const stopClipboardPropagation = (event: React.ClipboardEvent) => {
    event.stopPropagation();
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
      children: components.map(component => ({
        title: component._name,
        key: component._id
      }))
    }));
  }, [componentCatalog]);

  const syncFromService = () => {
    const liveComponents = componentService.getComponents();
    const nextCatalogById = new Map(componentCatalog.map(component => [component._id, component]));

    for (const component of liveComponents) {
      nextCatalogById.set(component._id, component);
    }

    setComponentCatalog(Array.from(nextCatalogById.values()));
    setRegisteredIds(new Set(liveComponents.map(component => component._id)));
    Notification.success('Components list refreshed.', { autoClose: 2500 });
  };

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
    setUrlValue('');
  };

  const registerNewComponent = async () => {
    try {
      setIsSubmitting(true);

      let source = '';
      if (sourceMode === 'code') {
        source = codeValue.trim();
        if (!source) {
          throw new Error('Please provide component code.');
        }
      } else {
        const url = urlValue.trim();
        if (!url) {
          throw new Error('Please provide a component URL.');
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Could not load URL (${response.status}).`);
        }

        source = await response.text();
      }

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
        // Best-effort cleanup of temporary source file.
        await app.serviceManager.contents.delete(tempPath).catch(() => undefined);
      }

      syncFromService();
      closeModal();
    } catch (error: any) {
      Notification.error(String(error?.message ?? error), { autoClose: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            onClick={syncFromService}
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
          Browse categories and enable/disable components.
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
            <Radio.Button value="url">URL</Radio.Button>
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
              value={urlValue}
              onChange={event => setUrlValue(event.target.value)}
              onKeyDown={stopKeyPropagation}
              onCopy={stopClipboardPropagation}
              onCut={stopClipboardPropagation}
              onPaste={stopClipboardPropagation}
              placeholder="https://.../component.tsx"
            />
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

namespace CommandIDs {
  export const open = 'pipeline-components-panel:open';
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-panel:plugin',
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
          constructor() {
            super();
            this.id = 'amphi-pipeline-components-panel';
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
              />
            );
          }
        }

        let widget: ReactWidget | undefined;
        for (const item of shell.widgets('left')) {
          if (item.id === 'amphi-pipeline-components-panel') {
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
