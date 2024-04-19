import React, { useState, useEffect } from 'react';
import { Table } from 'antd';

const DataView = ({ htmlData }: { htmlData: string }) => {
  const [dataSource, setDataSource] = useState<Array<Record<string, string>>>([]);
  const [columns, setColumns] = useState<Array<{ title: string, dataIndex: string, key: string }>>([]);

  useEffect(() => {
    const { data, headers } = htmlToJson(htmlData);
    setDataSource(data);
    setColumns(headers.map((header) => ({
      title: header,
      dataIndex: header,
      key: header
    })));
  }, [htmlData]);

  return <Table dataSource={dataSource} columns={columns} pagination={false} size="small"/>;
};

function htmlToJson(htmlString: string): { data: Array<Record<string, string>>, headers: Array<string> } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
  
    // Extract headers from both th inside thead
    let headers = Array.from(doc.querySelectorAll('table thead th')).map(th => th.textContent?.trim() ?? "");
  
    const rows = doc.querySelectorAll('table tbody tr');
    const data = Array.from(rows, (row, rowIndex) => {
      // Gather all cells, including th for indexing
      const cells = row.querySelectorAll('th, td');
      const rowObj: Record<string, string> = { index: rowIndex.toString() }; // Add the row index
  
      // Decide how to map cells to headers based on their count
      if (cells.length === headers.length) {
        // Headers align directly with cells
        cells.forEach((cell, idx) => {
          rowObj[headers[idx]] = cell.textContent?.trim() ?? "";
        });
      } else if (cells.length === headers.length + 1) {
        // There is an extra th for indexing; prepend an empty header name for it
        ['', ...headers].forEach((header, idx) => {
          rowObj[header] = cells[idx].textContent?.trim() ?? "";
        });
      } else {
        // Fallback to use only td elements if counts are mismatched
        const tds = row.querySelectorAll('td');
        headers.forEach((header, idx) => {
          rowObj[header] = tds[idx]?.textContent?.trim() ?? "";
        });
      }
      return rowObj;
    });
  
    return { data, headers };
  }
  

export default DataView;
