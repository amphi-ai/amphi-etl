import React, { useState } from 'react';
import { FieldDescriptor } from '../configUtils';
import { minusIcon, plusIcon } from '../icons';

// Define a type for your component's props
interface ValueFormProps {
  field: FieldDescriptor;
  handleChange: (values: string[], fieldId: string) => void;
  initialValues?: string[]; // Updated for handling list of values
}

export const ValuesListForm: React.FC<ValueFormProps> = ({ field, handleChange, initialValues }) => {
  const [values, setValues] = useState(initialValues || ['']);

  const handleAddValue = () => {
    setValues([...values, '']);
    handleChange(values, field.id);
  };

  const handleRemoveValue = (index: number) => {
    const updatedValues = [...values];
    updatedValues.splice(index, 1);
    setValues(updatedValues);
    handleChange(updatedValues, field.id);
  };

  const handleChangeValue = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const updatedValues = [...values];
    updatedValues[index] = e.target.value;
    setValues(updatedValues);
    handleChange(updatedValues, field.id);
  };

  return (
    <div>
      {values.map((value, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="text"
            name={`${field.id}_value_${index}`}
            placeholder="Value"
            id={`${field.id}_value_${index}`}
            value={value}
            onChange={(e) => handleChangeValue(e, index)}
            className="mt-1 h-6 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs"
          />
          <button
            type="button"
            onClick={() => handleRemoveValue(index)}
            className="nodrag flex flex-col justify-center items-center mt-1 w-9 h-6 rounded-sm bg-gray-500 text-white shadow-sm sm:text-xs">
            <minusIcon.react className="" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddValue}
        className="nodrag flex flex-col justify-center items-center mt-2 w-9 h-6 rounded-sm bg-gray-500 text-white shadow-sm sm:text-xs">
        <plusIcon.react className="" />
      </button>
    </div>
  );
};

export default ValuesListForm;