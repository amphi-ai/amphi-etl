import { FieldDescriptor, Option } from '../configUtils';
import React, { useState, useEffect, useRef } from 'react';
import { UserOutlined, CloseOutlined, EyeInvisibleOutlined, EyeTwoTone, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { AutoComplete, Space, Button } from 'antd';
import { PipelineService } from '../PipelineService';
import { showBrowseFileDialog } from '../BrowseFileDialog';
import { PathExt } from '@jupyterlab/coreutils';


export const InputFile = ({ field, value, handleChange, context, advanced, manager }) => {

  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);
  const [openValue, setOpenValue] = useState(false);

  useEffect(() => {
    setInputValue(value);  // Update inputValue when value prop changes
  }, [value]);

  const handleInputChange = (value) => {
    setInputValue(value);
    handleChange(value, field.id);
  };

  const handleSelect = (value, option) => {
    const newValue = `{os.environ['${value}']}`;
    handleInputChange(newValue);
  };

  const filterOptions = (inputValue: string, option: any) => {
    if (!option || option.value === undefined) {
      return false;
    }

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
      options: PipelineService.getEnvironmentVariables(context.model.toString()).map(variable => renderItem(variable.name)),
    }
  ];



  return (
    <Space.Compact style={{ width: '100%' }}>
      <AutoComplete
        ref={inputRef}
        id={field.id}
        placeholder={field.placeholder}
        popupClassName="certain-category-search-dropdown"
        options={options}
        filterOption={filterOptions}
        size={advanced ? "middle" : "small"}
        open={openValue}
        defaultOpen={false}
        value={inputValue}
        onChange={handleInputChange}
        onSelect={handleSelect}
      />
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