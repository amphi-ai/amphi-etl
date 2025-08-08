import { DatePicker, DatePickerProps } from 'antd';
import React from 'react';
import dayjs from 'dayjs';

const ensureDayjs = (value: string | dayjs.Dayjs | undefined | null): dayjs.Dayjs | null => {
  if (!value) return null;
  return dayjs.isDayjs(value) ? value : dayjs(value).isValid() ? dayjs(value) : null;
};

export const DatePickerForm = ({ field, value, handleChange, advanced }) => {
  const handleDateChange: DatePickerProps['onChange'] = (date, dateString) => {
    // dateString is string | string[]
    handleChange(field.id, Array.isArray(dateString) ? dateString[0] ?? '' : dateString);
  };

  const dayjsValue = ensureDayjs(value);

  return (
    <DatePicker
      id={field.id}
      placeholder={field.placeholder ?? 'Select date'}
      value={dayjsValue as dayjs.Dayjs | null}
      onChange={handleDateChange}
      size={advanced ? 'middle' : 'small'}
      style={{ width: '100%' }}
    />
  );
};

export default React.memo(DatePickerForm);
