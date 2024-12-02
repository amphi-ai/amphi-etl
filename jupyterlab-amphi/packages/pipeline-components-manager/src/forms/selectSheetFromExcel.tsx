import React, { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ConfigProvider, Divider, Input, Select, Space, Button, Empty } from 'antd';
import type { InputRef } from 'antd';
import { FieldDescriptor, Option } from '../configUtils';
import { RequestService } from '../RequestService';

interface SelectSheetFromExcelProps {
    data: any;
    field: FieldDescriptor;
    handleChange: (values: any[], fieldId: string) => void;
    defaultValue: Option[];
    context: any;
    componentService: any;
    commands: any;
    nodeId: string;
    advanced: boolean;
}

export const SelectSheetFromExcel: React.FC<SelectSheetFromExcelProps> = ({
    data,
    field,
    handleChange,
    defaultValue,
    context,
    componentService,
    commands,
    nodeId,
    advanced,
}) => {
    const [items, setItems] = useState<Option[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<Option[]>(defaultValue);
    const [loading, setLoading] = useState(false);
    const [customName, setCustomName] = useState('');
    const inputRef = useRef<InputRef>(null);

    const findOptionByValue = (value: any): Option | undefined =>
        items.find((option) => option.value === value) || { label: value, value };

    useEffect(() => {
        if (defaultValue) {
            setSelectedOptions(defaultValue);
        }
    }, [defaultValue]);

    const retrieveSheets = (event: any) => {
        RequestService.retrieveSheetNames(
            event,
            context,
            componentService,
            setItems,
            setLoading,
            nodeId
        );
    };

    const handleSelectChange = (selectedItems: Option[]) => {
        setSelectedOptions(selectedItems);
        handleChange(selectedItems.map((item) => item.value), field.id);
    };

    const addItem = () => {
        const newItem = { value: customName, label: customName };
        setItems([...items, newItem]);
        setSelectedOptions([...selectedOptions, newItem]);
        handleChange([...selectedOptions.map((item) => item.value), customName], field.id);
        setCustomName('');
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const customizeRenderEmpty = () => (
        <div style={{ textAlign: 'center' }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sheets available" />
        </div>
    );

    const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCustomName(event.target.value);
    };

    return (
        <ConfigProvider renderEmpty={customizeRenderEmpty}>
            <Select
                mode="multiple"
                labelInValue
                size={advanced ? 'middle' : 'small'}
                style={{ width: '100%' }}
                value={selectedOptions}
                onChange={handleSelectChange}
                placeholder={field.placeholder || 'Select sheets'}
                dropdownRender={(menu) => (
                    <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ display: 'flex', justifyContent: 'center', padding: '0 8px 4px' }}>
                            <Button
                                type="primary"
                                onClick={retrieveSheets}
                                loading={loading}
                            >
                                Retrieve Sheets
                            </Button>
                        </Space>
                        {advanced && (
                            <>
                                <Divider style={{ margin: '8px 0' }} />
                                <Space style={{ padding: '0 8px 4px' }}>
                                    <Input
                                        placeholder="Custom Sheet"
                                        ref={inputRef}
                                        value={customName}
                                        onChange={onNameChange}
                                        onKeyDown={(e: any) => e.stopPropagation()}
                                    />
                                    <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                                        Add
                                    </Button>
                                </Space>
                            </>
                        )}
                    </>
                )}
                options={items.map((item) => ({
                    label: item.label,
                    value: item.value,
                }))}
            />
        </ConfigProvider>
    );
};

export default React.memo(SelectSheetFromExcel);
