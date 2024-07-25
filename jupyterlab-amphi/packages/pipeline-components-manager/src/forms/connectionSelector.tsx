import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';

import { ConfigProvider, Cascader, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';
import type { InputRef, CascaderProps, GetProp } from 'antd';
import type { SingleCascaderProps } from 'antd/es/cascader';
import { FieldDescriptor, Option } from '../configUtils';
import { RequestService } from '../RequestService';

// TODO

type DefaultOptionType = GetProp<CascaderProps, 'options'>[number];

interface ConnectionSelectorProps {
  field: FieldDescriptor;
  handleChange: (value: any, fieldId: string) => void;
  defaultValue: Option;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  field, handleChange, defaultValue, context, componentService, commands, nodeId, advanced
}) => {

  const [options, setOptions] = useState<Option[]>();

  interface Option {
    value: string;
    label: string;
    children?: Option[];
    disabled?: boolean;
  }
  

  const dropdownRender = (menus: React.ReactNode) => (
    <div>
      {menus}
      <Divider style={{ margin: 0 }} />
      <div style={{ padding: 8 }}>The footer is not very short.</div>
    </div>
  );

  const loadData = (selectedOptions: Option[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];

    // load options lazily
    setTimeout(() => {
      targetOption.children = [
        {
          label: `${targetOption.label} Dynamic 1`,
          value: 'dynamic1',
        },
        {
          label: `${targetOption.label} Dynamic 2`,
          value: 'dynamic2',
        },
      ];
      setOptions([...options]);
    }, 1000);
  };
  
  
  const onChange: SingleCascaderProps<Option>['onChange'] = (value, selectedOptions) => {
    console.log(value, selectedOptions);
  };
  
  const filter = (inputValue: string, path: DefaultOptionType[]) =>
    path.some(
      (option) => (option.label as string).toLowerCase().indexOf(inputValue.toLowerCase()) > -1,
    );

  return (
    <Cascader
    options={options}
    onChange={onChange}
    changeOnSelect
    loadData={loadData}
    placeholder="Please select"
    showSearch={{ filter }}
    onSearch={(value) => console.log(value)}
    dropdownRender={dropdownRender}
  />
  );
};

export default ConnectionSelector;