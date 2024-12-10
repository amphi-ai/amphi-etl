import React, { useState, useEffect, useRef } from 'react';
import {
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Space, Button, Input, Select, Divider } from 'antd';
import { PipelineService } from '../PipelineService';
import { showBrowseFileDialog } from '../BrowseFileDialog';

export const InputFiles = ({ field, values, handleChange, context, advanced, manager }) => {
  
  // Initialize selectedFiles as array of { label, value } objects
  const [selectedFiles, setSelectedFiles] = useState(
    (values || []).map(value => ({ label: value, value }))
  );

  const [name, setName] = useState('');
  const inputSelectRef = useRef(null);

  useEffect(() => {
    if (values) {
      setSelectedFiles(values.map(value => ({ label: value, value })));
    }
  }, [values]);

  const addItem = (e) => {
    e.preventDefault();
    if (name && !selectedFiles.find(file => file.value === name)) {
      const newItem = { label: name, value: name };
      const updatedSelectedFiles = [...selectedFiles, newItem];
      setSelectedFiles(updatedSelectedFiles);
      handleChange(updatedSelectedFiles.map(f => f.value), field.id);
      setName('');
      setTimeout(() => {
        inputSelectRef.current?.focus();
      }, 0);
    }
  };

  const handleSelectChange = (selectedItems) => {
    setSelectedFiles(selectedItems);
    handleChange(selectedItems.map(item => item.value), field.id);
  };

  const onNameChange = (event) => {
    setName(event.target.value);
  };

  const handleBrowseFiles = async () => {
    try {
      const res = await showBrowseFileDialog(manager, {
        multiselect: true,
        includeDir: true,
        filter: (model) => model.path !== context.path,
      });

      if (res.value && res.value.length > 0) {
        const relativePaths = res.value.map(file => PipelineService.getRelativePath(context.path, file.path));
        const newSelectedFiles = relativePaths.map(path => ({ label: path, value: path }));
        const updatedSelectedFiles = [...selectedFiles, ...newSelectedFiles].filter(
          (file, index, self) => index === self.findIndex(f => f.value === file.value)
        );
        setSelectedFiles(updatedSelectedFiles);
        handleChange(updatedSelectedFiles.map(f => f.value), field.id);
      }
    } catch (error) {
      console.error("Error selecting files:", error);
    }
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        mode="multiple"
        labelInValue
        size={advanced ? "middle" : "small"}
        style={{ width: '100%' }}
        className="nodrag"
        onChange={handleSelectChange}
        value={selectedFiles}
        placeholder={field.placeholder || 'Select files'}
        {...(field.required ? { required: field.required } : {})}
        {...(field.tooltip ? { tooltip: field.tooltip } : {})}
        dropdownRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <Space style={{ padding: '0 8px 4px' }}>
              <Input
                placeholder="Add file"
                ref={inputSelectRef}
                value={name}
                onChange={onNameChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addItem(e);
                  }
                }}
              />
              <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                Add
              </Button>
            </Space>
          </>
        )}
        options={selectedFiles} // Provide the selectedFiles directly
      />
      <Button
        type="primary"
        size={advanced ? "middle" : "small"}
        onClick={handleBrowseFiles}
      >
        <SearchOutlined />
      </Button>
    </Space.Compact>
  );
};

export default React.memo(InputFiles);
