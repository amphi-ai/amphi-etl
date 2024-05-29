import React, { useState } from 'react';
import { FieldDescriptor } from '../configUtils';
import { Form, Input, Button, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';


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
    <Form.List name="values">
    {(fields, { add, remove }) => (
      <>
        <Form.Item>
          {values.map((value, index) => (
            <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Input
                name={`${field.id}_value_${index}`}
                placeholder="Value"
                id={`${field.id}_value_${index}`}
                value={value}
                onChange={(e) => handleChangeValue(e, index)}
                autoComplete="off"
              />
              <MinusCircleOutlined onClick={() => handleRemoveValue(index)} />
            </Space>
          ))}
        </Form.Item>
        <Form.Item>
          <Button type="dashed" onClick={handleAddValue} block icon={<PlusOutlined />}>
            Add Value
          </Button>
        </Form.Item>
      </>
    )}
  </Form.List>
  );
};

export default ValuesListForm;