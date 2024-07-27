import { AutoComplete, Input } from 'antd';
import React, { useEffect } from 'react';
import { useVariableAutoComplete } from '../variablesUtils';

export const InputRegular = ({ field, value, handleChange, context, advanced }) => {

  const {
    inputValue,
    inputRef,
    openValue,
    setOpenValue,
    optionsVariables,
    handleInputChange,
    handleSelect,
    filterOptions,
    suffix,
  } = useVariableAutoComplete({ field, value, handleChange, context, advanced });

  return (
    <AutoComplete
      ref={inputRef}
      id={field.id}
      // popupClassName="certain-category-search-dropdown"
      options={optionsVariables}
      filterOption={filterOptions}
      size={advanced ? "middle" : "small"}
      open={openValue}
      onBlur={() => setOpenValue(false)}
      defaultOpen={false}
      value={inputValue}
      onChange={handleInputChange}
      onSelect={handleSelect}
    >
      {field.inputType === 'password' ? (
        <Input.Password
          // {...(field.connection && field.advanced && { addonBefore: selectBefore })}
          placeholder={field.placeholder}
          ref={inputRef}
          id={field.id}
          size={advanced ? "middle" : "small"}
          name={field.id}
          autoComplete="off"
          // iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          value={inputValue}
          suffix={suffix}
        />
      ) : (
        <Input
          // {...(field.connection && field.advanced && { addonBefore: selectBefore })}
          placeholder={field.placeholder}
          ref={inputRef}
          id={field.id}
          size={advanced ? "middle" : "small"}
          name={field.id}
          autoComplete="off"
          suffix={suffix}
        />
      )}
    </AutoComplete>
  );

}

export default InputRegular;