import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, InputGroup, NonIdealState, Intent, Position, Toaster } from '@blueprintjs/core';
import { flattenSchemaToColumns, orderColumnsByUISchema } from '../core/schemaTools';
import { useDescriptorOptions } from '../hooks/useDescriptorOptions';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import BooleanCellEditor from './table/BooleanCellEditor';
import SelectCellEditor from './table/SelectCellEditor';
import NumberCellEditor from './table/NumberCellEditor';
import StringCellEditor from './table/StringCellEditor';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface OptionItem { label: string; value: string }

interface ColumnDef {
  key: string;
  title: string;
  path: string[];
  type: string;
  enumValues?: Array<string | OptionItem>;
}

interface RowData {
  id: string;
  content: Record<string, unknown>;
}

const toaster = Toaster.create({ position: Position.TOP });

function log(...args: unknown[]) {
  console.debug('[Table]', ...args);
}

export default function TableRenderer({ rows, schema, uischema, onSaveRow, setupId, schemaKey }: TableViewProps) {
  const [localRows, setLocalRows] = useState<RowData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const gridRef = useRef<AgGridReact>(null);

  // Track changes that need to be saved
  const pendingChangesRef = useRef<Map<string, { content: Record<string, unknown>; timestamp: number }>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    log('mount');
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync rows to local state
  useEffect(() => {
    const typedRows = Array.isArray(rows) ? (rows as unknown as RowData[]) : [];
    log('Rows synced to local state:', typedRows.length, 'rows');
    setLocalRows(typedRows);
  }, [rows]);

  // Extract columns from schema
  const columns = useMemo(() => {
    const cols = flattenSchemaToColumns(schema).map(col => ({
      key: col.key,
      title: col.title,
      path: col.path || [col.key],
      type: col.type,
      enumValues: col.enumValues,
    }));
    const ordered = orderColumnsByUISchema(cols, uischema);
    log('Columns extracted:', ordered.length, 'columns', ordered.map(c => c.key));
    return ordered;
  }, [schema, uischema]);

  // Identify descriptor columns (columns ending with DescriptorId)
  const descriptorColumns = useMemo(() => {
    return columns.filter(col => {
      const last = col.path && col.path.length > 0 ? col.path[col.path.length - 1] : undefined;
      return last && /DescriptorId$/i.test(last);
    });
  }, [columns]);

  // Use hook to load descriptor options for each descriptor column
  // We'll collect all the hook results and merge them into columnOptions
  // Note: We need to call hooks unconditionally, so we'll use a fixed approach
  const descriptorColumn0 = descriptorColumns[0];
  const descriptorColumn1 = descriptorColumns[1];
  const descriptorColumn2 = descriptorColumns[2];
  
  const descriptor0Options = useDescriptorOptions(
    setupId,
    schemaKey,
    descriptorColumn0 && descriptorColumn0.path && descriptorColumn0.path.length > 0
      ? descriptorColumn0.path[descriptorColumn0.path.length - 1]?.replace(/Id$/i, '')
      : undefined
  );
  
  const descriptor1Options = useDescriptorOptions(
    setupId,
    schemaKey,
    descriptorColumn1 && descriptorColumn1.path && descriptorColumn1.path.length > 0
      ? descriptorColumn1.path[descriptorColumn1.path.length - 1]?.replace(/Id$/i, '')
      : undefined
  );
  
  const descriptor2Options = useDescriptorOptions(
    setupId,
    schemaKey,
    descriptorColumn2 && descriptorColumn2.path && descriptorColumn2.path.length > 0
      ? descriptorColumn2.path[descriptorColumn2.path.length - 1]?.replace(/Id$/i, '')
      : undefined
  );

  // merge in options into columns for rendering
  const renderedColumns = useMemo(() => {
    return columns.map(c => {
      // Check if this is a descriptor column and if we have options for it
      let opts = c.enumValues;
      
      if (descriptorColumn0 && c.key === descriptorColumn0.key && descriptor0Options.options.length > 0) {
        opts = descriptor0Options.options;
      } else if (descriptorColumn1 && c.key === descriptorColumn1.key && descriptor1Options.options.length > 0) {
        opts = descriptor1Options.options;
      } else if (descriptorColumn2 && c.key === descriptorColumn2.key && descriptor2Options.options.length > 0) {
        opts = descriptor2Options.options;
      }
      
      return { ...c, enumValues: opts } as ColumnDef;
    });
  }, [columns, descriptorColumn0, descriptorColumn1, descriptorColumn2, descriptor0Options.options, descriptor1Options.options, descriptor2Options.options]);

  const handleCellChange = useCallback((rowId: string, path: string[], value: unknown) => {
    // Get the current row state before update
    const currentRow = localRows.find(r => r.id === rowId);
    if (!currentRow) return;

    // Optimistic update
    const updatedContent = { ...currentRow.content };
    setNestedValue(updatedContent, path, value);
    
    setLocalRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, content: updatedContent };
    }));

    // Track this change for debounced save
    pendingChangesRef.current.set(rowId, {
      content: updatedContent,
      timestamp: Date.now(),
    });

    // Clear existing timeout and set a new one
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Process all pending saves
      const toSave = Array.from(pendingChangesRef.current.entries());
      if (toSave.length === 0) return;

      // Clear the pending changes
      pendingChangesRef.current.clear();

      // Save each changed row
      for (const [saveRowId, { content: saveContent }] of toSave) {
        log('autosave', saveRowId);
        const result = await onSaveRow(saveRowId, saveContent);

        if (!result.ok) {
          // Revert on error
          toaster.show({
            message: `Save failed for ${saveRowId}: ${result.error || 'Unknown error'}`,
            intent: Intent.DANGER,
            timeout: 3000,
          });
          
          // Revert to original row content
          const originalRow = rows.find(r => (r as unknown as RowData).id === saveRowId) as unknown as RowData | undefined;
          if (originalRow) {
            setLocalRows(prev => prev.map(r => r.id === saveRowId ? originalRow : r));
            // Also refresh the grid
            if (gridRef.current?.api) {
              gridRef.current.api.refreshCells({ force: true });
            }
          }
        }
      }
    }, 700); // 700ms debounce
  }, [localRows, onSaveRow, rows]);

  // Convert to ag-grid column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    return renderedColumns.map(col => {
      const colDef: ColDef = {
        field: col.key,
        headerName: col.title,
        sortable: true,
        filter: true,
        editable: true,
        valueGetter: (params) => {
          if (!params.data) return undefined;
          return getNestedValue(params.data.content, col.path);
        },
        valueSetter: (params) => {
          if (!params.data) return false;
          const updatedContent = { ...params.data.content };
          setNestedValue(updatedContent, col.path, params.newValue);
          params.data.content = updatedContent;
          handleCellChange(params.data.id, col.path, params.newValue);
          return true;
        },
      };

      // Set appropriate cell editor based on column type
      if (col.type === 'boolean') {
        colDef.cellEditor = BooleanCellEditor;
        colDef.cellRenderer = (params: { value: unknown }) => {
          return params.value ? '✓' : '';
        };
      } else if (col.enumValues && col.enumValues.length > 0) {
        colDef.cellEditor = SelectCellEditor;
        colDef.cellEditorParams = { enumValues: col.enumValues };
      } else if (col.type === 'number') {
        colDef.cellEditor = NumberCellEditor;
      } else {
        colDef.cellEditor = StringCellEditor;
      }

      return colDef;
    });
  }, [renderedColumns, handleCellChange]);

  // Apply quick filter when search term changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchTerm);
    }
  }, [searchTerm]);

  if (localRows.length === 0) {
    return <NonIdealState icon="inbox" title="No items" description="No drafts found for this container." />;
  }

  return (
    <div className="content-padding" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <InputGroup
          leftIcon="search"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          small
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--bp5-text-color-muted)' }}>
            {localRows.length} items
          </span>
          <Button small icon="plus" text="New" onClick={() => {
            // delegate to optional onCreate prop via DOM event
            const ev = new CustomEvent('table-new-request');
            window.dispatchEvent(ev);
          }} />
        </div>
      </div>

  <div className="ag-theme-alpine-dark" style={{ height: '600px', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={localRows}
          columnDefs={columnDefs}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          suppressMovableColumns={false}
          enableCellTextSelection={true}
          ensureDomOrder={true}
        />
      </div>
    </div>
  );
}

// Helper functions for nested value access
function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0) return;
  if (path.length === 1) {
    obj[path[0]] = value;
    return;
  }
  
  const [first, ...rest] = path;
  if (!obj[first] || typeof obj[first] !== 'object') {
    obj[first] = {};
  }
  setNestedValue(obj[first] as Record<string, unknown>, rest, value);
}
