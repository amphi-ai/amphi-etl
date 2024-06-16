import React, { useState } from 'react';
import { CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";

interface CodeEditorProps {
    code: string;
  }
  
  const CodeEditor: React.FC<CodeEditorProps> = ({ code }) => (
    <AceEditor
      width='950px'
      height='500px'
      mode="python"
      theme="xcode"
      name="Code Export"
      fontSize={14}
      lineHeight={19}
      showPrintMargin={true}
      showGutter={true}
      highlightActiveLine={true}
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