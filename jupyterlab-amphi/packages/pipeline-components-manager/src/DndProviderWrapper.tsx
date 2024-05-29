// DndProviderWrapper.tsx
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const DndProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = useRef(null);
  const [dndArea, setDnDArea] = useState(context.current);

  const updateDndArea = useCallback(() => {
    setDnDArea(context?.current);
  }, []);

  useEffect(() => {
    updateDndArea();
  }, [updateDndArea]);

  const html5Options = useMemo(() => ({ rootElement: dndArea }), [dndArea]);

  return (
    <div ref={context}>
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          {children}
        </DndProvider>
      )}
    </div>
  );
};

export default DndProviderWrapper;

