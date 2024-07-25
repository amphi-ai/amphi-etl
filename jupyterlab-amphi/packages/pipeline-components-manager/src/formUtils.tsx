import { Form } from 'antd';
import React from 'react';

export const renderFormItem = (field: any, content: any) => (
  <Form.Item
    style={{ marginTop: "5px", padding: "0 0 2px" }}
    label={field.label}
    className="nodrag"
    {...(field.required ? { required: field.required } : {})}
    {...(field.tooltip ? { tooltip: field.tooltip } : {})}
  >
    {content}
  </Form.Item>
);