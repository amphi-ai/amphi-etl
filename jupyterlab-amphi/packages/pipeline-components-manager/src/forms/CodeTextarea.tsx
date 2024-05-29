import { FieldDescriptor, Option } from '../configUtils';
import React, { useState, useEffect, useRef } from 'react';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-xcode";

export const CodeTextarea = ({ field, value, handleChange, advanced, rows }) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value);  // Update inputValue when value prop changes
  }, [value]);

  const handleInputChange = (val) => {
    const newValue = val;
    setInputValue(newValue);
    handleChange(newValue, field.id);
  };

  return (
    <AceEditor
      width='100%'
      height={field.height}
      placeholder={field.placeholder}
      mode={field.mode}
      theme="xcode"
      name={field.id}
      onChange={handleInputChange}
      fontSize={14}
      lineHeight={19}
      showPrintMargin={true}
      showGutter={true}
      highlightActiveLine={true}
      value={inputValue}
      setOptions={{
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showLineNumbers: true,
      tabSize: 2,
      }}/>
         
  );
};

export default CodeTextarea;