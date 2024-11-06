import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { folderIcon, saveIcon, runIcon, newFolderIcon, fileUploadIcon, filterIcon, refreshIcon, codeIcon, fileIcon, pdfIcon, spreadsheetIcon, jsonIcon, notebookIcon, listIcon, homeIcon } from '@jupyterlab/ui-components';
import { folderAmphiIcon, searchAmphiIcon, saveAmphiIcon, playAmphiIcon, folderPlusAmphiIcon, uploadAmphiIcon, reloadAmphiIcon, fileSourceAmphiIcon, fileAmphiIcon, filePdfAmphiIcon, fileCsvAmphiIcon, fileJsonAmphiIcon, fileNotebookIcon, terminalIcon, homeAmphiIcon, fileParquetAmphiIcon, fileExcelAmphiIcon } from './icons'
import { IThemeManager } from '@jupyterlab/apputils';

/**
 * Initialization data for the @amphi/theme-light extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: '@amphi/theme-light',
  requires: [IThemeManager],
  autoStart: true,
  activate: (app: JupyterFrontEnd, manager: IThemeManager) => {
    const style = '@amphi/theme-light/index.css';

    manager.register({
      name: 'Amphi Light',
      isLight: true,
      themeScrollbars: false,
      load: () => manager.loadCSS(style),
      unload: () => Promise.resolve(undefined)
    });

    app.docRegistry.addFileType(
      {
        name: 'parquet',
        displayName: 'parquet',
        extensions: ['.parquet'],
        icon: fileParquetAmphiIcon,
        fileFormat: "base64",
      }
    );

    app.docRegistry.addFileType(
      {
        name: 'excel',
        displayName: 'Excel',
        extensions: ['.xlsx', 'xls'],
        icon: fileExcelAmphiIcon,
        fileFormat: "base64",
      }
    );

    folderIcon.svgstr = folderAmphiIcon.svgstr;
    saveIcon.svgstr = saveAmphiIcon.svgstr;
    runIcon.svgstr = playAmphiIcon.svgstr
    newFolderIcon.svgstr = folderPlusAmphiIcon.svgstr;
    fileUploadIcon.svgstr = uploadAmphiIcon.svgstr;
    refreshIcon.svgstr = reloadAmphiIcon.svgstr;
    codeIcon.svgstr = fileSourceAmphiIcon.svgstr;
    fileIcon.svgstr = fileAmphiIcon.svgstr;
    pdfIcon.svgstr = filePdfAmphiIcon.svgstr;
    spreadsheetIcon.svgstr = fileCsvAmphiIcon.svgstr;
    jsonIcon.svgstr = fileJsonAmphiIcon.svgstr;
    notebookIcon.svgstr = fileNotebookIcon.svgstr;
    listIcon.svgstr = terminalIcon.svgstr;
    homeIcon.svgstr = homeAmphiIcon.svgstr;
    filterIcon.svgstr = searchAmphiIcon.svgstr;

  }
};

export default extension;
