import React, { useState, useEffect } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/lib/table';


const DataView = ({ htmlData }: { htmlData: string }) => {
  const [dataSource, setDataSource] = useState<Array<Record<string, string>>>([]);
  const [columns, setColumns] = useState<ColumnsType<Record<string, string>>>([]);

  useEffect(() => {
    console.log("DATA %o", htmlData);

    const { data, headers } = htmlToJson(htmlData);
    setDataSource(data);
    setColumns(headers.map((header, index) => ({
      title: index === 0 ? '' : header,  // Set the index column title to empty string
      dataIndex: header,
      key: header,
      ...(index === 0 && { rowScope: 'row' })  // Add rowScope for the first column
    })));
  }, [htmlData]);

  return <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />;
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
