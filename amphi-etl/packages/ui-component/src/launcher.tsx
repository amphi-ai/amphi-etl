import {
  Launcher as JupyterlabLauncher,
  LauncherModel as JupyterLauncherModel,
  ILauncher
} from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import amphiSvg from '../style/icons/amphi-square-logo.svg';
import { homeIcon, fileUploadIcon  } from '@jupyterlab/ui-components';
import { pipelineIcon, shieldCheckedIcon, codeIcon, docsIcon, uploadIcon, networkIcon, bugIcon } from './icons';
import { CommandRegistry } from '@lumino/commands';

import { each } from '@lumino/algorithm';

import React, { useState, useEffect } from 'react';

// Largely inspired by Elyra launcher https://github.com/elyra-ai/elyra

/**
 * The known categories of launcher items and their default ordering.
 */
const AMPHI_CATEGORY = 'Data Integration';

const CommandIDs = {
  newPipeline: 'pipeline-editor:create-new',
  newFile: 'fileeditor:create-new',
  createNewPythonEditor: 'script-editor:create-new-python-editor',
  createNewREditor: 'script-editor:create-new-r-editor'
};

// LauncherModel deals with the underlying data and logic of the launcher (what items are available, their order, etc.).
export class LauncherModel extends JupyterLauncherModel {
  /**
   * Return an iterator of launcher items, but remove unnecessary items.
   */
  items(): IterableIterator<ILauncher.IItemOptions> {
    const items: ILauncher.IItemOptions[] = [];

    let pyEditorInstalled = false;
    let rEditorInstalled = false;

    this.itemsList.forEach(item => {
      if (item.command === CommandIDs.createNewPythonEditor) {
        pyEditorInstalled = true;
      } else if (item.command === CommandIDs.createNewREditor) {
        rEditorInstalled = true;
      }
    });

    if (!pyEditorInstalled && !rEditorInstalled) {
      return this.itemsList[Symbol.iterator]();
    }

    // Dont add tiles for new py and r files if their script editor is installed
    this.itemsList.forEach(item => {
      if (
        !(
          item.command === CommandIDs.newFile &&
          ((pyEditorInstalled && item.args?.fileExt === 'py') ||
            (rEditorInstalled && item.args?.fileExt === 'r'))
        )
      ) {
        items.push(item);
      }
    });

    return items[Symbol.iterator]();
  }
}

// Launcher deals with the visual representation and user interactions of the launcher
// (how items are displayed, icons, categories, etc.).
export class Launcher extends JupyterlabLauncher {

  private myCommands: CommandRegistry;
  /**
   * Construct a new launcher widget.
   */
  constructor(options: ILauncher.IOptions, commands: any) {
    super(options);
    this.myCommands = commands;
    // this._translator = this.translator.load('jupyterlab');
  }

  /**
  The replaceCategoryIcon function takes a category element and a new icon. 
  It then goes through the children of the category to find the section header. 
  Within the section header, it identifies the icon (by checking if it's not the section title)
  and replaces it with the new icon. The function then returns a cloned version of the original
  category with the icon replaced.
   */
  private replaceCategoryIcon(
    category: React.ReactElement,
    icon: LabIcon
  ): React.ReactElement {
    const children = React.Children.map(category.props.children, child => {
      if (child.props.className === 'jp-Launcher-sectionHeader') {
        const grandchildren = React.Children.map(
          child.props.children,
          grandchild => {
            if (grandchild.props.className !== 'jp-Launcher-sectionTitle') {
              return <icon.react stylesheet="launcherSection" />;
            } else {
              return grandchild;
            }
          }
        );

        return React.cloneElement(child, child.props, grandchildren);
      } else {
        return child;
      }
    });

    return React.cloneElement(category, category.props, children);
  }

  /**
   * Render the launcher to virtual DOM nodes.
   */
  protected render(): React.ReactElement<any> | null {
    // Bail if there is no model.
    if (!this.model) {
      return null;
    }

    // get the rendering from JupyterLab Launcher
    // and resort the categories
    const launcherBody = super.render();
    const launcherContent = launcherBody?.props.children;
    const launcherCategories = launcherContent.props.children;

    const categories: React.ReactElement<any>[] = [];

    const knownCategories = [
      AMPHI_CATEGORY,
      //this._translator.__('Console'),
      // this._translator.__('Other'),
      //this._translator.__('Notebook')
    ];

    // Assemble the final ordered list of categories
    // based on knownCategories.
    each(knownCategories, (category, index) => {
      React.Children.forEach(launcherCategories, cat => {
        if (cat.key === category) {
          if (cat.key === AMPHI_CATEGORY) {
            cat = this.replaceCategoryIcon(cat, pipelineIcon);
          }
          categories.push(cat);
        }
      });
    });

    const handleNewPipelineClick = () => {
      this.myCommands.execute('pipeline-editor:create-new');
    };

    const handleUploadFiles = () => {
      this.myCommands.execute('ui-components:file-upload');
    };

    // Wrap the sections in body and content divs.
    return (
    <div className="jp-Launcher-body">
      <div className="jp-Launcher-content">

      <h1 className="mt-8 text-2xl font-bold text-gray-900 sm:text-3xl flex items-center">
        Amphi ETL 
      </h1>
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
            <div className="rounded-lg">
              <h1 className="text-xl font-bold text-gray-900 sm:text-3xl">Start</h1>
              <ul className="mt-4">
              <li>
                <span
                  onClick={handleNewPipelineClick}
                  className="flex items-center gap-2 border-s-[3px] border-transparent px-4 py-3 text-primary hover:border-gray-100 hover:bg-gray-50 hover:text-grey-700 cursor-pointer">
                  <pipelineIcon.react />
                  <span className="text-sm font-medium">New pipeline</span>
                </span>
              </li>
                <li>
                  <a 
                    href="https://docs.amphi.ai/category/getting-started"
                    className="flex items-center gap-2 border-s-[3px] border-transparent px-4 py-3 text-grey-500 hover:border-gray-100 hover:bg-gray-50 hover:text-grey-700 cursor-pointer">
                    <docsIcon.react />
                    <span className="text-sm font-medium">Getting started
                    </span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://join.slack.com/t/amphi-ai/shared_invite/zt-2ci2ptvoy-FENw8AW4ISDXUmz8wcd3bw"
                    className="flex items-center gap-2 border-s-[3px] border-transparent px-4 py-3 text-grey-500 hover:border-gray-100 hover:bg-gray-50 hover:text-grey-700 cursor-pointer">
                    <bugIcon.react />
                    <span className="text-sm font-medium">Join the community
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-sm lg:col-span-2">
              <h1 className="text-xl font-bold text-gray-900 sm:text-3xl">Fundamentals</h1>

              <div role="alert" className="mt-4 rounded-sm mt-3 border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-4">
                  <span className="text-grey-600">
                    <codeIcon.react/>
                  </span>
                  <div className="flex-1">
                    <h2 className="block font-bold text-black-900">Python generation</h2>
                    <p className="mt-1 text-sm text-gray-700">Develop data pipelines and generate native Python code you own. Run the pipelines anywhere you'd like.</p>
                  </div>
                </div>
              </div>

              <div role="alert" className="mt-4 rounded-xl mt-3 border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-4">
                  <span className="text-grey-600">
                    <shieldCheckedIcon.react/>
                  </span>
                  <div className="flex-1">
                    <h2 className="block font-bold text-black-900">Open-source and private</h2>
                    <p className="mt-1 text-sm text-gray-700">
                      Amphi ETL is open-source and is self-hosted. All data is stored locally, and isn't sent to or stored on Amphi's servers. 
                      <a href="https://docs.amphi.ai/getting-started/core-concepts#file-browser" target="_blank" rel="noopener noreferrer">Learn more</a>
                    </p>                 
                  </div>
                </div>
              </div>

              <div role="alert" className="mt-4 rounded-sm mt-3 border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-4">
                  <span className="text-grey-600">
                    <networkIcon.react/>
                  </span>
                  <div className="flex-1">
                    <h2 className="block font-bold text-black-900">Community-driven & extensible</h2>
                    <p className="mt-1 text-sm text-gray-700">Pipelines can be shared as files with anyone. Coming soon the platform will be extensible with shareable connectors and components.</p>
                  </div>
                </div>
              </div>

            </div>
            
          </div>
        </div>
      </div>
    );
  }

}

