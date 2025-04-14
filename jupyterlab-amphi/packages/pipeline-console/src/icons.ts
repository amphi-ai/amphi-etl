import { LabIcon } from '@jupyterlab/ui-components';
import clockIconSvgStr from '../style/icons/clock-16.svg';
import gridIconSvgStr from '../style/icons/grid-16.svg';
import cpuIconSvgStr from '../style/icons/cpu-16.svg';
import pipelineIconSvgStr from '../style/icons/pipeline-16.svg';

import dateTimeIconSvgStr from '../style/icons/calendar-time.svg';
import numberIconSvgStr from '../style/icons/number-123.svg';
import decimalIconSvgStr from '../style/icons/decimal.svg';
import stringIconSvgStr from '../style/icons/abc.svg';

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

export const dateTimeIcon = new LabIcon({
  name: 'amphi:date-time-icon',
  svgstr: dateTimeIconSvgStr
});

export const numberIcon = new LabIcon({
  name: 'amphi:number-icon',
  svgstr: numberIconSvgStr
});

export const decimalIcon = new LabIcon({
  name: 'amphi:decimal-icon',
  svgstr: decimalIconSvgStr
});

export const stringIcon = new LabIcon({
  name: 'amphi:string-icon',
  svgstr: stringIconSvgStr
});
