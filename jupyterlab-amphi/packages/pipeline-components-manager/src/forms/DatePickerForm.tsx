import React from 'react';
import type { DatePickerProps } from 'antd';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(weekday);
dayjs.extend(localeData);

// Stored format in the form: "YYYY-MM-DD"
type DateValue = string | null | undefined;

interface DatePickerFormProps {
  field: {
    id: string;
    placeholder?: string;
    inputType?: string;
  };
  value: DateValue; // "YYYY-MM-DD" or ""
  handleChange: (value: DateValue, fieldId: string) => void; // ✅ Fixed signature
  context?: any;
  advanced?: boolean;
}

// Convert stored string ("YYYY-MM-DD") to Dayjs for AntD
const normalizeValue = (value: DateValue): Dayjs | null => {
  console.log('[DatePickerForm] normalizeValue input:', value);

  if (!value) return null;

  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) {
    console.warn('[DatePickerForm] invalid date string:', value);
    return null;
  }

  return parsed;
};

export const DatePickerForm: React.FC<DatePickerFormProps> = ({
  field,
  value,
  handleChange,
  context,
  advanced,
}) => {
  // Local state so the picker always updates visually
  const [internalValue, setInternalValue] = React.useState<DateValue>(value || '');

  // Sync when parent actually changes the value (e.g. load defaults / reset)
  React.useEffect(() => {
    console.log('[DatePickerForm] syncing from parent value:', value);
    setInternalValue(value || '');
  }, [value]);

  console.log('[DatePickerForm] render:', {
    fieldId: field.id,
    propValue: value,
    internalValue,
  });

  const onChange: DatePickerProps['onChange'] = (date) => {
    if (date) {
      const formatted = date.format('YYYY-MM-DD');
      console.log('[DatePickerForm] onChange -> formatted string:', formatted);

      // Update local state so UI changes even if parent is slow / miswired
      setInternalValue(formatted);

      // ✅ FIXED: Swap the argument order to match parent's expectation
      handleChange(formatted, field.id);
    } else {
      console.log('[DatePickerForm] onChange -> cleared');

      setInternalValue('');
      // ✅ FIXED: Swap the argument order
      handleChange('', field.id);
    }
  };

  return (
    <DatePicker
      id={field.id}
      placeholder={field.placeholder}
      size={advanced ? 'middle' : 'small'}
      style={{ width: '100%' }}
      value={normalizeValue(internalValue)}
      onChange={onChange}
      format="YYYY-MM-DD"
      onKeyDown={(e: any) => e.stopPropagation()}
    />
  );
};

export default React.memo(DatePickerForm);