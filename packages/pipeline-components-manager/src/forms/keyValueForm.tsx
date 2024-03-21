import React, { useState } from 'react';
import { FieldDescriptor } from '../configUtils'
import { minusIcon, plusIcon } from '../icons';

// Define a type for your component's props
interface KeyValueFormProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  initialValues?: { key: string; value: string }[]; // Add this line
}

export const KeyValueForm: React.FC<KeyValueFormProps> = ({ field, handleChange, initialValues }) => {
  const [keyValuePairs, setKeyValuePairs] = useState(initialValues || [{ key: '', value: '' }]);

  const handleAddPair = () => {
    setKeyValuePairs([...keyValuePairs, { key: '', value: '' }]);
    handleChange(keyValuePairs, field.id);
  };

  const handleRemovePair = (index: any) => {
    const pairs = [...keyValuePairs];
    pairs.splice(index, 1);
    setKeyValuePairs(pairs);
    handleChange(pairs, field.id);
  };

  const handleChangeKV = (e: React.ChangeEvent<HTMLInputElement>, index: number, property: string) => {

    const updatedKeyValuePairs = [...keyValuePairs];

    updatedKeyValuePairs[index] = {
      ...updatedKeyValuePairs[index],
      [property]: e.target.value
    };

    setKeyValuePairs(updatedKeyValuePairs);
    handleChange(updatedKeyValuePairs, field.id);

  };

  return (
    <div>
      {keyValuePairs.map((pair, index) => (
        <div key={index} className="col-span-1 flex items-center space-x-2">
          <input
            type="text"
            name={`${field.id}_key_${index}`}
            placeholder="Key"
            id={`${field.id}_key_${index}`}
            value={pair.key}
            onChange={(e) => handleChangeKV(e, index, 'key')}
            className="mt-1 h-6 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs"
          />
          <input
            type="text"
            name={`${field.id}_value_${index}`}
            placeholder="Value"
            id={`${field.id}_value_${index}`}
            value={pair.value}
            onChange={(e) => handleChangeKV(e, index, 'value')}
            className="mt-1 h-6 w-full rounded-sm border-gray-200 shadow-sm sm:text-xs"
          />
          <button type="button"
            onClick={() => handleRemovePair(index)}
            className="nodrag flex flex-col justify-center items-center mt-1 w-9 h-6 rounded-sm bg-gray-500 text-white shadow-sm sm:text-xs">
            <minusIcon.react className="" />
          </button>
        </div>
      ))}
      <button type="button"
        onClick={handleAddPair}
        className="nodrag flex flex-col justify-center items-center mt-2 w-9 h-6 rounded-sm bg-gray-500 text-white shadow-sm sm:text-xs">
        <plusIcon.react className="" />
      </button>
    </div>
  );
};

export default KeyValueForm;