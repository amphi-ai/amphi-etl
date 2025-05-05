import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "@glideapps/glide-data-grid/dist/index.css";
import {
  DataEditor,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  SpriteMap,
  GridMouseEventArgs,
} from "@glideapps/glide-data-grid";
import { useLayer, Arrow } from "react-laag";

interface DataRow {
  [key: string]: string;
}

// Interface for tooltip bounds
interface IBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

// Empty bounds for initialization
const zeroBounds: IBounds = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  right: 0,
  bottom: 0
};

const DataView = ({ htmlData }: { htmlData: string }) => {
  const [pixelRatio, setPixelRatio] = useState(() => window.devicePixelRatio);
  const [rowsData, setRowsData] = useState<DataRow[]>([]);
  const [gridColumns, setGridColumns] = useState<GridColumn[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ val: string; bounds: IBounds } | undefined>();
  const timeoutRef = useRef<number>(0);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.devicePixelRatio !== pixelRatio) {
        setPixelRatio(window.devicePixelRatio);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pixelRatio]);

  // Clean up tooltip timeout on unmount
  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

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
        else if (colType.includes("bool")) dataType = "boolean";
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

  // Function to get accurate bounds relative to viewport
  const getAbsoluteBounds = (bounds: DOMRect): IBounds => {
    return {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      right: bounds.left + bounds.width,
      bottom: bounds.top + bounds.height
    };
  };

  // Tooltip handler for cell hover with fixed positioning
  const onItemHovered = useCallback((args: GridMouseEventArgs) => {
    if (args.kind !== "header") {
      window.clearTimeout(timeoutRef.current);
      setTooltip(undefined);
      return;
    }

    window.clearTimeout(timeoutRef.current);
    setTooltip(undefined);

    const col = args.location[0];              // column index

    timeoutRef.current = window.setTimeout(() => {
      if (col >= gridColumns.length) return;

      const rawHeader = originalHeaders[col];  // e.g. "price (decimal32)"
      const typeMatch = rawHeader.match(/\((.+?)\)/);
      const fullType = typeMatch ? typeMatch[1] : "string";

      const { x, y, width, height } = args.bounds;  // header bounds

      setTooltip({
        val: fullType,                           // show only the type
        bounds: {
          left: x,
          top: y,                                // anchor: top of header
          width,
          height,
          right: x + width,
          bottom: y + height
        }
      });
    }, 1000);                                     // quicker reveal
  }, [gridColumns, originalHeaders]);

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
      </svg>`,

      boolean: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
      viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2" 
      stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 3v18" />
        <path d="M12 14l7 -7" />
        <path d="M12 19l8.5 -8.5" />
        <path d="M12 9l4.5 -4.5" />
      </svg>`
    };
  }, []);

  // Set up react-laag for tooltip rendering with improved positioning
  const isOpen = tooltip !== undefined;
  const { renderLayer, layerProps } = useLayer({
    isOpen: tooltip !== undefined,
    triggerOffset: 8,
    placement: "top-center",
    possiblePlacements: ["top-center", "bottom-center", "left-center", "right-center"],
    auto: true,
    containerOffset: 16,
    trigger: {
      getBounds: () => tooltip?.bounds ?? zeroBounds
    }
  });

  return (
    <div ref={gridContainerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <DataEditor
        key={pixelRatio}
        columns={gridColumns}
        minColumnWidth={100}
        getCellContent={getCellContent}
        rows={rowsData.length}
        rowMarkers="none"
        onColumnResize={onColumnResize}
        onItemHovered={onItemHovered}
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
            accentColor: "#5f9b97",
            accentLight: "#edf4f3",
            bgHeaderHovered: "#edf4f3",
            bgBubbleSelected: "#edf4f3",
            bgHeader: "#fafafa",
            bgIconHeader: "#5F9B97"
          }),
          []
        )}
      />
      {isOpen &&
        renderLayer(
          <div
            {...layerProps}
            style={{
              ...layerProps.style,
              padding: "8px 12px",
              color: "white",
              font: "500 13px Inter",
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
              borderRadius: 7,
              maxWidth: "300px",
              wordBreak: "break-word",
              zIndex: 9999
            }}
          >
            {tooltip?.val}
          </div>
        )}
    </div>
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