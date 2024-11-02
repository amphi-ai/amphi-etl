import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ComponentManager } from "@amphi/pipeline-components-manager";
import {
   SQLQuery, OpenAILookUp, OllamaLookUp
} from './components';

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-local',
  description: 'Adds a step counter/button (1 of 3 related examples). This extension holds the UI/interface',
  autoStart: true,
  requires: [ComponentManager],

  activate: (app: JupyterFrontEnd, componentService: any) => {
    console.log('JupyterLab extension pipeline-components-local is activated!');

    // Processors

    componentService.addComponent(SQLQuery.getInstance());
    componentService.addComponent(OpenAILookUp.getInstance());
    componentService.addComponent(OllamaLookUp.getInstance());


  }
};

export default plugin;