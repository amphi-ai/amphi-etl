import { FieldDescriptor, Option } from '../configUtils';
import React, { useState, useEffect, useRef } from 'react';
import { CheckOutlined, CloseOutlined, EyeInvisibleOutlined, EyeTwoTone, SearchOutlined, SettingOutlined } from '@ant-design/icons';

import { Input } from 'antd';

export const InputPassword = ({ field, value, handleChange, advanced }) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value);  // Update inputValue when value prop changes
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;  // Save the cursor position
    setInputValue(newValue);
    handleChange(newValue, field.id);

    // Reset cursor position after the state updates
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = cursorPosition;
        inputRef.current.selectionEnd = cursorPosition;
      }
    }, 0);
  };

  return (
    <Input.Password
      ref={inputRef}
      id={field.id}
      size={advanced ? "middle" : "small"}
      name={field.id}
      placeholder={field.placeholder}
      onChange={handleInputChange}
      value={inputValue}
      autoComplete="off"
      iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
  />

  );
};

export default InputPassword;