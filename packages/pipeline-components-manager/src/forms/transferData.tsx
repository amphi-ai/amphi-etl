import { KernelMessage } from '@jupyterlab/services';
import difference from 'lodash/difference';
import React, { useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { RequestService } from '../RequestService';


import { Button, GetProp, Space, Table, TableColumnsType, TableProps, Tag, Transfer, TransferProps } from 'antd';
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
  inDialog: boolean;
}

export const TransferData: React.FC<TransferDataProps> = ({
  field, handleChange, defaultValue, context, componentService, commands, nodeId, inDialog
}) => {

  type TransferItem = GetProp<TransferProps, 'dataSource'>[number];
  type TableRowSelection<T extends object> = TableProps<T>['rowSelection'];

  interface RecordType {
    value: string;
    disabled: boolean;
    type: string;
  }

  interface DataType {
    value: string;
    disabled: boolean;
    type: string;
  }

  interface TableTransferProps extends TransferProps<TransferItem> {
    dataSource: DataType[];
    leftColumns: TableColumnsType<DataType>;
    rightColumns: TableColumnsType<string[]>;
  }

  interface DragItem {
    type: string;
    index: number;
  }

  const DragableBodyRow = ({ index, rowDrop, className, style, ...restProps }) => {
    const ref = React.useRef();
    const [{ isOver, dropClassName }, drop] = useDrop({
      accept: 'DragableBodyRow',
      collect: (monitor) => {
        const item = monitor.getItem() as DragItem; // Cast to DragItem
        if (item && item.index === index) {
          return {};
        }
        return {
          isOver: monitor.isOver(),
          dropClassName: item && item.index < index ? ' drop-over-downward' : ' drop-over-upward',
        };
      },
      drop: (item: DragItem) => {
        rowDrop(item.index, index);
      },
    });

    const [, drag] = useDrag<DragItem>({
      type: 'DragableBodyRow',
      item: { type: 'DragableBodyRow', index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    drop(drag(ref));

    return (
      <tr
        ref={ref}
        className={`${className}${isOver ? dropClassName : ''} draggable`}
        style={{ cursor: 'move', ...style }}
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
        onItemSelectAll,
        onItemSelect,
        selectedKeys: listSelectedKeys,
        disabled: listDisabled,
      }) => {
        const columns = direction === 'left' ? leftColumns : rightColumns;
        const displayType = direction === 'right' ? 'target' : 'source';

        const rowSelection: TableRowSelection<TransferItem> = {
          getCheckboxProps: (item) => ({ disabled: listDisabled || item.disabled }),
          onSelectAll(selected, selectedRows) {
            const treeSelectedKeys = selectedRows
              .filter((item) => !item.disabled)
              .map(({ key }) => key);
            const diffKeys = selected
              ? difference(treeSelectedKeys, listSelectedKeys)
              : difference(listSelectedKeys, treeSelectedKeys);
            onItemSelectAll(diffKeys as string[], selected);
          },
          onSelect({ key }, selected) {
            onItemSelect(key as string, selected);
          },
          selectedRowKeys: listSelectedKeys,
        };

        if (displayType === 'source') {
          return (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredItems}
              size="small"
              style={{ pointerEvents: listDisabled ? 'none' : undefined }}
              onRow={({ key, disabled: itemDisabled }) => ({
                onClick: () => {
                  if (itemDisabled || listDisabled) return;
                  onItemSelect(key as string, !listSelectedKeys.includes(key as string));
                },
              })}
            />
          );
        } else {
          const rowDrop = (dragIndex, hoverIndex) => {
            let newKeys = [...targetKeys];
            const dragRow = newKeys[dragIndex];
            // remove existing drag item from it's place
            newKeys.splice(dragIndex, 1);
            // insert drag into new place
            newKeys.splice(hoverIndex, 0, dragRow);
            // update state
            onChange(newKeys, direction, newKeys);
          };

          return (
            <DndProvider backend={HTML5Backend}>
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
                style={{ pointerEvents: listDisabled ? 'none' : undefined }}
                onRow={({ key }, idx) => ({
                  index: idx,
                  rowDrop,
                  onClick: () => {
                    onItemSelect(key, !listSelectedKeys.includes(key));
                  }
                })}
              />
            </DndProvider>

          );
        }
      }}
    </Transfer>
  );

  
  const [sourceData, setSourceData] = useState<RecordType[]>([]);
  const [targetKeys, setTargetKeys] = useState<React.Key[]>([]);
  const [loadings, setLoadings] = useState<boolean>();

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

  const leftTableColumns: TableColumnsType<DataType> = [
    {
      dataIndex: 'value',
      title: 'Column',
    },
    {
      dataIndex: 'type',
      title: 'Type',
      render: (type) => <Tag>{type}</Tag>,
    },
  ];

  const rightTableColumns: TableColumnsType<string[]> = [
    {
      dataIndex: 'value',
      title: 'Column'
    }
  ];

  const onChange: TransferProps['onChange'] = (newTargetKeys, direction, moveKeys) => {
    console.log(newTargetKeys, direction, moveKeys);
    setTargetKeys(newTargetKeys);
    const savedSchema = { sourceData: sourceData, targetKeys: newTargetKeys }
    handleChange(savedSchema, field.id);
  };

  const renderFooter: TransferProps['footer'] = (_, info) => {
    if (info?.direction === 'left') {
      return (
        <Button type="primary" size="small" style={{ float: 'left', margin: 5 }} onClick={(event) => RequestService.retrieveColumns(
          event,
          context,
          commands,
          componentService,
          setSourceData,
          setLoadings,
          nodeId,
          1
        )}
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
        leftColumns={leftTableColumns}
        rightColumns={rightTableColumns}
        footer={renderFooter}
      />
      <Space style={{ marginTop: 16 }}>
      </Space>
    </>
  );
};

export default TransferData;