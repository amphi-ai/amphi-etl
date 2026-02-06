import { KernelMessage } from '@jupyterlab/services';
import difference from 'lodash/difference';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from "react-dnd";

import { HTML5Backend } from "react-dnd-html5-backend";
import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { RequestService } from '../RequestService';
import DndProviderWrapper from '../DndProviderWrapper';

import type { GetProp, TableColumnsType, TableProps, TransferProps } from 'antd';
import { Button, Space, Table, Tag, Transfer } from 'antd';
import { FieldDescriptor } from '../configUtils';

// implementation based on ant design and https://github.com/ant-design/ant-design/issues/12817#issuecomment-683288556


interface TransferDataProps {
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValue: any;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  advanced: boolean;
}

export const TransferData: React.FC<TransferDataProps> = ({
  field, handleChange, defaultValue, context, componentService, commands, nodeId, advanced
}) => {

  type TransferItem = GetProp<TransferProps, 'dataSource'>[number];
  type TableRowSelection<T extends object> = TableProps<T>['rowSelection'];


  interface RecordType {
    key: string;
    value: string;
    title: string;
    disabled: boolean;
    type: string;
  }

  interface DataType {
    key: string;
    value: string;
    title: string;
    disabled: boolean;
    type: string;
  }

  interface TableTransferProps extends TransferProps<TransferItem> {
    dataSource: DataType[];
    leftColumns: TableColumnsType<DataType>;
    rightColumns: TableColumnsType<DataType>;
  }

  interface DragItem {
    type: string;
    index: number;
  }

  const DragableBodyRow = ({ index, rowDrop, className, style, ...restProps }) => {
    const ref = React.useRef();
    const [{ isOver, canDrop, dropPosition }, drop] = useDrop({
      accept: 'DragableBodyRow',
      canDrop: (item: DragItem) => item.index !== index,
      collect: (monitor) => {
        const item = monitor.getItem() as DragItem;
        if (!item || item.index === index) {
          return { isOver: false, canDrop: false, dropPosition: null };
        }
        return {
          isOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
          dropPosition: item.index < index ? 'below' : 'above',
        };
      },
      drop: (item: DragItem) => {
        if (item.index !== index) {
          rowDrop(item.index, index);
        }
      },
    });

    const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
      type: 'DragableBodyRow',
      item: { type: 'DragableBodyRow', index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    drag(drop(ref));

    // Create more visible styles based on drop position
    const dropIndicatorStyle = isOver && canDrop ? {
      boxShadow: dropPosition === 'above'
        ? 'inset 0 3px 0 0 #5f9b97'
        : 'inset 0 -3px 0 0 #5f9b97',
      backgroundColor: 'rgba(95, 155, 151, 0.05)',
    } : {};

    return (
      <tr
        ref={ref}
        className={`${className} draggable`}
        style={{
          cursor: 'move',
          opacity: isDragging ? 0.3 : 1,
          transition: 'opacity 0.2s ease',
          ...dropIndicatorStyle,
          ...style
        }}
        {...restProps}
      />
    );
  };

  // Customize Table Transfer
  const TableTransfer = ({ leftColumns, rightColumns, ...restProps }: TableTransferProps) => (
    <Transfer {...restProps}>
      {({
        direction,
        filteredItems,
        onItemSelect,
        onItemSelectAll,
        selectedKeys: listSelectedKeys,
        disabled: listDisabled,
      }) => {
        const columns = direction === 'left' ? leftColumns : rightColumns;
        const displayType = direction === 'right' ? 'target' : 'source';

        const rowSelection: TableRowSelection<TransferItem> = {
          getCheckboxProps: () => ({ disabled: listDisabled }),
          onChange(selectedRowKeys) {
            onItemSelectAll(selectedRowKeys, 'replace');
          },
          selectedRowKeys: listSelectedKeys,
          selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        };

        if (displayType === 'source') {
          return (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredItems}
              size="small"
              className="always-show-scrollbar"
              style={{ pointerEvents: listDisabled ? 'none' : undefined }}
              pagination={false}
              scroll={{ y: 400 }}
              onRow={({ key, disabled: itemDisabled }) => ({
                onClick: () => {
                  if (itemDisabled || listDisabled) {
                    return;
                  }
                  onItemSelect(key, !listSelectedKeys.includes(key));
                },
              })}
            />
          );
        } else {

          const rowDrop = (dragIndex, hoverIndex) => {

            // Ensure the indices are valid
            if (dragIndex === undefined || hoverIndex === undefined) {
              console.error("Invalid drag or hover index");
              return;
            }

            // Create a copy of the target keys with all properties intact
            let newKeys = [...targetKeys];

            // Extract the dragged item and re-insert at the hover index
            const dragRow = newKeys.splice(dragIndex, 1)[0]; // Ensure correct extraction
            newKeys.splice(hoverIndex, 0, dragRow); // Insert at the correct position

            setTargetKeys(newKeys);
            const savedSchema = { sourceData: sourceData, targetKeys: newKeys }
            handleChange(savedSchema, field.id);
          };

          return (
            <DndProviderWrapper>
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={filteredItems}
                components={{
                  body: {
                    row: DragableBodyRow,
                  },
                }}
                size="small"
                className="always-show-scrollbar"
                style={{ pointerEvents: listDisabled ? 'none' : undefined }}
                pagination={false}
                scroll={{ y: 400 }}
                onRow={(record, idx) => ({
                  index: idx, // Pass the correct index to the row
                  rowDrop,
                  onClick: () => {
                    if (record.disabled) {
                      return;
                    }
                    onItemSelect(record.key, !listSelectedKeys.includes(record.key)); // Toggle selection
                  },
                })}
              />
            </DndProviderWrapper>
          );
        }

      }}
    </Transfer>
  );

  const [items, setItems] = useState([]);
  const [sourceData, setSourceData] = useState<RecordType[]>([]);
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [loadings, setLoadings] = useState<boolean>();

  useEffect(() => {
  
    const newSourceData = items.map(item => ({
      ...item,
      key: item.value,
      title: item.value
    }));
  
    setSourceData(newSourceData);
  
    // Update targetKeys to only include keys that exist in the new source data
    setTargetKeys(prevTargetKeys => 
      prevTargetKeys.filter(key => newSourceData.some(item => item.key === key))
    );
  }, [items]);


  useEffect(() => {
    if (defaultValue && defaultValue.sourceData && defaultValue.targetKeys) {
      setSourceData(defaultValue.sourceData);
      setTargetKeys(defaultValue.targetKeys);
    } else {
      // Provide default initialization for sourceData and targetKeys if defaultValue doesn't exist
      setSourceData([]);
      setTargetKeys([]);
    }
  }, [defaultValue]);


  const columns: TableColumnsType<DataType> = [
    {
      dataIndex: 'value',
      title: 'Column',
    },
    {
      dataIndex: 'type',
      title: 'Type',
      render: (type) => <Tag>{type}</Tag>,
    }
  ];

  const onChange: TableTransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
    const savedSchema = { sourceData: sourceData, targetKeys: nextTargetKeys }
    handleChange(savedSchema, field.id);
  };

  const renderFooter: TransferProps['footer'] = (_, info) => {
    if (info?.direction === 'left') {
      return (
        <Button
          type="primary"
          size="small"
          style={{ float: 'left', margin: 5 }}
          onClick={(event) => {
            setItems([]);
            RequestService.retrieveDataframeColumns(
              event,
              context,
              commands,
              componentService,
              setItems,
              setLoadings,
              nodeId,
              0,
              true
            );
          }}
          loading={loadings}>
          Retrieve columns
        </Button>
      );
    }
    return;
  };

  return (
    <>
      <TableTransfer
        dataSource={sourceData}
        targetKeys={targetKeys}
        showSearch
        onChange={onChange}
        operations={['include', 'exclude']}
        filterOption={(inputValue, item) =>
          item.key!.indexOf(inputValue) !== -1 || item.type.indexOf(inputValue) !== -1
        }
        leftColumns={columns}
        rightColumns={columns}
        footer={renderFooter}
      />
      <Space style={{ marginTop: 16 }}>
      </Space>
    </>
  );
};

export default React.memo(TransferData);