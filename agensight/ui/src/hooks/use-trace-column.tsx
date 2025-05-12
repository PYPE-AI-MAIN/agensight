import { z } from "zod";
import { 
  ColumnDef, 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState
} from "@tanstack/react-table";
import React, { useState, useMemo } from "react";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";

export const toolCallSchema = z.object({
  args: z.record(z.string()),
  duration: z.number(),
  name: z.string(),
  output: z.string(),
  span_id: z.string()
});

export const spanSchema = z.object({
  duration: z.number(),
  end_time: z.number(),
  final_completion: z.string(),
  name: z.string(),
  span_id: z.string(),
  start_time: z.number(),
  tools_called: z.array(toolCallSchema)
});

export const schema = z.object({
  id: z.string().or(z.number()),
  name: z.string(),
  session_id: z.string(),
  started_at: z.string().or(z.number()),
  ended_at: z.string().or(z.number()),
  metadata: z.string(),
  spans: z.array(spanSchema).optional()
});

export type ToolCall = z.infer<typeof toolCallSchema>;
export type Span = z.infer<typeof spanSchema>;
export type TraceItem = z.infer<typeof schema>;

export function useTraceColumn(data: TraceItem[] | { data: TraceItem[]; columns: ColumnDef<TraceItem>[]; }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedTraces, setSelectedTraces] = useState<string[]>([]);

  // Define default columns
  const defaultColumns = useMemo<ColumnDef<TraceItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <div className="font-mono text-sm px-4 py-3">{row.getValue("id")}</div>,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium text-base px-4 py-3">{row.getValue("name")}</div>
        ),
      },
      {
        accessorKey: "session_id",
        header: "Session",
        cell: ({ row }) => (
          <div className="px-4 py-3">
            <Badge variant="outline" className="font-mono text-sm">
              {row.getValue("session_id")}
            </Badge>
          </div>
        ),
      },
      {
        id: "latency",
        header: "Latency",
        cell: ({ row }) => {
          try {
            const rowData = row.original;
            
            // Get the date strings directly from the original data
            const startStr = rowData.started_at;
            const endStr = rowData.ended_at;
            
            if (!startStr || !endStr) {
              return <div className="text-sm text-muted-foreground px-4 py-3">Missing data</div>;
            }
            
            // Parse dates using Date constructor
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return <div className="text-sm text-muted-foreground px-4 py-3">Invalid dates</div>;
            }
            
            const latencyMs = endDate.getTime() - startDate.getTime();
            
            if (latencyMs < 0) {
              return <div className="text-sm text-muted-foreground px-4 py-3">Invalid duration</div>;
            }
            
            // Format the latency based on its duration
            let formattedLatency;
            if (latencyMs < 1000) {
              formattedLatency = `${latencyMs}ms`;
            } else if (latencyMs < 60000) {
              formattedLatency = `${(latencyMs / 1000).toFixed(2)}s`;
            } else {
              const minutes = Math.floor(latencyMs / 60000);
              const seconds = Math.floor((latencyMs % 60000) / 1000);
              formattedLatency = `${minutes}m ${seconds}s`;
            }
            
            return (
              <div className="text-base font-medium px-4 py-3">
                {formattedLatency}
              </div>
            );
          } catch (e) {
            console.error("Latency calculation error:", e);
            return <div className="text-sm text-muted-foreground px-4 py-3">Error</div>;
          }
        },
      },
      {
        accessorKey: "metadata",
        header: "Metadata",
        cell: ({ row }) => {
          try {
            const metadata = JSON.parse(row.getValue("metadata"));
            // Only show at most 3 key metadata fields for a more compact display
            const priorityKeys = ["status", "priority", "user_id"];
            const keysToShow = Object.keys(metadata)
              .filter(key => priorityKeys.includes(key))
              .slice(0, 3);
            
            return (
              <div className="text-sm px-4 py-3">
                {keysToShow.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keysToShow.map((key) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {String(metadata[key])}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No priority metadata</div>
                )}
              </div>
            );
          } catch (e) {
            return <div className="text-xs text-muted-foreground px-4 py-3">Invalid metadata</div>;
          }
        },
      }
    ],
    []
  );

  // Handle both calling conventions: direct array or object with data and columns
  const tableData = Array.isArray(data) ? data : data.data;
  const tableColumns = Array.isArray(data) ? defaultColumns : data.columns;

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const toggleTraceSelection = (id: string) => {
    setSelectedTraces((prev) =>
      prev.includes(id)
        ? prev.filter((traceId) => traceId !== id)
        : [...prev, id]
    );
  };

  const clearSelectedTraces = () => {
    setSelectedTraces([]);
  };

  return {
    table,
    columns: tableColumns,
    selectedTraces,
    toggleTraceSelection,
    clearSelectedTraces,
  };
} 