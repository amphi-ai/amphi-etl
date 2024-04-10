import React, { useState } from 'react';
import { FieldDescriptor } from '../configUtils'
import { minusIcon, plusIcon } from '../icons';
import { Form, Divider, Input, Select, Space, Button } from 'antd';
import { MinusCircleOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';

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
    <Form.List name="keyValue">
      {(fields, { add, remove }) => (
        <>
          <Form.Item>
            {keyValuePairs.map((pair, index) => (
              <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Input
                  name={`${field.id}_key_${index}`}
                  placeholder={field.placeholder?.key || 'key'}
                  id={`${field.id}_key_${index}`}
                  value={pair.key}
                  onChange={(e) => handleChangeKV(e, index, 'key')}
                  autoComplete="off"
                />
                <Input
                  name={`${field.id}_value_${index}`}
                  placeholder={field.placeholder?.value || 'value'}
                  id={`${field.id}_value_${index}`}
                  value={pair.value}
                  onChange={(e) => handleChangeKV(e, index, 'value')} 
                  autoComplete="off"
                  />
                <MinusCircleOutlined onClick={() => handleRemovePair(index)} />
              </Space>
            ))}
          </Form.Item>
          <Form.Item>
            <Button type="dashed" onClick={handleAddPair} block icon={<PlusOutlined />}>
              Add {field.elementName ? field.elementName : 'item'}
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default KeyValueForm;