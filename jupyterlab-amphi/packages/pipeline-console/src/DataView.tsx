import React, { useState, useEffect } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/lib/table';

const DataView = ({ htmlData }: { htmlData: string }) => {
  const [dataSource, setDataSource] = useState<Array<Record<string, string>>>([]);
  const [columns, setColumns] = useState<ColumnsType<Record<string, string>>>([]);

  useEffect(() => {
    const { data, headers } = htmlToJson(htmlData);
    setDataSource(data);
    setColumns(headers.map((header, index) => {
      // Extract the type in parentheses at the end of the header
      const matches = header.match(/^(.*)\s\(([^)]+)\)$/); // Match pattern "ColumnName (type)"
      const columnName = matches ? matches[1] : header;
      const columnType = matches ? matches[2] : null;

      return {
        title: index === 0 ? '' : (
          <>
            <div style={{ whiteSpace: 'nowrap' }}>
              <div>{columnName}</div>
              {columnType && (
                <Tag style={{ fontSize: '10px', marginTop: '4px', color: '#5F9A97' }}>
                  {columnType}
                </Tag>
              )}
            </div>
          </>
        ),
        dataIndex: header,
        key: header,
        ...(index === 0 && { rowScope: 'row' }),
        ellipsis: true,
        render: (text: string) => (
          <div style={{
            fontSize: '12px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
            minWidth: '25px'
          }}>
            {text}
          </div>
        ),
      };
    }));
  }, [htmlData]);

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      scroll={{ x: 'max-content' }} // This enables horizontal scrolling
      style={{ fontSize: '12px', tableLayout: 'fixed', minWidth: '100%' }}
    />
  );
};

function htmlToJson(htmlString: string): { data: Array<Record<string, string>>, headers: Array<string> } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract headers from th inside thead, excluding the first one (index)
  let headers = Array.from(doc.querySelectorAll('table thead th')).slice(1).map(th => th.textContent?.trim() ?? "");

  const rows = doc.querySelectorAll('table tbody tr');
  const data = Array.from(rows, row => {
    const cells = row.querySelectorAll('th, td');
    const rowObj: Record<string, string> = {};

    // Capture the index from the first cell
    rowObj['index'] = cells[0].textContent?.trim() ?? "";

    // Map the rest of the cells to headers
    headers.forEach((header, idx) => {
      rowObj[header] = cells[idx + 1]?.textContent?.trim() ?? "";
    });

    return rowObj;
  });

  return { data, headers: ['index', ...headers] };  // Set the first header to empty string
}

export default DataView;
