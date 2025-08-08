import { LabIcon } from '@jupyterlab/ui-components';

import databaseIconSvgStr from '../style/icons/database-24.svg';
import schemaIconSvgStr from '../style/icons/layout-24.svg';

import tableIconSvgStr from '../style/icons/hard-drive-24.svg';
import schedulerIconSvgStr from '../style/icons/scheduler.svg';


export const databaseIcon = new LabIcon({
  name: 'amphi:database-browser-Icon',
  svgstr: databaseIconSvgStr
});

export const schemaIcon = new LabIcon({
  name: 'amphi:schema-Icon',
  svgstr: schemaIconSvgStr
});

export const tableIcon = new LabIcon({
  name: 'amphi:table-browser-icon',
  svgstr: tableIconSvgStr
});

export const schedulerIcon = new LabIcon({
  name: 'amphi:scheduler-icon',
  svgstr: schedulerIconSvgStr
});

