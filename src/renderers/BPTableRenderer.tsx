import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Table2, Column, Cell } from '@blueprintjs/table';
import { Button, InputGroup, NonIdealState } from '@blueprintjs/core';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { generateColumnsFromSchema, type TableColumn } from '../table/columns/fromSchema';
import { getNestedValue, setNestedValue } from '../table/utils/nestedValue';
import { useDebouncedAutosave } from '../table/hooks/useDebouncedAutosave';
import { useListDraftsQuery } from '../store/api';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { useDescriptorOptionsForColumns } from '../hooks/useDescriptorOptions';
import { TextCell } from '../table/editors/TextCell';
import { NumberCell } from '../table/editors/NumberCell';
import { CheckboxCell } from '../table/editors/CheckboxCell';
import { SelectCell } from '../table/editors/SelectCell';
import '@blueprintjs/table/lib/css/table.css';

interface RowData {
  id: string;
  content: Record<string, unknown>;
}

export default function BPTableRenderer({ schema, uischema, setupId, schemaKey }: TableViewProps) {
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<RowData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Snapshot for rollback
  const draftsRef = useRef<RowData[]>([]);

  // Resolve schema ID from schema key
  useEffect(() => {
    if (!setupId || !schemaKey) return;
    let mounted = true;
    (async () => {
      const id = await resolveSchemaIdByKey(setupId, schemaKey);
      if (mounted) setSchemaId(id);
    })();
    return () => {
      mounted = false;
    };
  }, [setupId, schemaKey]);

  // Fetch drafts using RTK Query
  const { data: drafts, error, isLoading } = useListDraftsQuery(
    { setupId: setupId || '', schemaId: schemaId || undefined },
    { skip: !setupId || !schemaId }
  );

  // Update local rows when drafts change
  useEffect(() => {
    if (drafts) {
      const rows = drafts
        .map((d) => ({ id: d.id == null ? '' : String(d.id), content: d.content as Record<string, unknown> }))
        .filter((r) => !!r.id);
      draftsRef.current = rows;
      setLocalRows(rows);
    }
  }, [drafts]);

  // Generate columns from schema
  const tableColumns = useMemo<TableColumn[]>(() => {
    return generateColumnsFromSchema(schema as Record<string, unknown>, uischema as Record<string, unknown>);
  }, [schema, uischema]);

  // Identify descriptor columns
  const descriptorColumns = useMemo(() => {
    return tableColumns.filter((col) => {
      const last = col.path[col.path.length - 1];
      return last && /DescriptorId$/i.test(last);
    });
  }, [tableColumns]);

  const descriptorPropertyNames = useMemo(() => {
    const names = descriptorColumns
      .map((col) => col.path[col.path.length - 1]?.replace(/Id$/i, ''))
      .filter((n): n is string => !!n);
    return Array.from(new Set(names));
  }, [descriptorColumns]);

  // Load descriptor options
  const { map: descriptorOptionsMap } = useDescriptorOptionsForColumns(setupId, schemaKey, descriptorPropertyNames);

  // Merge descriptor options into columns
  const enrichedColumns = useMemo<TableColumn[]>(() => {
    return tableColumns.map((c) => {
      const path = c.path;
      const last = path[path.length - 1]?.replace(/Id$/i, '');
      const opts = last && descriptorOptionsMap?.[last]?.length ? descriptorOptionsMap[last] : c.enumValues;
      return { ...c, enumValues: opts };
    });
  }, [tableColumns, descriptorOptionsMap]);

  // Rollback handler
  const handleRollback = (rowId: string) => {
    const original = draftsRef.current.find((r) => r.id === rowId);
    if (original) {
      setLocalRows((prev) => prev.map((r) => (r.id === rowId ? { ...original } : r)));
    }
  };

  // Debounced autosave hook
  const { queueSave } = useDebouncedAutosave({
    setupId,
    schemaId: schemaId || undefined,
    debounceMs: 700,
    onRollback: handleRollback,
  });

  // Cell change handler
  const handleCellChange = useCallback((rowId: string, path: string[], value: unknown) => {
    setLocalRows((prev) => {
      const rowIndex = prev.findIndex((r) => r.id === rowId);
      if (rowIndex === -1) return prev;

      const updatedRows = [...prev];
      const updatedRow = { ...updatedRows[rowIndex] };
      const updatedContent = JSON.parse(JSON.stringify(updatedRow.content));
      
      setNestedValue(updatedContent, path, value);
      updatedRow.content = updatedContent;
      updatedRows[rowIndex] = updatedRow;

      // Queue autosave
      queueSave(rowId, updatedContent);

      return updatedRows;
    });
  }, [queueSave]);

  // Create TanStack table columns
  const columnHelper = createColumnHelper<RowData>();
  const columns = useMemo<ColumnDef<RowData, unknown>[]>(() => {
    return enrichedColumns.map((col) => {
      return columnHelper.accessor(
        (row) => getNestedValue(row.content, col.path),
        {
          id: col.key,
          header: col.title,
          cell: (info) => {
            const rowId = info.row.original.id;
            const value = info.getValue();

            const handleChange = (newValue: unknown) => {
              handleCellChange(rowId, col.path, newValue);
            };

            // Handle non-primitive values (objects, arrays) with monospace font
            if (value !== null && typeof value === 'object') {
              return (
                <span 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '11px',
                    color: 'var(--bp5-text-color-muted)',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={JSON.stringify(value)}
                >
                  {JSON.stringify(value)}
                </span>
              );
            }

            // Render appropriate editor based on column type
            if (col.type === 'boolean') {
              return <CheckboxCell value={value as boolean} onChange={handleChange} />;
            } else if (col.type === 'number') {
              return (
                <div style={{ textAlign: 'right', paddingRight: '8px' }}>
                  <NumberCell value={value as number | null} onChange={handleChange} />
                </div>
              );
            } else if (col.type === 'enum' || col.enumValues?.length) {
              const last = col.path[col.path.length - 1];
              return (
                <SelectCell
                  value={value as string}
                  onChange={handleChange}
                  options={col.enumValues}
                  setupId={setupId}
                  schemaKey={schemaKey}
                  propertyName={last}
                />
              );
            } else {
              // Check if this is a descriptor field (ends with DescriptorId)
              const last = col.path[col.path.length - 1];
              const isDescriptorField = last && /DescriptorId$/i.test(last);
              
              if (isDescriptorField) {
                return (
                  <SelectCell
                    value={value as string}
                    onChange={handleChange}
                    options={col.enumValues}
                    setupId={setupId}
                    schemaKey={schemaKey}
                    propertyName={last}
                  />
                );
              }
              
              return <TextCell value={value as string} onChange={handleChange} />;
            }
          },
        }
      );
    });
  }, [enrichedColumns, columnHelper, setupId, schemaKey, handleCellChange]);

  // Create TanStack table instance
  const table = useReactTable({
    data: localRows,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchTerm,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearchTerm,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  // Render loading/error states
  if (isLoading) {
    return <NonIdealState icon="time" title="Loading..." description="Loading drafts..." />;
  }
  if (error) {
    return <NonIdealState icon="error" title="Error" description="Failed to load drafts. Please try again." />;
  }
  if (!localRows.length) {
    return <NonIdealState icon="inbox" title="No items" description="No drafts found for this container." />;
  }

  const rows = table.getRowModel().rows;
  const columnHeaders = table.getHeaderGroups()[0]?.headers || [];

  return (
    <div className="content-padding" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <InputGroup
          leftIcon="search"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          small
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--bp5-text-color-muted)' }}>{localRows.length} items</span>
          <Button small icon="plus" text="New" onClick={() => window.dispatchEvent(new CustomEvent('table-new-request'))} />
        </div>
      </div>

      <div style={{ 
        flexGrow: 1, 
        minHeight: 400,
        border: '1px solid var(--bp5-border-color)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <style>{`
          .bp-table-renderer .bp5-table-container {
            background: var(--bp5-surface-background);
          }
          .bp-table-renderer .bp5-table-header {
            background: var(--bp5-surface-background-hover);
            border-bottom: 2px solid var(--bp5-border-color);
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .bp-table-renderer .bp5-table-cell {
            padding: 8px 12px;
            border-right: 1px solid var(--bp5-divider-color);
            font-size: 13px;
          }
          .bp-table-renderer .bp5-table-row-cell:last-child {
            border-right: none;
          }
          .bp-table-renderer .bp5-table-body .bp5-table-row:nth-child(even) {
            background: var(--bp5-surface-background-hover);
          }
          .bp-table-renderer .bp5-table-body .bp5-table-row:hover {
            background: var(--bp5-background-color-hover);
            cursor: pointer;
          }
          .bp-table-renderer .bp5-table-column-name {
            padding: 10px 12px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        `}</style>
        <div className="bp-table-renderer">
          <Table2
            numRows={rows.length}
            enableRowHeader={false}
            enableColumnResizing
            defaultRowHeight={36}
            enableGhostCells={false}
            enableFocusedCell={false}
          >
            {columnHeaders.map((header) => (
              <Column
                key={header.id}
                name={header.column.columnDef.header as string}
                cellRenderer={(rowIndex) => {
                  const row = rows[rowIndex];
                  if (!row) return <Cell />;
                  const cell = row.getVisibleCells().find((c) => c.column.id === header.id);
                  if (!cell) return <Cell />;
                  
                  // Render the cell using TanStack's cell render function
                  const cellDef = cell.column.columnDef.cell;
                  const renderedContent = typeof cellDef === 'function' 
                    ? cellDef(cell.getContext())
                    : cell.getValue();
                  
                  return <Cell>{renderedContent as React.ReactNode}</Cell>;
                }}
              />
            ))}
          </Table2>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button
          small
          icon="chevron-left"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        />
        <span style={{ fontSize: 12 }}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button
          small
          icon="chevron-right"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        />
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          style={{ marginLeft: 8 }}
        >
          {[10, 25, 50, 100].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
