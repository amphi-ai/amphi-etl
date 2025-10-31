import { Form } from 'antd';
import React from 'react';

export const renderFormItem = (field: any, content: any) => {
  
  return (
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
};

/**
 * Stops copy/paste/cut key events from bubbling up from text inputs.
 * This allows native text editing to work while preventing the
 * React Flow canvas's custom copy/paste from firing.
 */
export const onInputKeyDown = (
  event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
): void => {
  // Check for copy, paste, or cut shortcuts
  if (event.key === 'c' || event.key === 'v' || event.key === 'x') {
    // Check if Ctrl (for Windows/Linux) or Meta (for Mac) is pressed
    if (event.ctrlKey || event.metaKey) {
      // Stop the event from bubbling up to the React Flow pane and document
      event.stopPropagation();
    }
  }
  event.preventDefault(); 
};