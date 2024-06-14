import React, { useState } from 'react';
import { CodeGenerator, PipelineService } from '@amphi/pipeline-components-manager';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";

/*
const CodeModal = ({ code, filePath, modalOpen, setModalOpen, commands}) => {
  const saveFile = async () => {
    const file = await commands.execute('docmanager:new-untitled', { path: '/', type: 'file', ext: '.py' }); 
    const doc = await commands.execute('docmanager:open', { path: file.path });
    doc.context.model.fromString(code);
    setModalOpen(false);
  };

  return (
    <div>
      <Modal
        title="Code Export"
        centered
        open={modalOpen}
        onOk={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
        width={800}
        footer={(_, { OkBtn }) => (
          <>
            <Button onClick={saveFile}>Save</Button>
            <OkBtn />
          </>
        )}
      >
        <AceEditor
          width='100%'
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
      </Modal>
    </div>
  );
};
*/

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