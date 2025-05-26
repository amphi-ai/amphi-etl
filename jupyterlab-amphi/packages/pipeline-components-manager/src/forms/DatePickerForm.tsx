import { DatePicker } from 'antd';
import React from 'react';
import dayjs from 'dayjs'; // Ant Design 5.x uses Day.js by default

// Helper to ensure value is a Dayjs object if not null/undefined
const ensureDayjs = (value: string | dayjs.Dayjs | undefined | null): dayjs.Dayjs | null => {
  if (!value) {
    return null;
  }
  if (dayjs.isDayjs(value)) {
    return value;
  }
  // Attempt to parse if it's a string; adjust format as needed
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate : null;
};

export const DatePickerForm = ({ field, value, handleChange, advanced }) => {
  const handleDateChange = (date: dayjs.Dayjs | null, dateString: string) => {
    // Pass the date string or Dayjs object based on how you want to store it
    // For simplicity, passing dateString. If a Dayjs object is needed upstream, adjust this.
    handleChange(field.id, dateString);
  };

  const dayjsValue = ensureDayjs(value);

  return (
    <DatePicker
      id={field.id}
      placeholder={field.placeholder ?? 'Select date'}
      value={dayjsValue}
      onChange={handleDateChange}
      size={advanced ? "middle" : "small"}
      style={{ width: '100%' }} // Standard styling for form components
    />
  );
};

export default React.memo(DatePickerForm);
