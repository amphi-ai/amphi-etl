import React, { useState } from 'react';
import { Checkbox, InputNumber } from 'antd';
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
    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8 }}>
      <InputNumber
        {...(field.min !== undefined ? { min: field.min } : {})}
        {...(field.max !== undefined ? { max: field.max } : {})}
        id={field.id}
        name={field.id}
        value={isChecked ? undefined : value}
        onChange={value => handleChange(value, field.id)}
        onKeyDown={(e: any) => e.stopPropagation()}
        changeOnWheel
        style={{ flex: 1, width: '100%' }}
      />
      {field.noneOption && (
        <Checkbox checked={isChecked} onChange={onChange}>
          None
        </Checkbox>
      )}
    </div>
  );
}

export default React.memo(InputQuantity);
