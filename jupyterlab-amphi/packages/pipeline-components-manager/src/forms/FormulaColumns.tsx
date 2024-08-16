import React, { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Form, Card, Button } from 'antd';
import { SelectColumns } from './selectColumns';
import { CodeTextarea } from './CodeTextarea';
import type { FieldDescriptor } from '../configUtils';

interface FormulaColumnsProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValue: any;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const FormulaColumns: React.FC<FormulaColumnsProps> = ({
  field, handleChange, defaultValue, context, componentService, commands, nodeId, advanced
}) => {

  const [form] = Form.useForm();
  const [value, setValue] = useState(defaultValue || {});

  useEffect(() => {
    form.setFieldsValue(value);
  }, [value]);

  const onValuesChange = (changedValues: any, allValues: any) => {
    setValue(allValues);
    handleChange(allValues, field.id);
  };

  return (

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div style={{ display: 'flex', rowGap: 16, flexDirection: 'column' }}>
            {fields.map((field) => (
              <Card
                size="small"
                title={`Item ${field.name + 1}`}
                key={field.key}
                extra={
                  <CloseOutlined
                    onClick={() => {
                      remove(field.name);
                    }}
                  />
                }
              >
                <Form.Item label="Name" name={[field.name, 'name']}>
                  <SelectColumns
                    field={{
                      type: 'columns',
                      id: "columns",
                      label: "Columns",
                      placeholder: "Select columns or add new",
                    }}
                    handleChange={null}
                    defaultValues={[]}
                    context={context}
                    commands={commands}
                    componentService={componentService}
                    nodeId={nodeId}
                    advanced={true}
                  />
                </Form.Item>

                <Form.Item label="Formula" name={[field.name, 'formula']}>
                  <CodeTextarea
                    field={{
                      type: "codeTextarea",
                      id: "formula",
                      label: "Python Formula",
                      placeholder: "row['column1'] + row['column2']",
                    }}
                    handleChange={null}
                    advanced={true}
                    value={""}
                  />
                </Form.Item>
              </Card>
            ))}

            <Button type="dashed" onClick={() => add()} block>
              + Add Formula
            </Button>
          </div>
        )}
      </Form.List>
  );
};

export default FormulaColumns;
