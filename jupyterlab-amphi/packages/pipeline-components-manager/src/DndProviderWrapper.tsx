// DndProviderWrapper.tsx
import React, { useRef, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const DndProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure the ref is attached before initializing DndProvider
    if (containerRef.current) {
      setIsReady(true);
    }
  }, []);

  return (
    <div ref={containerRef}>
      {isReady && containerRef.current && (
        <DndProvider backend={HTML5Backend} options={{ rootElement: containerRef.current }}>
          {children}
        </DndProvider>
      )}
    </div>
  );
};

export default DndProviderWrapper;
