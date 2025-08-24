import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { LabIcon } from '@jupyterlab/ui-components';
import { Token } from '@lumino/coreutils';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

export { setDefaultConfig, onChange, GenerateUIFormComponent, FieldDescriptor, Option } from './configUtils';
export { renderComponentUI, renderHandle, createZoomSelector } from './rendererUtils'
export { PipelineComponent } from './PipelineComponent'
export { CodeGenerator } from './CodeGenerator'
export { CodeGeneratorDagster } from './CodeGeneratorDagster'
export { PipelineService } from './PipelineService'
export { RequestService } from './RequestService'

export { InputFile, InputRegular, SelectRegular, SelectColumns, CodeTextarea, CodeTextareaMirror } from './forms'

interface ComponentItem {
  _id: string;
  _name: string;
  _type: string;
  _icon: LabIcon;
  _default: object;
  _form: object;
}

interface Components {
  getComponents(): any;
  getComponent(type: string): ComponentItem;
  addComponent(newComponent: ComponentItem): any;
  removeComponent(id: string): void;
}

const ComponentManager = new Token<Components>(
  '@amphi/pipeline-components-manager:provider');

class ComponentService implements Components {

  _components: ComponentItem[] = [];

  constructor() {
    this._components = [];
  }

  getComponents() {
    return this._components;
  };

  getComponent(id: string): ComponentItem | undefined {
    return this._components.find(component => component._id === id);
  };

  addComponent(newComponent: ComponentItem) {
    this._components.push(newComponent)
  };

  // Method to get the number of components
  getComponentCount(): number {
    return this._components.length;
  }

  removeComponent(id: string): void {
    this._components = this._components.filter(component => component._id !== id);
  }
}

const managerPlugin: JupyterFrontEndPlugin<Components> = {
  id: '@amphi/pipeline-components-manager:plugin',
  description: 'Provider plugin for the pipeline editor\'s "component" service object.',
  autoStart: true,
  provides: ComponentManager,
  activate: () => {
    console.log('JupyterLab extension (@amphi/pipeline-components-manager/provider plugin) is activated!');
    const componentService = new ComponentService();
    return componentService;
  }
};

const addComponentPlugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-manager:add-component',
  autoStart: true,
  requires: [ComponentManager, IFileBrowserFactory, ICommandPalette],
  activate: async (
    app: JupyterFrontEnd,
    componentService: Components,
    browserFactory: IFileBrowserFactory,
    palette: ICommandPalette
  ) => {
    console.log('JupyterLab extension (@amphi/pipeline-components-manager/add-component) is activated!');

    const command = '@amphi/pipeline-components-manager:add-component';

    app.commands.addCommand(command, {
      label: 'Add Component',
      caption: 'Register this file as an Amphi component',
      execute: async () => {
        const browser = browserFactory.defaultBrowser;
        const item = browser.selectedItems().next();
        if (!item) {
          return;
        }

        const model = await app.serviceManager.contents.get(item.path, {
          content: true
        });

        const source = (model as any).content as string;

        // Dynamically transpile the TypeScript source to JavaScript.
        const ts = await import('typescript');
        const transpiled = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.ES2020, esModuleInterop: true }
        });

        const blob = new Blob([transpiled.outputText], {
          type: 'text/javascript'
        });
        const url = URL.createObjectURL(blob);

        try {
          const mod: any = await import(/* webpackIgnore: true */ url);
          const component = mod.default ?? mod.Component ?? mod;
          if (component && typeof component.getInstance === 'function') {
            componentService.addComponent(component.getInstance());
          } else if (component) {
            componentService.addComponent(component);
          }
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    });

    app.contextMenu.addItem({
      command,
      selector: '.jp-DirListing-item[data-file-type="typescript"]',
      rank: 100
    });
    palette.addItem({ command, category: 'Amphi' });
  }
};

export { ComponentItem, Components, ComponentManager };
const plugins: JupyterFrontEndPlugin<any>[] = [managerPlugin, addComponentPlugin];
export default plugins;