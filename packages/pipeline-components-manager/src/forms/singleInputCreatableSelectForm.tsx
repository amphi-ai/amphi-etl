import React, { useState, useEffect, CSSProperties } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { FieldDescriptor, Option } from '../configUtils';

interface GroupedOption {
  label: string;
  options: Option[];
}

const formatGroupLabel = (data: GroupedOption) => (
  <div>
    <span>{data.label}</span>
    <span>{data.options.length}</span>
  </div>
);

interface SingleInputCreatableSelectProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValue: Option | Option[];
  inDialog: boolean;
  creatable: boolean;
}

const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: '1.5rem', // Equivalent to h-7
    height: '1.5rem', // Adjust based on focus
    padding: '0px',
    margin: '0px',
    borderRadius: '0.125rem', // Equivalent to rounded-sm
    borderColor: '#E2E8F0', // Equivalent to border-gray-200
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // Equivalent to shadow-sm
    zIndex: 9999
  }),

  valueContainer: (provided: any, state: any) => ({
    ...provided,
    padding: '0px',
    margin: '0px',
    marginLeft: '0.25rem',
  }),
  singleValue: (provided: any, state: any) => ({
    ...provided,
    marginLeft: '0px',
    marginRight: '0px',
    fontSize: '12px',
    color: '#525252',
  }),
  input: (provided: any, state: any) => ({
    ...provided,
    fontSize: '12px',
    color: '#525252',
    margin: '0px'
  }),
  indicatorSeparator: (state: any) => ({

  }),
  indicatorsContainer: (provided: any, state: any) => ({
    ...provided,
    padding: '0px',
  }),
  dropdownIndicator: (provided: any, state: any) => ({
    ...provided,
    padding: '0px',
    display: 'flex', // Set display to flex to enable flexbox properties
    justifyContent: 'flex-end', // Align items to the end of the flex container (right side)
    width: '35px',
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 9999
  }),
  menu: (provided: any) => ({
    ...provided,
    // Add your custom styles here
    backgroundColor: 'white',
    borderRadius: '0.125rem', // Equivalent to rounded-sm
  }),
  option: (provided: any) => ({
    ...provided,
    // Add your custom styles here
    height: 'auto', // Change from fixed height to auto
    minHeight: '1.5rem', // Ensure minimum height is 1.5rem
    lineHeight: '1.5rem', // Set line height to 1.5rem
    padding: '0px 10px', // Adjust padding as needed, added horizontal padding for better text alignment
  })

};

export const SingleInputCreatableSelectForm: React.FC<SingleInputCreatableSelectProps> = ({
  field, handleChange, defaultValue, inDialog, creatable
}) => {
  const findOptionByValue = (value: any) => {
    return field.options.find(option => option.value === value) || { value: value, label: value };
  };

  const [selectedOption, setSelectedOption] = useState(findOptionByValue(defaultValue));
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    setSelectedOption(findOptionByValue(defaultValue));
  }, [defaultValue, field.options]);

  const handleSelectChange = (option: any) => {
    setSelectedOption(option);
    handleChange(option?.value, field.id);
  };

  const SelectComponent = creatable ? CreatableSelect : Select;

  return (
    <SelectComponent
      className="nodrag nowheel mt-1 sm:h-6 h-7 w-full sm:text-xs text-sm"
      classNamePrefix="component_select"
      styles={customStyles}
      onChange={handleSelectChange}
      options={field.options}
      value={selectedOption}
      formatGroupLabel={formatGroupLabel}
      placeholder={field.placeholder || 'Select ...'}
      formatCreateLabel={(inputValue: any) => `Use "${inputValue}"`}
      menuPlacement="auto"
      maxMenuHeight={180}
      isDisabled={isDisabled}
      menuPortalTarget={document.body}
      theme={(theme: any) => ({
        ...theme,
        colors: {
          ...theme.colors,
          primary25: '#F0F5F7',
          primary: '#6B7380',
        },
      })}
    />
  );
};

export default SingleInputCreatableSelectForm;