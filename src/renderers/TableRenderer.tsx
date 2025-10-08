import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, InputGroup, NonIdealState, Intent } from '@blueprintjs/core';
import { flattenSchemaToColumns, orderColumnsByUISchema } from '../core/schemaTools';
import { useDescriptorOptionsForColumns } from '../hooks/useDescriptorOptions';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import BooleanCellEditor from './table/BooleanCellEditor';
import SelectCellEditor from './table/SelectCellEditor';
import NumberCellEditor from './table/NumberCellEditor';
import StringCellEditor from './table/StringCellEditor';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useListDraftsQuery, useUpdateDraftMutation } from '../store/api';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';

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

import { AppToaster } from '../components/AppToaster';

function log(...args: unknown[]) {
  console.debug('[Table]', ...args);
}

export default function TableRenderer({ schema, uischema, setupId, schemaKey }: TableViewProps) {
  const [localRows, setLocalRows] = useState<RowData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const gridRef = useRef<AgGridReact>(null);
  const [schemaId, setSchemaId] = useState<string | null>(null);

  // Track changes that need to be saved
  const pendingChangesRef = useRef<Map<string, { content: Record<string, unknown>; timestamp: number }>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve schema ID from schema key
  useEffect(() => {
    if (!setupId || !schemaKey) return;
    let mounted = true;
    (async () => {
      const id = await resolveSchemaIdByKey(setupId, schemaKey);
      if (mounted) {
        setSchemaId(id);
        log('Resolved schemaId:', id, 'for schemaKey:', schemaKey);
      }
    })();
    return () => { mounted = false; };
  }, [setupId, schemaKey]);

  // Fetch drafts using RTK Query
  const { data: drafts, error, isLoading } = useListDraftsQuery(
    { setupId: setupId || '', schemaId: schemaId || undefined },
    { skip: !setupId || !schemaId }
  );

  // Mutation for updating drafts
  const [updateDraftMutation] = useUpdateDraftMutation();

  useEffect(() => {
    log('mount');
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync RTK Query data to local state for optimistic updates
  useEffect(() => {
    if (drafts) {
      const rows = drafts.map(d => ({
        id: String(d.id ?? ''),
        content: d.content as Record<string, unknown>,
      }));
      log('Drafts loaded from RTK Query:', rows.length, 'rows');
      setLocalRows(rows);
    }
  }, [drafts]);

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

  // Batch-load descriptor options for all descriptor columns.
  // Filter out any undefined names and dedupe so the hook only runs necessary requests.
  const descriptorPropertyNames = useMemo(() => {
    const names = descriptorColumns
      .map(col => (col.path && col.path.length > 0 ? col.path[col.path.length - 1]?.replace(/Id$/i, '') : undefined))
      .filter((n): n is string => !!n);
    return Array.from(new Set(names));
  }, [descriptorColumns]);

  const { map: descriptorOptionsMap } = useDescriptorOptionsForColumns(setupId, schemaKey, descriptorPropertyNames);

  // merge in options into columns for rendering
  const renderedColumns = useMemo(() => {
    return columns.map(c => {
      // Check if this is a descriptor column and if we have options for it
      let opts = c.enumValues;
      
      // If this column corresponds to a descriptor property, load options from the map
      const last = c.path && c.path.length > 0 ? c.path[c.path.length - 1]?.replace(/Id$/i, '') : undefined;
      if (last && descriptorOptionsMap && descriptorOptionsMap[last] && descriptorOptionsMap[last].length > 0) {
        opts = descriptorOptionsMap[last];
      }
      
      return { ...c, enumValues: opts } as ColumnDef;
    });
  }, [columns, descriptorOptionsMap]);

  const handleCellChange = useCallback((rowId: string, path: string[], value: unknown) => {
    // Get the current row state before update
    const currentRow = localRows.find(r => r.id === rowId);
    if (!currentRow) return;

    // Optimistic update with deep clone to avoid frozen object issues
    const updatedContent = JSON.parse(JSON.stringify(currentRow.content)) as Record<string, unknown>;
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

      // Save each changed row
      for (const [saveRowId, { content: saveContent }] of toSave) {
        log('autosave', saveRowId);
        
        try {
          await updateDraftMutation({
            draftId: saveRowId,
            content: saveContent,
            setupId: setupId || '',
            schemaId: schemaId || undefined,
          }).unwrap();
          
          // Don't remove from pending changes immediately - wait a bit to prevent
          // RTK Query refetch from overwriting with stale data
          setTimeout(() => {
            pendingChangesRef.current.delete(saveRowId);
          }, 1000);
        } catch (error) {
          // Remove from pending changes on error to allow refetch
          pendingChangesRef.current.delete(saveRowId);
          
          // Revert on error and show a shared app toaster
          AppToaster.show({
            message: `Save failed for ${saveRowId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            intent: Intent.DANGER,
            timeout: 3000,
          });
          
          // Revert to original row content
          const originalRow = drafts?.find(d => String(d.id) === saveRowId);
          if (originalRow) {
            setLocalRows(prev => prev.map(r => r.id === saveRowId ? { id: String(originalRow.id ?? ''), content: originalRow.content as Record<string, unknown> } : r));
            // Also refresh the grid
            if (gridRef.current?.api) {
              gridRef.current.api.refreshCells({ force: true });
            }
          }
        }
      }
    }, 700); // 700ms debounce
  }, [localRows, updateDraftMutation, setupId, schemaId, drafts]);

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
          
          // Deep clone the content to avoid mutation
          const updatedContent = JSON.parse(JSON.stringify(params.data.content)) as Record<string, unknown>;
          setNestedValue(updatedContent, col.path, params.newValue);
          
          // Return a NEW row object for reactive components
          params.data = { ...params.data, content: updatedContent };
          
          // Trigger our handler
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

  if (isLoading) {
    return <NonIdealState icon="time" title="Loading..." description="Loading drafts..." />;
  }

  if (error) {
    return <NonIdealState icon="error" title="Error" description="Failed to load drafts. Please try again." />;
  }

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
          getRowId={(params) => params.data.id}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            resizable: true,
          }}
          reactiveCustomComponents={true}
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
  // Ensure we have a mutable copy of nested objects
  if (!obj[first] || typeof obj[first] !== 'object') {
    obj[first] = {};
  } else if (obj[first]) {
    // Create a new object to avoid mutating frozen/readonly nested objects
    obj[first] = { ...(obj[first] as Record<string, unknown>) };
  }
  setNestedValue(obj[first] as Record<string, unknown>, rest, value);
}
