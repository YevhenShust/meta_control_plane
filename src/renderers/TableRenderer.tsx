import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, InputGroup, NonIdealState, Intent } from '@blueprintjs/core';
import { flattenSchemaToColumns, orderColumnsByUISchema } from '../core/schemaTools';
import { useDescriptorOptionsForColumns } from '../hooks/useDescriptorOptions';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellDoubleClickedEvent } from 'ag-grid-community';
import { stripIdSuffix, isDescriptorId as isDescriptorIdUtil } from '../core/pathTools';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useListDraftsQuery, useUpdateDraftMutation } from '../store/api';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { AppToaster } from '../components/AppToaster';
import {
  LABEL_NEW_BUTTON,
  LABEL_SEARCH_PLACEHOLDER,
  LABEL_NO_ITEMS_TITLE,
  LABEL_NO_ITEMS_DESC,
  LABEL_LOADING_TITLE,
  LABEL_LOADING_DRAFTS_DESC,
  LABEL_LOADING_OPTIONS_DESC,
  TOAST_TIMEOUT_MS,
  GRID_PAGINATION_PAGE_SIZE,
  GRID_PAGINATION_PAGE_SIZE_OPTIONS,
  GRID_HEIGHT_PX,
} from '../shared/constants';

interface OptionItem { label: string; value: string }
interface ColumnDefX {
  key: string;
  title: string;
  path?: string[];
  type: string;
  enumValues?: Array<string | OptionItem | unknown>;
}
interface RowData {
  id: string;
  content: Record<string, unknown>;
}

export default function TableRenderer({ schema, uischema, setupId, schemaKey, onOpenDrawer }: TableViewProps) {
  const gridRef = useRef<AgGridReact<RowData>>(null);

  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<RowData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // pending saves
  const pendingChangesRef = useRef<Map<string, { content: Record<string, unknown>; timestamp: number }>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // snapshot for rollback
  const draftsRef = useRef<RowData[]>([]);

  useEffect(() => {
    if (!setupId || !schemaKey) return;
    let mounted = true;
    (async () => {
      const id = await resolveSchemaIdByKey(setupId, schemaKey);
      if (mounted) setSchemaId(id);
    })();
    return () => { mounted = false; };
  }, [setupId, schemaKey]);

  const { data: drafts, error, isLoading } = useListDraftsQuery(
    { setupId: setupId || '', schemaId: schemaId || undefined },
    { skip: !setupId || !schemaId }
  );

  const [updateDraft] = useUpdateDraftMutation();

  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }, []);

  useEffect(() => {
    if (drafts) {
      const rows = drafts
        .map(d => ({ id: d.id == null ? '' : String(d.id), content: d.content as Record<string, unknown> }))
        .filter(r => !!r.id);
      draftsRef.current = rows;
      setLocalRows(rows);
    }
  }, [drafts]);

  // columns from schema
  const columns = useMemo<ColumnDefX[]>(() => {
    const cols = flattenSchemaToColumns(schema).map(col => ({
      key: col.key,
      title: col.title,
      path: col.path ?? [col.key],
      type: col.type,
      enumValues: col.enumValues as Array<string | OptionItem> | undefined,
    }));
    return orderColumnsByUISchema(cols, uischema);
  }, [schema, uischema]);

  const descriptorColumns = columns.filter(col => isDescriptorIdUtil(col.path?.[col.path.length - 1]));

  const descriptorPropertyNames = Array.from(new Set(
    descriptorColumns
      .map(col => stripIdSuffix(col.path?.[col.path.length - 1]))
      .filter((n): n is string => !!n)
  ));

  const { map: descriptorOptionsMap, loading: descriptorLoading } = useDescriptorOptionsForColumns(setupId, schemaKey, descriptorPropertyNames);

  // Debug logging removed

  const renderedColumns = useMemo<ColumnDefX[]>(() =>
    columns.map(c => {
      const path = c.path ?? [c.key];
      const last = path[path.length - 1];
      
      // Check if this is a DescriptorId column
  const isDescriptorId = isDescriptorIdUtil(last);
      
      if (isDescriptorId) {
        // For DescriptorId columns, use options from descriptorOptionsMap
  const propertyName = stripIdSuffix(last || '') || '';
        const opts = descriptorOptionsMap?.[propertyName] || [];
        return { ...c, path, enumValues: opts };
      } else {
        // For regular columns, use original enumValues
        return { ...c, path, enumValues: c.enumValues };
      }
    }),
  [columns, descriptorOptionsMap]);

  // helpers
  const isOptionItem = (v: unknown): v is OptionItem => {
    if (typeof v !== 'object' || v === null) return false;
    const o = v as Record<string, unknown>;
    return typeof o.value === 'string' && typeof o.label === 'string';
  };

  const getNestedValue = (obj: Record<string, unknown>, path: string[]): unknown => {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[key];
      else return undefined;
    }
    return cur;
  };

  const setNestedValue = useCallback(function setNestedValueInner(obj: Record<string, unknown>, path: string[], value: unknown): void {
    if (!path.length) return;
    if (path.length === 1) { obj[path[0]] = value; return; }
    const [first, ...rest] = path;
    if (typeof obj[first] !== 'object' || obj[first] === null) obj[first] = {};
    setNestedValueInner(obj[first] as Record<string, unknown>, rest, value);
  }, []);

  // main change handler
  const handleCellChange = useCallback((rowId: string, path: string[], value: unknown) => {
    // optimistic local update
    setLocalRows(prev => {
      const i = prev.findIndex(r => r.id === rowId);
      if (i === -1) return prev;
      const next = [...prev];
      const updated = { ...next[i], content: { ...next[i].content } };
      setNestedValue(updated.content, path, value);
      next[i] = updated;
      // mark pending
      pendingChangesRef.current.set(rowId, { content: updated.content, timestamp: Date.now() });
      return next;
    });

    // debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  saveTimeoutRef.current = setTimeout(async () => {
      const entries = Array.from(pendingChangesRef.current.entries());
      if (!entries.length) return;
      pendingChangesRef.current.clear();

      for (const [id, { content }] of entries) {
        try {
          // RTK mutation expects { draftId, content, setupId, schemaId, schemaKey }
          await updateDraft({ draftId: id, content, setupId: setupId || '', schemaId: schemaId || undefined, schemaKey }).unwrap();
        } catch (e) {
          AppToaster.show({
            message: `Save failed for ${id}: ${e instanceof Error ? e.message : 'Unknown error'}`,
            intent: Intent.DANGER,
            timeout: TOAST_TIMEOUT_MS,
          });
          // rollback
          const original = draftsRef.current.find(r => r.id === id);
          if (original) {
            setLocalRows(prev => prev.map(r => (r.id === id ? original : r)));
            gridRef.current?.api?.refreshCells({ force: true });
          }
        }
      }
    }, 700);
  }, [setupId, schemaId, schemaKey, updateDraft, setNestedValue]);

  // AG Grid colDefs — ONLY BUILT-IN EDITORS (reactive-compatible)
  const defaultColDef = useMemo<ColDef>(() => ({
    flex: 1,
    minWidth: 100,
    resizable: true,
    editable: true,
    filter: true,
    sortable: true,
  }), []);

  const columnDefs = useMemo<ColDef<RowData>[]>(() =>
    renderedColumns.map(col => {
      // Disable inline editing for complex types (object, array)
      const isComplexType = col.type === 'object' || col.type === 'array';
      
      const colDef: ColDef<RowData> = {
        colId: col.key,
        headerName: col.title,
        editable: !isComplexType, // Disable inline editing for complex types
        filter: true,
        sortable: true,

        valueGetter: params => params.data ? getNestedValue(params.data.content, col.path ?? [col.key]) : undefined,

        // ключова частина: змінюємо ТІЛЬКИ поле, повертаємо true
        valueSetter: (params) => {
          if (!params.data) return false;
          // Deep-clone to ensure nested objects are mutable (avoid freezing issues)
          const updatedContent = params.data.content
            ? JSON.parse(JSON.stringify(params.data.content))
            : {};
          const path = col.path ?? [col.key];
          setNestedValue(updatedContent, path, params.newValue);
          params.data.content = updatedContent;
          handleCellChange(params.data.id, path, params.newValue);
          return true;
        },
      };

      // For complex types, show formatted display but no editor
      if (isComplexType) {
        colDef.valueFormatter = (params) => {
          const val = params.value;
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        };
        return colDef;
      }

      // Determine if this is a DescriptorId column (we want dropdown regardless of initial options presence)
      const path = col.path ?? [col.key];
      const last = path[path.length - 1];
  const isDescriptorId = isDescriptorIdUtil(last);

      // built-in editors
      if (col.type === 'boolean') {
        colDef.cellEditor = 'agCheckboxCellEditor';
        colDef.cellRenderer = 'agCheckboxCellRenderer';
      } else if (isDescriptorId || (col.enumValues?.length)) {
        const propertyName = stripIdSuffix(last || '') || '';
        colDef.cellEditor = 'agSelectCellEditor';
        // Compute latest values at edit time from descriptorOptionsMap
        colDef.cellEditorParams = () => {
          const opts = descriptorOptionsMap?.[propertyName] ?? [];
          const values: string[] = [];
          for (const v of opts) {
            if (typeof v === 'string') values.push(v);
            else if (isOptionItem(v)) values.push(v.value);
          }
          return { values };
        };

        // Display label nicely if available, especially for descriptor IDs
        colDef.valueFormatter = p => {
          const v = p.value as string | undefined;
          if (!v) return '';
          const opts = descriptorOptionsMap?.[propertyName] ?? [];
          for (const o of opts) {
            if (typeof o !== 'string' && isOptionItem(o) && o.value === v) return o.label;
          }
          return v;
        };
      } else if (col.type === 'number') {
        colDef.cellEditor = 'agNumberCellEditor';
      } else {
        colDef.cellEditor = 'agTextCellEditor';
      }

      return colDef;
    }),
  [renderedColumns, handleCellChange, setNestedValue, descriptorOptionsMap]);

  // Apply quick filter to AG Grid when search term changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchTerm);
    }
  }, [searchTerm]);

  // Handle double-click on complex fields to open drawer for editing
  const handleCellDoubleClick = useCallback((event: CellDoubleClickedEvent<RowData>) => {
    if (!onOpenDrawer) return;
    
    const { colDef, data } = event;
    if (!colDef || !data) return;
    
    // Find the column definition to check if it's a complex type
    const col = renderedColumns.find(c => c.key === colDef.colId);
    if (!col) return;
    
    const isComplexType = col.type === 'object' || col.type === 'array';
    if (isComplexType) {
      // Open drawer for editing this draft
      onOpenDrawer(data.id);
    }
  }, [onOpenDrawer, renderedColumns]);

  if (isLoading || descriptorLoading) {
    return (
      <NonIdealState
        icon="time"
        title={LABEL_LOADING_TITLE}
        description={isLoading ? LABEL_LOADING_DRAFTS_DESC : LABEL_LOADING_OPTIONS_DESC}
      />
    );
  }
  if (error) {
    return <NonIdealState icon="error" title="Error" description="Failed to load drafts. Please try again." />;
  }
  if (!localRows.length) {
    return <NonIdealState icon="inbox" title={LABEL_NO_ITEMS_TITLE} description={LABEL_NO_ITEMS_DESC} />;
  }

  return (
    <div className="content-padding" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <InputGroup
          leftIcon="search"
          placeholder={LABEL_SEARCH_PLACEHOLDER}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          small
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--bp5-text-color-muted)' }}>{localRows.length} items</span>
          <Button small icon="plus" text={LABEL_NEW_BUTTON} onClick={() => window.dispatchEvent(new CustomEvent('table-new-request'))} />
        </div>
      </div>

      <div className="ag-theme-alpine-dark ag-compact" style={{ height: GRID_HEIGHT_PX, width: '100%' }}>
        <AgGridReact<RowData>
          ref={gridRef}
          rowData={localRows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.id}
          reactiveCustomComponents={true}
          singleClickEdit={true}
          onCellDoubleClicked={handleCellDoubleClick}
          pagination
          paginationPageSize={GRID_PAGINATION_PAGE_SIZE}
          paginationPageSizeSelector={GRID_PAGINATION_PAGE_SIZE_OPTIONS}
          enableCellTextSelection
          ensureDomOrder
        />
      </div>
    </div>
  );
}
