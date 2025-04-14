import React, { useState, useEffect, useCallback, useMemo } from "react";
import "@glideapps/glide-data-grid/dist/index.css";
import {
  DataEditor,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  SpriteMap
} from "@glideapps/glide-data-grid";

interface DataRow {
  [key: string]: string;
}

const DataView = ({ htmlData }: { htmlData: string }) => {
  const [pixelRatio, setPixelRatio] = useState(() => window.devicePixelRatio);
  const [rowsData, setRowsData] = useState<DataRow[]>([]);
  const [gridColumns, setGridColumns] = useState<GridColumn[]>([]);
  // Store the original header names for data mapping
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.devicePixelRatio !== pixelRatio) {
        setPixelRatio(window.devicePixelRatio);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pixelRatio]);

  // Calculate optimal column width based on header content
  const getOptimalColumnWidth = (title: string): number => {
    // Approximate width calculation - each character is roughly 8px wide in standard font
    // Add 40px for padding and icon
    const estimatedWidth = Math.min(Math.max(title.length * 8 + 40, 100), 200);
    return estimatedWidth;
  };

  // Convert HTML table to JSON
  useEffect(() => {
    const { data, headers } = htmlToJson(htmlData);
    setOriginalHeaders(headers);

    // Clean up "<NA>" values
    const cleanedData = data.map(row => {
      const cleanRow = { ...row };
      Object.keys(cleanRow).forEach(key => {
        if (cleanRow[key] === "<NA>") {
          cleanRow[key] = "";
        }
      });
      return cleanRow;
    });

    // Build columns, extracting only the column name part and guessing icons from type
    const updatedColumns: GridColumn[] = headers.map((header) => {
      // If header is empty, return no icon
      if (!header.trim()) {
        return {
          title: header,
          width: getOptimalColumnWidth(header)
        };
      }
      
      const match = header.match(/^(.*?)\s*\((.*?)\)\s*$/);
      
      // Extract clean column name (without type) and type for the icon
      let cleanColumnName = header;
      let dataType = "string";
      
      if (match) {
        cleanColumnName = match[1].trim();
        const colType = match[2].trim().toLowerCase();
        
        if (colType.includes("int")) dataType = "number";
        else if (colType.includes("float") || colType.includes("decimal")) dataType = "decimal";
        else if (colType.includes("date") || colType.includes("time")) dataType = "datetime";
      }

      return {
        title: cleanColumnName,
        id: header, // Keep original header as ID for data mapping
        icon: dataType,
        width: getOptimalColumnWidth(cleanColumnName)
      };
    });

    setGridColumns(updatedColumns);
    setRowsData(cleanedData);
  }, [htmlData]);

  const onColumnResize = useCallback(
    (_column: GridColumn, newSize: number, colIndex: number) => {
      setGridColumns((prev) => {
        const updated = [...prev];
        updated[colIndex] = { ...updated[colIndex], width: newSize };
        return updated;
      });
    },
    []
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      if (row >= rowsData.length || col >= gridColumns.length) {
        return {
          kind: GridCellKind.Text,
          data: "",
          displayData: "",
          allowOverlay: false
        };
      }

      // Use the original header (with type) to access the data
      const columnKey = originalHeaders[col];
      const value = rowsData[row][columnKey] ?? "";

      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: value,
        allowOverlay: false
      };
    },
    [gridColumns, rowsData, originalHeaders]
  );

  // Create icons using bgColor and fgColor properties
  const headerIcons = useMemo<SpriteMap>(() => {
    return {
      string: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 16v-6a2 2 0 1 1 4 0v6" />
        <path d="M3 13h4" />
        <path d="M10 8v6a2 2 0 1 0 4 0v-1a2 2 0 1 0 -4 0v1" />
        <path d="M20.732 12a2 2 0 0 0 -3.732 1v1a2 2 0 0 0 3.726 1.01" />
      </svg>`,

      number: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 10l2 -2v8" />
        <path d="M9 8h3a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h3" />
        <path d="M17 8h2.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-2.5" />
      </svg>`,

      decimal: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M17 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2z" />
        <path d="M10 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2z" />
        <path d="M5 16h.01" />
      </svg>`,

      datetime: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4" />
        <path d="M18 18m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
        <path d="M15 3v4" />
        <path d="M7 3v4" />
        <path d="M3 11h16" />
        <path d="M18 16.496v1.504l1 1" />
      </svg>`
    };
  }, []);

  return (
    <DataEditor
      key={pixelRatio}
      columns={gridColumns}
      minColumnWidth={100}
      getCellContent={getCellContent}
      rows={rowsData.length}
      rowMarkers="none"
      onColumnResize={onColumnResize}
      smoothScrollX={false}
      smoothScrollY={false}
      experimental={{ strict: false, renderStrategy: "direct" }}
      headerIcons={headerIcons}
      getCellsForSelection={true}
      theme={useMemo(
        () => ({
          baseFontStyle: "0.8125rem",
          headerFontStyle: "600 0.8125rem",
          editorFontSize: "0.8125rem",
          accentColor: "#5F9B97",
          bgHeader: "#FBFAFB",
          bgIconHeader: "#5F9B97" // Sets the icon background
        }),
        []
      )}
    />
  );
};

function htmlToJson(htmlString: string): {
  data: Array<Record<string, string>>;
  headers: string[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // Get all headers (don't skip the index column anymore)
  const allHeaderCells = Array.from(doc.querySelectorAll("table thead th"));
  const headers = allHeaderCells.map((th) => th.textContent?.trim() ?? "");

  const dataHeaders = headers;

  // For each row in <tbody>, map cells to headers, skipping the first cell (index)
  const rows = doc.querySelectorAll("table tbody tr");
  const data = Array.from(rows, (row) => {
    const cells = row.querySelectorAll("th, td");
    const rowObj: Record<string, string> = {};

    // Map each header to its corresponding cell, skip the first cell (index)
    dataHeaders.forEach((header, idx) => {
      rowObj[header] = cells[idx]?.textContent?.trim() ?? "";
    });

    return rowObj;
  });

  return { data, headers: dataHeaders };
}

export default DataView;