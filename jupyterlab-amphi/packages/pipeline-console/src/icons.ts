import { LabIcon } from '@jupyterlab/ui-components';
import clockIconSvgStr from '../style/icons/clock-16.svg';
import gridIconSvgStr from '../style/icons/grid-16.svg';
import cpuIconSvgStr from '../style/icons/cpu-16.svg';
import pipelineIconSvgStr from '../style/icons/pipeline-16.svg';



export const clockIcon = new LabIcon({
  name: 'amphi:clock-icon',
  svgstr: clockIconSvgStr
});

export const pipelineIcon = new LabIcon({
  name: 'amphi:pipeline-console-icon',
  svgstr: pipelineIconSvgStr
});

export const gridIcon = new LabIcon({
  name: 'amphi:grid-console-icon',
  svgstr: gridIconSvgStr
});

export const cpuIcon = new LabIcon({
  name: 'amphi:cpu-icon',
  svgstr: cpuIconSvgStr
});


