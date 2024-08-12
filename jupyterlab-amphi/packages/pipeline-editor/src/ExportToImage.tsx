import React from 'react';
import { Panel, useReactFlow, getRectOfNodes, getNodesBounds, getViewportForBounds, ControlButton } from 'reactflow';
import { toSvg } from 'html-to-image';
import { exportIcon } from './icons';

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function downloadImage(dataUrl: string, pipelineName: string) {
  const sanitizedFilename = sanitizeFilename(pipelineName);
  const a = document.createElement('a');

  a.setAttribute('download', `${sanitizedFilename}.svg`);
  a.setAttribute('href', dataUrl);
  a.click();
}

function DownloadImageButton({ pipelineName, pipelineId }: { pipelineName: string, pipelineId: string }) {
  const { getNodes } = useReactFlow();
  const onClick = () => {
    const nodesBounds = getNodesBounds(getNodes());
    const viewportElement = document.querySelector(`.reactflow-wrapper[data-id="${pipelineId}"]`);
    if (viewportElement instanceof HTMLElement) {
      const { width, height } = viewportElement.getBoundingClientRect();
      // const transform = getTransformForBounds(nodesBounds, width, height, 0.5, 2);

      toSvg(viewportElement, {
        backgroundColor: '#ffffff',
        width: width,
        height: height
      }).then((dataUrl) => downloadImage(dataUrl, pipelineName));
    }
  };

  return <ControlButton onClick={onClick}>
    <exportIcon.react />
  </ControlButton>
}

export default DownloadImageButton;