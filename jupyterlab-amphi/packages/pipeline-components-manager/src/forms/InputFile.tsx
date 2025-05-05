import React, { useState, useEffect, useRef } from 'react';
import Icon, { UserOutlined, CloseOutlined, EyeInvisibleOutlined, EyeTwoTone, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { AutoComplete, Space, Button, Input, Select } from 'antd';
import { PipelineService } from '../PipelineService';
import { showBrowseFileDialog } from '../BrowseFileDialog';
import { PathExt } from '@jupyterlab/coreutils';
import type { GetProps } from 'antd';
import { useVariableAutoComplete } from '../variablesUtils';

type CustomIconComponentProps = GetProps<typeof Icon>;

export const InputFile = ({ field, value, handleChange, context, advanced, manager }) => {

  const allowedExts =
    Array.isArray(field.allowedExtensions) && field.allowedExtensions.length
      ? field.allowedExtensions.map(e =>
          e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`
        )
      : undefined;

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
        const res = await showBrowseFileDialog(
          manager,
          {
            multiselect: false,
            includeDir: true,
            extensions: allowedExts,                  /* just pass, dialog handles switch */
            filter: (model: any): boolean => {
              return model.path !== context.path;
            }
          });

        // Get relative path
        handleInputChange(PipelineService.getRelativePath(context.path, res.value[0].path));

      }}><SearchOutlined /></Button>
    </Space.Compact>
  );

}

export default React.memo(InputFile);