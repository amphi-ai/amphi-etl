import React from 'react';
import ReactDOM from 'react-dom';
import { Switch, ConfigProvider, Space, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Dialog } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  BreadCrumbs,
  DirListing,
  FilterFileBrowserModel
} from '@jupyterlab/filebrowser';
import { Widget, PanelLayout } from '@lumino/widgets';

const BROWSE_FILE_CLASS = 'amphi-browseFileDialog';
const BROWSE_FILE_OPEN_CLASS = 'amphi-browseFileDialog-open';
const { Text } = Typography;

export interface IBrowseFileDialogOptions {
  filter?: (model: any) => boolean;
  multiselect?: boolean;
  includeDir?: boolean;
  acceptFileOnDblClick?: boolean;
  rootPath?: string;
  startPath?: string;
  extensions?: string[];
}

interface IBrowseFileBreadCrumbsOptions extends BreadCrumbs.IOptions {
  rootPath?: string;
}

/* ───────────────────────── breadcrumbs ───────────────────────── */
class BrowseFileDialogBreadcrumbs extends BreadCrumbs {
  model: any;
  rootPath?: string;

  constructor(options: IBrowseFileBreadCrumbsOptions) {
    super(options);
    this.model = options.model;
    this.rootPath = options.rootPath;
  }

  protected onUpdateRequest(msg: any): void {
    super.onUpdateRequest(msg);
    const contents = this.model.manager.services.contents;
    const localPath = contents.localPath(this.model.path);

    if (localPath && this.rootPath && localPath.indexOf(this.rootPath) === 0) {
      const crumbs = document.querySelectorAll(
        `.${BROWSE_FILE_CLASS} .jp-BreadCrumbs > span[title]`
      );
      crumbs.forEach(c => {
        const s = c as HTMLSpanElement;
        if (s.title.indexOf(this.rootPath ?? '') === 0) {
          s.className = s.className.replace('amphi-BreadCrumbs-disabled', '').trim();
        } else if (s.className.indexOf('amphi-BreadCrumbs-disabled') === -1) {
          s.className += ' amphi-BreadCrumbs-disabled';
        }
      });
    }
  }
}

/* ─────────────────────── main widget ─────────────────────────── */
class BrowseFileDialog extends Widget implements Dialog.IBodyWidget<IBrowseFileDialogOptions> {
  directoryListing: DirListing;
  breadCrumbs: BreadCrumbs;
  switchWidget: Widget | null = null;
  dirListingHandleEvent: (event: Event) => void;
  multiselect: boolean;
  includeDir: boolean;
  acceptFileOnDblClick: boolean;
  model: FilterFileBrowserModel;

  private readonly baseFilter: (m: any) => boolean;
  private readonly extFilter: (m: any) => boolean;
  private showAll = false;

  /**
   * Helper function to convert a boolean predicate to a score function that the FileBrowserModel accepts
   */
  private static boolToScore =
    (pred: (m: any) => boolean) =>
      (m: any): Partial<any> | null => (pred(m) ? {} : null);

  constructor(props: any) {
    super(props);
    /* filter definitions */
    this.baseFilter = props.filter || (() => true);

    // The extFilter checks file extensions
    this.extFilter =
      props.extensions && props.extensions.length
        ? (m: any): boolean => {
          if (m.type === 'directory') return true; // Always show directories
          const ext = `.${m.name.split('.').pop().toLowerCase()}`;
          return props.extensions.includes(ext);
        }
        : (() => true); // If no extensions are provided, show everything

    // Initialize the model with the extension filter
    this.model = new FilterFileBrowserModel({
      manager: props.manager,
      filter: BrowseFileDialog.boolToScore((m: any) => {
        // Apply base filter first (user-provided filter)
        if (!this.baseFilter(m)) return false;

        // Then apply extension filter if not showing all
        if (!this.showAll && m.type !== 'directory') {
          const ext = `.${m.name.split('.').pop().toLowerCase()}`;
          return props.extensions && props.extensions.length ?
            props.extensions.includes(ext) : true;
        }

        return true;
      })
    });

    const layout = (this.layout = new PanelLayout());

    /* breadcrumbs */
    this.breadCrumbs = new BrowseFileDialogBreadcrumbs({
      model: this.model,
      rootPath: props.rootPath
    });
    layout.addWidget(this.breadCrumbs);

    /* toggle switch + label */
    if (props.extensions && props.extensions.length) {
      const container = document.createElement('div');

      // Create a render function that can be called to update the UI
      const renderSwitchUI = (showAllFiles: boolean) => {
        ReactDOM.render(
          <div style={{ marginBottom: '10px' }}>
            <ConfigProvider
              theme={{
                token: {
                  // Seed Token
                  colorPrimary: '#5F9B97',
                },
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ flexShrink: 0 }}>
                  <Switch
                    checked={showAllFiles}
                    size="small"
                    style={{ 
                      width: '28px',
                      minWidth: '28px', 
                      height: '16px',
                      lineHeight: '16px'
                    }}
                    onChange={(checked: boolean) => {
                      this.showAll = checked;
                      // Update the filter based on the switch state
                      this.model.setFilter(
                        BrowseFileDialog.boolToScore((m: any) => {
                          // Always apply base filter
                          if (!this.baseFilter(m)) return false;

                          // Apply extension filter only when showAll is false and it's a file
                          if (!checked && m.type !== 'directory') {
                            const ext = `.${m.name.split('.').pop().toLowerCase()}`;
                            return props.extensions && props.extensions.length ?
                              props.extensions.includes(ext) : true;
                          }

                          return true;
                        })
                      );

                      // Re-render with the new state
                      renderSwitchUI(checked);
                      
                      void this.model.refresh();
                    }}
                  />
                </span>
                <span style={{ fontSize: '14px' }}>
                  {showAllFiles ? "Show all files" : "Only show relevant files"}
                </span>
              </div>
            </ConfigProvider>
          </div>,
          container
        );
      };
      
      // Initial render
      renderSwitchUI(this.showAll);
      this.switchWidget = new Widget({ node: container });
      layout.insertWidget(1, this.switchWidget); // directly under breadcrumbs
    }

    /* directory listing */
    this.directoryListing = new DirListing({ model: this.model });
    this.acceptFileOnDblClick = props.acceptFileOnDblClick ?? true;
    this.multiselect = !!props.multiselect;
    this.includeDir = !!props.includeDir;
    this.dirListingHandleEvent = this.directoryListing.handleEvent;
    this.directoryListing.handleEvent = (e: Event): void => { this.handleEvent(e); };

    layout.addWidget(this.directoryListing);
  }

  /* factory */
  static async init(options: any): Promise<BrowseFileDialog> {
    const dlg = new BrowseFileDialog({
      manager: options.manager,
      extensions: options.extensions,
      filter: options.filter || (() => true),
      multiselect: options.multiselect,
      includeDir: options.includeDir,
      rootPath: options.rootPath,
      startPath: options.startPath,
      acceptFileOnDblClick: options.acceptFileOnDblClick
    });

    if (options.startPath) {
      if (!options.rootPath || options.startPath.indexOf(options.rootPath) === 0) {
        await dlg.model.cd(options.startPath);
      }
    } else if (options.rootPath) {
      await dlg.model.cd(options.rootPath);
    }
    return dlg;
  }

  /* result */
  getValue(): any {
    const selected: any[] = [];
    for (const item of this.directoryListing.selectedItems()) {
      if (this.includeDir || item.type !== 'directory') selected.push(item);
    }
    return selected;
  }

  /* event proxy */
  handleEvent(event: Event): void {
    let modifierKey = false;
    if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
      modifierKey = (event as any).shiftKey || (event as any).metaKey;
    }

    switch (event.type) {
      case 'keydown':
      case 'keyup':
      case 'mousedown':
      case 'mouseup':
      case 'click':
        if (this.multiselect || !modifierKey) {
          this.dirListingHandleEvent.call(this.directoryListing, event);
        }
        break;

      case 'dblclick': {
        const clicked = this.directoryListing.modelForClick(event as MouseEvent);
        if (clicked?.type === 'directory') {
          this.dirListingHandleEvent.call(this.directoryListing, event);
        } else {
          event.preventDefault();
          event.stopPropagation();
          if (this.acceptFileOnDblClick) {
            (document.querySelector(
              `.${BROWSE_FILE_OPEN_CLASS} .jp-mod-accept`
            ) as HTMLButtonElement)?.click();
          }
        }
        break;
      }

      default:
        this.dirListingHandleEvent.call(this.directoryListing, event);
        break;
    }
  }
}

/* ───────────────────────── helper ───────────────────────────── */
export const showBrowseFileDialog = async (
  manager: IDocumentManager,
  options: IBrowseFileDialogOptions
): Promise<Dialog.IResult<any>> => {
  const body = await BrowseFileDialog.init({
    manager,
    extensions: options.extensions,
    filter: options.filter,
    multiselect: options.multiselect,
    includeDir: options.includeDir,
    rootPath: options.rootPath,
    startPath: options.startPath,
    acceptFileOnDblClick: Object.prototype.hasOwnProperty.call(options, 'acceptFileOnDblClick')
      ? options.acceptFileOnDblClick
      : true
  });

  const dialog = new Dialog({
    title: 'Select a file',
    body,
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Select' })]
  });

  dialog.addClass(BROWSE_FILE_CLASS);
  document.body.className += ` ${BROWSE_FILE_OPEN_CLASS}`;

  return dialog.launch().then(result => {
    document.body.className = document.body.className
      .replace(BROWSE_FILE_OPEN_CLASS, '')
      .trim();

    if (options.rootPath && result.button.accept && result.value.length) {
      const root = options.rootPath.endsWith('/') ? options.rootPath : `${options.rootPath}/`;
      result.value.forEach((v: any) => { v.path = v.path.replace(root, ''); });
    }
    return result;
  });
};