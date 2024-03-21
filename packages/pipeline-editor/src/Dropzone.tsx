import { Drag } from '@lumino/dragdrop';
import React, { useCallback, useEffect, useRef } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface HTMLElementEventMap {
    'lm-dragenter': Drag.Event;
    'lm-dragleave': Drag.Event;
    'lm-dragover': Drag.Event;
    'lm-drop': Drag.Event;
  }
}

interface IRootProps {
  ref: React.RefObject<HTMLDivElement>;
}

interface IProps {
  onDragEnter?: (e: Drag.Event) => any;
  onDragLeave?: (e: Drag.Event) => any;
  onDragOver?: (e: Drag.Event) => any;
  onDrop?: (e: Drag.Event) => any;
  children?: React.ReactNode; // Add this line
}

interface IReturn {
  getRootProps: () => IRootProps;
}

export const useDropzone = (props: IProps): IReturn => {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleEvent = useCallback(
    (e: Drag.Event): void => {
      e.preventDefault();
      e.stopPropagation();
      switch (e.type) {
        case 'lm-dragenter':
          props.onDragEnter?.(e);
          break;
        case 'lm-dragleave':
          props.onDragLeave?.(e);
          break;
        case 'lm-dragover':
          e.dropAction = e.proposedAction;
          props.onDragOver?.(e);
          break;
        case 'lm-drop':
          props.onDrop?.(e);
          break;
      }
    },
    [props],
  );

  useEffect(() => {
    const node = rootRef.current;
    node?.addEventListener('lm-dragenter', handleEvent);
    node?.addEventListener('lm-dragleave', handleEvent);
    node?.addEventListener('lm-dragover', handleEvent);
    node?.addEventListener('lm-drop', handleEvent);

    return (): void => {
      node?.removeEventListener('lm-dragenter', handleEvent);
      node?.removeEventListener('lm-dragleave', handleEvent);
      node?.removeEventListener('lm-dragover', handleEvent);
      node?.removeEventListener('lm-drop', handleEvent);
    };
  }, [handleEvent]);

  return {
    getRootProps: (): IRootProps => ({
      ref: rootRef,
    }),
  };
};

export const Dropzone: React.FC<IProps> = ({ children, ...rest }) => {
  const { getRootProps } = useDropzone(rest);

  return (
    <div style={{ height: '100%' }} {...getRootProps()}>
      {children}
    </div>
  );
};