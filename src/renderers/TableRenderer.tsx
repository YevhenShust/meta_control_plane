import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, InputGroup, NonIdealState, Intent } from '@blueprintjs/core';
import { flattenSchemaToColumns, orderColumnsByUISchema } from '../core/schemaTools';
import { useDescriptorOptionsForColumns } from '../hooks/useDescriptorOptions';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useListDraftsQuery, useUpdateDraftMutation } from '../store/api';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { AppToaster } from '../components/AppToaster';

interface OptionItem { label: string; value: string }
interface ColumnDefX {
  key: string;
  title: string;
  path?: string[];
  type: string;
  enumValues?: Array<string | OptionItem>;
}
interface RowData {
  id: string;
  content: Record<string, unknown>;
}

export default function TableRenderer({ schema, uischema, setupId, schemaKey }: TableViewProps) {
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
      enumValues: col.enumValues,
    }));
    return orderColumnsByUISchema(cols, uischema);
  }, [schema, uischema]);

  const descriptorColumns = useMemo(() => {
    return columns.filter(col => {
      const last = col.path?.[col.path.length - 1];
      return last && /DescriptorId$/i.test(last);
    });
  }, [columns]);

  const descriptorPropertyNames = useMemo(() => {
    const names = descriptorColumns
      .map(col => col.path?.[col.path.length - 1]?.replace(/Id$/i, ''))
      .filter((n): n is string => !!n);
    return Array.from(new Set(names));
  }, [descriptorColumns]);

  const { map: descriptorOptionsMap } = useDescriptorOptionsForColumns(setupId, schemaKey, descriptorPropertyNames);

  const renderedColumns = useMemo<ColumnDefX[]>(() =>
    columns.map(c => {
      const path = c.path ?? [c.key];
      const last = path[path.length - 1]?.replace(/Id$/i, '');
      const opts = last && descriptorOptionsMap?.[last]?.length ? descriptorOptionsMap[last] : c.enumValues;
      return { ...c, path, enumValues: opts };
    }),
  [columns, descriptorOptionsMap]);

  // helpers
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
          // RTK mutation expects { draftId, content, setupId, schemaId }
          await updateDraft({ draftId: id, content, setupId: setupId || '', schemaId: schemaId || undefined }).unwrap();
        } catch (e) {
          AppToaster.show({
            message: `Save failed for ${id}: ${e instanceof Error ? e.message : 'Unknown error'}`,
            intent: Intent.DANGER,
            timeout: 3000,
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
  }, [setupId, schemaId, updateDraft, setNestedValue]);

  // AG Grid colDefs — ТІЛЬКИ ВБУДОВАНІ EDITORS (reactive-сумісні)
  const defaultColDef = useMemo<ColDef>(() => ({
    flex: 1,
    minWidth: 120,
    resizable: true,
    editable: true,
    filter: true,
    sortable: true,
  }), []);

  const columnDefs = useMemo<ColDef<RowData>[]>(() =>
    renderedColumns.map(col => {
      const colDef: ColDef<RowData> = {
        colId: col.key,
        headerName: col.title,
        editable: true,
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

      // вбудовані редактори
      if (col.type === 'boolean') {
        colDef.cellEditor = 'agCheckboxCellEditor';
        colDef.cellRenderer = 'agCheckboxCellRenderer';
      } else if (col.enumValues?.length) {
        const values: string[] = [];
        const labelMap = new Map<string, string>();
        for (const v of col.enumValues) {
          if (typeof v === 'string') {
            values.push(v);
          } else {
            values.push(v.value);
            labelMap.set(v.value, v.label);
          }
        }
        colDef.cellEditor = 'agSelectCellEditor';
        colDef.cellEditorParams = { values };
        // красиво показуємо label, якщо є
        colDef.valueFormatter = p => {
          const v = p.value as string | undefined;
          if (!v) return '';
          return labelMap.get(v) ?? v;
        };
      } else if (col.type === 'number') {
        colDef.cellEditor = 'agNumberCellEditor';
      } else {
        colDef.cellEditor = 'agTextCellEditor';
      }

      return colDef;
    }),
  [renderedColumns, handleCellChange, setNestedValue]);

  // quick filter
  useEffect(() => {
    gridRef.current?.api?.setQuickFilter(searchTerm);
  }, [searchTerm]);

  if (isLoading) {
    return <NonIdealState icon="time" title="Loading..." description="Loading drafts..." />;
  }
  if (error) {
    return <NonIdealState icon="error" title="Error" description="Failed to load drafts. Please try again." />;
  }
  if (!localRows.length) {
    return <NonIdealState icon="inbox" title="No items" description="No drafts found for this container." />;
  }

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

      <div className="ag-theme-alpine-dark" style={{ height: 600, width: '100%' }}>
        <AgGridReact<RowData>
          ref={gridRef}
          rowData={localRows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => p.data.id}
          reactiveCustomComponents={true}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          enableCellTextSelection
          ensureDomOrder
        />
      </div>
    </div>
  );
}
