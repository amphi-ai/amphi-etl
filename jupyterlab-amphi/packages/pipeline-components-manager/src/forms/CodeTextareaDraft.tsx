import React, { useState, useEffect, useRef } from 'react';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { FieldDescriptor } from '../configUtils';

interface CodeTextareaDraftProps {
  field: FieldDescriptor;
  value: string;
  handleChange: (value: string, id: string) => void;
  advanced: boolean;
}

export const CodeTextareaDraft: React.FC<CodeTextareaDraftProps> = ({
  field,
  value,
  handleChange,
  advanced,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<CodeEditor.IEditor | null>(null);

  // Initialize editor only once
  useEffect(() => {

    if (editorRef.current && !editorInstanceRef.current) {
      const model = new CodeEditor.Model();
      const options: CodeEditor.IOptions = {
        host: editorRef.current,
        model,
        config: {
          lineHeight: 4,
        },
      };

      const codeEditor = new CodeMirrorEditor(options);
      editorInstanceRef.current = codeEditor;

      // Handle changes from the editor
      codeEditor.model.sharedModel.changed.connect(() => {
        const newValue = codeEditor.model.sharedModel.getSource();
        handleChange(newValue, field.id);
      });

    }
  }, [value]);


  return (
    <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
  );
};

export default CodeTextareaDraft;
