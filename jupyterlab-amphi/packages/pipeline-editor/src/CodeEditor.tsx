import React, { useState } from 'react';
import { CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";

interface CodeEditorProps {
  code: string;
}

const handleAceLoad = (editor: any) => {
  const stop = (e: KeyboardEvent) => e.stopPropagation();
  const el = editor.container as HTMLElement;

  // Use capture so we intercept before parents
  el.addEventListener('keydown', stop, true);
  el.addEventListener('keypress', stop, true);
  el.addEventListener('keyup', stop, true);

  // Clean up when the editor is destroyed
  editor.on('destroy', () => {
    el.removeEventListener('keydown', stop, true);
    el.removeEventListener('keypress', stop, true);
    el.removeEventListener('keyup', stop, true);
  });
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code }) => (
  <AceEditor
    width='100%%'
    height='100%'
    mode="python"
    theme="xcode"
    name="Code Export"
    fontSize={14}
    lineHeight={19}
    showPrintMargin={true}
    showGutter={true}
    highlightActiveLine={true}
    onLoad={handleAceLoad}
    value={code}
    setOptions={{
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showLineNumbers: true,
      tabSize: 2,
    }}
  />
);

export default CodeEditor;