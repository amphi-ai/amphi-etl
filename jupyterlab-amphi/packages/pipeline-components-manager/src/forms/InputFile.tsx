import React, { useState, useEffect, useRef } from 'react';
import Icon, { UserOutlined, CloseOutlined, EyeInvisibleOutlined, EyeTwoTone, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { AutoComplete, Space, Button, Input, Select } from 'antd';
import { PipelineService } from '../PipelineService';
import { showBrowseFileDialog } from '../BrowseFileDialog';
import { PathExt } from '@jupyterlab/coreutils';
import type { GetProps } from 'antd';

type CustomIconComponentProps = GetProps<typeof Icon>;


export const InputFile = ({ field, value, handleChange, context, advanced, manager }) => {

  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);
  const [openValue, setOpenValue] = useState(false);
  const [optionsVariables, setOptionsVariables] = useState([]);

  useEffect(() => {
    setInputValue(value);  // Update inputValue when value prop changes
  }, [value]);

  const handleInputChange = (value) => {
    setInputValue(value);
    handleChange(value, field.id);
  };

  const handleSelect = (value, option) => {
    const newValue = `{os.getenv['${value}']}`;
    handleInputChange(newValue);
  };

  const filterOptions = (inputValue: string, option: any) => {
    if (!option || option.value === undefined) {
      return false;
    }

    /*
    if (inputValue.endsWith('{')) {
      setOpenValue(true);
      return true;
    } else {
      setOpenValue(false);
      const lastDollarIndex = inputValue.lastIndexOf('{');
      if (lastDollarIndex !== -1 && lastDollarIndex < inputValue.length - 1) {
        const searchTerm = inputValue.substring(lastDollarIndex + 1);
        // console.log("Option: %o", option);
        return option.value.startsWith(searchTerm);
      }
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

  const BracesSvg = () => (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18V14.3C4 13.4716 3.32843 12.8 2.5 12.8H2V11.2H2.5C3.32843 11.2 4 10.5284 4 9.7V6C4 4.34315 5.34315 3 7 3H8V5H7C6.44772 5 6 5.44772 6 6V10.1C6 10.9858 5.42408 11.7372 4.62623 12C5.42408 12.2628 6 13.0142 6 13.9V18C6 18.5523 6.44772 19 7 19H8V21H7C5.34315 21 4 19.6569 4 18ZM20 14.3V18C20 19.6569 18.6569 21 17 21H16V19H17C17.5523 19 18 18.5523 18 18V13.9C18 13.0142 18.5759 12.2628 19.3738 12C18.5759 11.7372 18 10.9858 18 10.1V6C18 5.44772 17.5523 5 17 5H16V3H17C18.6569 3 20 4.34315 20 6V9.7C20 10.5284 20.6716 11.2 21.5 11.2H22V12.8H21.5C20.6716 12.8 20 13.4716 20 14.3Z"></path></svg>
  );

  const BracesIcon = (props: Partial<CustomIconComponentProps>) => (
    <Icon component={BracesSvg} {...props} />
  );

  const suffix = (
    <BracesIcon
      style={{
        color: 'grey',
        transition: 'color 0.3s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#43786E')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'grey')}
      onClick={() => {
        if (!openValue) {
          setOptionsVariables([
            {
              label: renderTitle('Environment Variables'),
              options: PipelineService.getEnvironmentVariables(context.model.toString()).map(variableName => renderItem(variableName)),
            }
          ]);
        }
        setOpenValue(prev => !prev);  // Moved this line outside of the condition
      }}
    />
  );



  return (
    <Space.Compact style={{ width: '100%' }}>
    <AutoComplete
      ref={inputRef}
      id={field.id}
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
 
      
    </AutoComplete>
    <Button type="primary" size={advanced ? "middle" : "small"} onClick={async () => {
          // TODO, there is something wrong here

          console.log("context.path %o", context.path)
          console.log("PathExt.dirname(context.path) %o", PathExt.dirname(context.path))

          const res = await showBrowseFileDialog(
            manager,
            {
              multiselect: false,
              includeDir: true,
              filter: (model: any): boolean => {
                return model.path !== context.path;
              }
            });

          console.log("res %o", res)

          // Get relative path
          handleInputChange(PipelineService.getRelativePath(context.path, res.value[0].path));

        }}><SearchOutlined /></Button>
    </Space.Compact>
  );

}

export default InputFile;