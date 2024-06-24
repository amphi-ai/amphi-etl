import { FieldDescriptor, Option } from '../configUtils';
import React, { useState, useEffect, useRef } from 'react';
import { UserOutlined, CloseOutlined, EyeInvisibleOutlined, EyeTwoTone, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { Checkbox, InputNumber, Space } from 'antd';
import { PipelineService } from '../PipelineService';
import type { CheckboxProps } from 'antd';


export const InputQuantity = ({ field, value, handleChange, context, advanced }) => {

  const [isChecked, setIsChecked] = useState(false);

  const onChange: CheckboxProps['onChange'] = (e) => {
    setIsChecked(e.target.checked);
    if (e.target.checked) {
      handleChange('None', field.id); // Update field value to None
    }
  };

  return (
    <Space>
      <InputNumber
        {...(field.min ? { min: field.min } : {})}
        {...(field.max ? { max: field.max } : {})}
        id={field.id}
        name={field.id}
        value={isChecked ? undefined : value}
        onChange={value => handleChange(value, field.id)}
        disabled={isChecked}
        changeOnWheel
      />
      {field.noneOption && (
        <Checkbox checked={isChecked} onChange={onChange}>
          None
        </Checkbox>
      )}
    </Space>
  );
}

export default InputQuantity;