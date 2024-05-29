import { LabIcon } from '@jupyterlab/ui-components';

import fileTextIconSvgStr from '../style/icons/file-text-24.svg';
import filePlusIconSvgStr from '../style/icons/file-plus-24.svg';
import monitorIconSvgStr from '../style/icons/monitor-24.svg';
import apiIconSvgStr from '../style/icons/api-24.svg';
import pipelineCategoryIconSvgStr from '../style/icons/pipeline-brand-24.svg';
import pipelineBrandIconSvgStr from '../style/icons/pipeline-brand-16.svg';


export const fileTextIcon = new LabIcon({
  name: 'amphi:file-text-icon',
  svgstr: fileTextIconSvgStr
});

export const filePlusIcon = new LabIcon({
  name: 'amphi:file-plus-icon',
  svgstr: filePlusIconSvgStr
});

export const monitorIcon = new LabIcon({
  name: 'amphi:monitor-icon',
  svgstr: monitorIconSvgStr
});

export const apiIcon = new LabIcon({
  name: 'amphi:api-icon',
  svgstr: apiIconSvgStr
});

export const pipelineIcon = new LabIcon({
  name: 'amphi:pipeline-icon',
  svgstr: pipelineBrandIconSvgStr
});

export const pipelineBrandIcon = new LabIcon({
  name: 'amphi:pipelinenegative-icon',
  svgstr: pipelineBrandIconSvgStr
});

export const pipelineCategoryIcon = new LabIcon({
  name: 'amphi:pipelineCategory-icon',
  svgstr: pipelineCategoryIconSvgStr
});



