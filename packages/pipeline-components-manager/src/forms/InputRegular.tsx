import { FieldDescriptor, Option } from '../configUtils';
import React, { useState, useEffect, useRef } from 'react';
import { UserOutlined } from '@ant-design/icons';
import { AutoComplete, Input } from 'antd';


export const InputRegular = ({ field, value, handleChange, advanced }) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);
  const [openValue, setOpenValue] = useState(false);

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

  const filterOptions = (inputValue: string, option: any) => {
    setOpenValue(false);
    return false;
    /*
    if(inputValue.startsWith('env.')) {
      setOpenValue(true);
      return true;
    } else {
      setOpenValue(false);
      return false;
    }
    */
  };

  const renderTitle = (title: string) => (
    <span>
      {title}
    </span>
  );
  
  const renderItem = (title: string) => ({
    value: title,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {title}
      </div>
    ),
  });

  const options = [
    {
      label: renderTitle('Environment Variables'),
      options: [renderItem('AntDesign')],
    }
  ];

  return (
    <AutoComplete
      popupClassName="certain-category-search-dropdown"
      options={options}
      filterOption={filterOptions}
      size={advanced ? "middle" : "small"}
      open={openValue}
      >
      <Input
        ref={inputRef}
        size={advanced ? "middle" : "small"}
        id={field.id}
        name={field.id}
        placeholder={field.placeholder}
        onChange={handleInputChange}
        value={inputValue}
      />
  </AutoComplete>
  );
  }

export default InputRegular;