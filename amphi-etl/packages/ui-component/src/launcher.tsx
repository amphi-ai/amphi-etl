import {
  ILauncher,
  Launcher as JupyterlabLauncher,
  LauncherModel as JupyterLauncherModel
} from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { githubIcon, pipelineIcon, slackIcon, alertDiamondIcon } from './icons';

import { each } from '@lumino/algorithm';

import React, { useEffect, useState } from 'react';

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
    if (!this.model) {
      return null;
    }

    const launcherBody = super.render();
    const launcherContent = launcherBody?.props.children;
    const launcherCategories = launcherContent.props.children;

    const categories: React.ReactElement<any>[] = [];

    const knownCategories = [
      AMPHI_CATEGORY,
      // this._translator.__('Console'),
      // this._translator.__('Other'),
      // this._translator.__('Notebook')
    ];

    each(knownCategories, (category, index) => {
      React.Children.forEach(launcherCategories, (cat) => {
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

    const AlertBox = () => {
      const [isVisible, setIsVisible] = useState(false);

      useEffect(() => {
        const alertClosed = localStorage.getItem('alertClosed') === 'true';
        setIsVisible(!alertClosed);
      }, []);

      const closeAlert = () => {
        setIsVisible(false);
        localStorage.setItem('alertClosed', 'true');
      };

      if (!isVisible) return null;

      return (
        <div className="alert-box">
          <div className="alert-content">
            <span className="alert-icon">
              <alertDiamondIcon.react />
            </span>

            <div className="alert-text">
              <h2>About</h2>
              <p>
                Welcome to Amphi's demo playground! Explore Amphi ETL's capabilities and user experience here. <br />
                Note that <b>executing pipelines is not supported in this environment.</b> For full functionality, install Amphi — it's free and open source.{' '}
                <a href="https://github.com/amphi-ai/amphi-etl" target="_blank">
                  Learn more.
                </a>
              </p>
            </div>

            <button onClick={closeAlert} className="alert-close-btn">
              <span className="sr-only">Dismiss popup</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="launcher-body">
        <div className="launcher-content">
          <h1 className="launcher-title">Amphi</h1>

          <div className="launcher-grid">
            <div className="launcher-card">
              <div className="launcher-card-header">
                <h3>Start</h3>
              </div>

              <ul className="launcher-card-list">
                <li>
                  <a href="#" onClick={handleNewPipelineClick} className="launcher-card-item">
                    <div className="launcher-icon">
                      <pipelineIcon.react fill="#5A8F7B" />
                    </div>
                    <div>
                      <strong>New pipeline</strong>
                      <p>Open a new untitled pipeline and drag and drop components to design and develop your data flow.</p>
                    </div>
                  </a>
                </li>
              </ul>
            </div>

            <div className="launcher-card">
              <div className="launcher-card-header">
                <h3>Resources</h3>
              </div>

              <ul className="launcher-card-list">
                <li>
                  <a href="https://github.com/amphi-ai/amphi-etl" target="_blank" className="launcher-card-item">
                    <div className="launcher-icon">
                      <githubIcon.react />
                    </div>
                    <div>
                      <strong>Issues and feature requests</strong>
                      <p>Report issues and suggest features on GitHub. Don't hesitate to star the repository to watch the repository.</p>
                    </div>
                  </a>
                </li>
                  <li>
                    <a href="https://join.slack.com/t/amphi-ai/shared_invite/zt-2ci2ptvoy-FENw8AW4ISDXUmz8wcd3bw" target="_blank" className="launcher-card-item">
                      <div className="launcher-icon">
                        <slackIcon.react />
                      </div>
                      <div>
                        <strong>Join the Community</strong>
                        <p>Join Amphi's community on Slack: seek help, ask questions and share your experience.</p>
                      </div>
                    </a>
                  </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }


}

