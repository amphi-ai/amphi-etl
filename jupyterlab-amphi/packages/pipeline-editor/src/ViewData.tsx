import { StackedPanel } from '@lumino/widgets';
import { SessionContext } from '@jupyterlab/apputils';
import { KernelMessage } from '@jupyterlab/services';
import { PipelineService } from '@amphi/pipeline-components-manager';
import React from 'react';
import ReactDOM from 'react-dom';
import { gridAltIcon } from './icons'; // Re-using your icon
import { JSONModel } from '@lumino/datagrid'; // Just for type reference if needed
import { GridMouseEventArgs } from "@glideapps/glide-data-grid";
import { useLayer } from "react-laag";

// You can reuse the same "DataView" React component you already have,
// or simply include it inline below. For clarity, I'm showing an inline version.
// If you already have "DataView.tsx", just import it. We'll place it here for demonstration.
import "@glideapps/glide-data-grid/dist/index.css";
import {
    DataEditor,
    GridCell,
    GridCellKind,
    GridColumn,
    Item,
    SpriteMap
} from "@glideapps/glide-data-grid";


function DataView({ htmlData }: { htmlData: string }) {
    const [pixelRatio, setPixelRatio] = React.useState(() => window.devicePixelRatio);
    const [rowsData, setRowsData] = React.useState<any[]>([]);
    const [gridColumns, setGridColumns] = React.useState<GridColumn[]>([]);
    const [originalHeaders, setOriginalHeaders] = React.useState<string[]>([]);

    interface IBounds {
        left: number; top: number; width: number; height: number; right: number; bottom: number;
    }
    const zeroBounds: IBounds = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };

    const [tooltip, setTooltip] = React.useState<{ val: string; bounds: IBounds }>();
    const timeoutRef = React.useRef<number>(0);

    // clear pending timeout on unmount
    React.useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

    React.useEffect(() => {
        const handleResize = () => {
            if (window.devicePixelRatio !== pixelRatio) {
                setPixelRatio(window.devicePixelRatio);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [pixelRatio]);

    const getOptimalColumnWidth = (title: string): number => {
        // Approximate width (8px per char + 40px padding)
        return Math.min(Math.max(title.length * 8 + 40, 80), 200);
    };

    React.useEffect(() => {
        const { data, headers } = htmlToJson(htmlData);
        setOriginalHeaders(headers);

        // Clean up "<NA>"
        const cleanedData = data.map(row => {
            const cleanRow = { ...row };
            Object.keys(cleanRow).forEach(key => {
                if (cleanRow[key] === "<NA>" || cleanRow[key] === "null") {
                    cleanRow[key] = "";
                }
            });
            return cleanRow;
        });

        const updatedColumns: GridColumn[] = headers.map((header) => {
            if (!header.trim()) {
                return { title: header, width: getOptimalColumnWidth(header) };
            }
            // Attempt to parse for "ColumnName (Type)"
            const match = header.match(/^(.*?)\s*\((.*?)\)\s*$/);
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
                id: header,
                icon: dataType,
                width: getOptimalColumnWidth(cleanColumnName)
            };
        });

        setGridColumns(updatedColumns);
        setRowsData(cleanedData);
    }, [htmlData]);

    const onColumnResize = React.useCallback(
        (_column: GridColumn, newSize: number, colIndex: number) => {
            setGridColumns((prev) => {
                const updated = [...prev];
                updated[colIndex] = { ...updated[colIndex], width: newSize };
                return updated;
            });
        },
        []
    );

    const getCellContent = React.useCallback(
        ([col, row]: Item): GridCell => {
            if (row >= rowsData.length || col >= gridColumns.length) {
                return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false };
            }
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

    const onItemHovered = React.useCallback(
        (args: GridMouseEventArgs) => {
            if (args.kind !== "header") {
                window.clearTimeout(timeoutRef.current);
                setTooltip(undefined);
                return;
            }
            window.clearTimeout(timeoutRef.current);
            setTooltip(undefined);

            const col = args.location[0];
            timeoutRef.current = window.setTimeout(() => {
                if (col >= gridColumns.length) return;
                const raw = originalHeaders[col];
                const type = raw.match(/\((.+?)\)/)?.[1] ?? "string";
                const { x, y, width, height } = args.bounds;
                setTooltip({
                    val: type,
                    bounds: { left: x, top: y, width, height, right: x + width, bottom: y + height }
                });
            }, 800);         // delay (ms)
        },
        [gridColumns, originalHeaders]
    );

    // Create icons for header
    const headerIcons = React.useMemo<SpriteMap>(() => {
        return {
            string: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M3 16v-6a2 2 0 1 1 4 0v6" />
          <path d="M3 13h4" />
          <path d="M10 8v6a2 2 0 1 0 4 0v-1a2 2 0 1 0 -4 0v1" />
          <path d="M20.732 12a2 2 0 0 0 -3.732 1v1a2 2 0 0 0 3.726 1.01" />
        </svg>`,
            number: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M3 10l2 -2v8" />
          <path d="M9 8h3a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 0 -1 1v2
          a1 1 0 0 0 1 1h3" />
          <path d="M17 8h2.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-1.5
          h1.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-2.5" />
        </svg>`,
            decimal: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M17 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2z" />
          <path d="M10 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2z" />
          <path d="M5 16h.01" />
        </svg>`,
            datetime: (p) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="${p.bgColor}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2
          2 0 0 1 2 2v4" />
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

    const { renderLayer, layerProps } = useLayer({
        isOpen: !!tooltip,
        triggerOffset: 8,
        placement: "top-center",
        auto: true,
        trigger: { getBounds: () => tooltip?.bounds ?? zeroBounds }
    });

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>

            <DataEditor
                key={pixelRatio}
                columns={gridColumns}
                minColumnWidth={100}
                getCellContent={getCellContent}
                onItemHovered={onItemHovered}
                rows={rowsData.length}
                rowMarkers="both"
                onColumnResize={onColumnResize}
                smoothScrollX={false}
                smoothScrollY={false}
                experimental={{ strict: false, renderStrategy: "direct" }}
                headerIcons={headerIcons}
                getCellsForSelection={true}
                theme={React.useMemo(
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
            {tooltip &&
                renderLayer(
                    <div
                        {...layerProps}
                        style={{
                            ...layerProps.style,
                            padding: "8px 12px",
                            color: "#fff",
                            background: "rgba(0,0,0,0.85)",
                            fontFamily:
                                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
                            borderRadius: 7,
                            maxWidth: 280,
                            zIndex: 9999,
                            whiteSpace: "pre-wrap"
                        }}
                    >
                        {tooltip.val}
                    </div>
                )}
        </div>
    );
}

// Utility to parse HTML table into JSON rows & headers
function htmlToJson(htmlString: string): {
    data: Array<Record<string, string>>;
    headers: string[];
} {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Get all header cells and remove the first (index) column
    const allHeaderCells = Array.from(doc.querySelectorAll("table thead th"));
    const headers = allHeaderCells.slice(1).map(th => th.textContent?.trim() ?? "");

    // Process each row, skipping the first cell (index column)
    const rows = doc.querySelectorAll("table tbody tr");
    const data = Array.from(rows, (row) => {
        const cells = row.querySelectorAll("th, td");
        const rowObj: Record<string, string> = {};
        headers.forEach((header, idx) => {
            // Corresponding cell index is offset by 1 to skip the index column
            rowObj[header] = cells[idx + 1]?.textContent?.trim() ?? "";
        });
        return rowObj;
    });

    return { data, headers };
}

// Build a small lumino panel that renders the React DataView component
class DataViewPanel extends StackedPanel {
    constructor(htmlData: string) {
        super();
        this.id = 'datagrid-viewer';
        this.title.label = 'Data Browser';
        this.title.closable = true;
        this.title.icon = gridAltIcon;

        // Render the React component into this panel's DOM node
        ReactDOM.render(<DataView htmlData={htmlData} />, this.node);
    }
}

// Convert the "table" oriented JSON to an HTML string so our existing DataView can parse it
function modelToHTMLTable(jsonModel: any): string {
    // The "table" orient JSON has a "schema" and "data" array
    const fields = jsonModel.schema.fields; // typed column objects
    const tableRows = jsonModel.data;       // array of row objects

    // Construct <thead> with typed columns
    let thead = '<thead><tr>';
    for (const field of fields) {
        const headerTitle = field.name || '';
        thead += `<th>${headerTitle}</th>`;
    }
    thead += '</tr></thead>';

    // Construct <tbody>
    let tbody = '<tbody>';
    for (const row of tableRows) {
        tbody += '<tr>';
        for (const field of fields) {
            const colName = field.name;
            tbody += `<td>${row[colName] !== undefined ? row[colName] : ''}</td>`;
        }
        tbody += '</tr>';
    }
    tbody += '</tbody>';

    return `<table>${thead}${tbody}</table>`;
}

/**
 * Main entry point to view data with glide-data-grid
 */
export async function viewData(
    nodeId: string,
    context: any,
    commands: any,
    app: any
): Promise<void> {
    try {
        // Run pipeline until the node
        await commands.execute('pipeline-editor:run-pipeline-until', {
            nodeId: nodeId,
            context: context
        });

        // Retrieve node info
        const nodeJson = PipelineService.getNodeById(context.model.toString(), nodeId);
        const varName = nodeJson.data.nameId;
        if (!varName) {
            console.error('Variable name not found for the selected component.');
            return;
        }

        const kernel = context.sessionContext.session?.kernel;
        if (!kernel) {
            console.error('Kernel is not available.');
            return;
        }

        // Execute in kernel to get JSON "table" data
        const code = `_amphi_metadatapanel_getmatrixcontent(${varName}, 10000)`;
        const future = kernel.requestExecute({ code, stop_on_error: false, store_history: false });

        future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
            const msgType = msg.header.msg_type;
            if (msgType === 'execute_result') {
                const payload = msg.content as any;
                let content: string = payload.data['text/plain'] as string;
                // Clean up the escaping
                content = content.replace(/^'|'$/g, '');
                content = content.replace(/\\"/g, '"');
                content = content.replace(/\\'/g, "\\\\'");
                // Parse as JSON
                const modelOptions = JSON.parse(content);

                // Convert that to an HTML table with typed columns
                const htmlData = modelToHTMLTable(modelOptions);

                // Build and attach a React-based panel
                const panel = new DataViewPanel(htmlData);

                const logConsoleId = 'amphi-logConsole';
                let logConsolePanel = null;
                for (const widget of app.shell.widgets('main')) {
                    if (widget.id === logConsoleId) {
                        logConsolePanel = widget;
                        break;
                    }
                }

                // If console panel is open, show the panel as tab-after
                if (logConsolePanel && logConsolePanel.isAttached) {
                    if (!panel.isAttached) {
                        app.shell.add(panel, 'main', { ref: logConsolePanel.id, mode: 'tab-after' });
                    }
                } else {
                    // Otherwise, split-bottom
                    if (!panel.isAttached) {
                        app.shell.add(panel, 'main', { mode: 'split-bottom' });
                    }
                }
                app.shell.activateById(panel.id);
            } else if (msgType === 'error') {
                console.error("Kernel error on 'matrixQuery' call!");
            }
        };

        future.onReply = (_msg: KernelMessage.IExecuteReplyMsg) => { /* do nothing */ };
        future.onDone = () => { /* do nothing */ };

    } catch (error) {
        console.error('Error viewing data:', error);
    }
}