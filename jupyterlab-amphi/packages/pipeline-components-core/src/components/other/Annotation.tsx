import React, { useCallback } from 'react';
import { useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent, createZoomSelector } from '@amphi/pipeline-components-manager';
import { annotationIcon } from '../../icons';

export class Annotation extends PipelineComponent<ComponentItem>() {

  public _name = "Annotation";
  public _id = "annotation";
  public _type = "annotation";
  public _icon = annotationIcon;
  public _category = "other";

  public static ConfigForm = ({ nodeId, data, context, manager }) => {
    const { setNodes } = useReactFlow();
    const store = useStoreApi();

    const onChange = useCallback((evt, field) => {
      const newValue = evt.target.value;
      const { nodeInternals } = store.getState();
      setNodes(
        Array.from(nodeInternals.values()).map((node) => {
          if (node.id === nodeId) {
            node.data = {
              ...node.data,
              [field]: newValue
            };
          }
          return node;
        })
      );
    }, []);

    return (
      <textarea id="text" name="text" onChange={(e) => onChange(e, 'text')} value={data.text} className="nodrag mt-[5px] border-0 bg-white block w-full box-border" ></textarea>
    );
  }

  public UIComponent({ id, data, context, manager }) {

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

    return (
      <>
        <div className="mt-[5px] border-0 bg-white mx-auto box-border w-full">
          <Annotation.ConfigForm nodeId={id} data={data} context={context} manager={manager} />
        </div>
      </>
    );
  }
}
