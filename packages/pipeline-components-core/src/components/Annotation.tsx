import React, { useCallback } from 'react';
import { useReactFlow, useStore, useStoreApi } from 'reactflow';

import { ComponentItem, PipelineComponent } from '@amphi/pipeline-components-manager';
import { annotationIcon } from '../icons';

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

    const zoomSelector = (s) => s.transform[2] >= 1;
    const showContent = useStore(zoomSelector);

    return (
      <>
        <div className="mt-[5px] border-0 bg-white mx-auto box-border w-full">
          <Annotation.ConfigForm nodeId={id} data={data} context={context} manager={manager} />
        </div>
      </>
    );
  }
}
