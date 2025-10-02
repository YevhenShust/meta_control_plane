import { useCallback, useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, InputGroup, NumericInput, Checkbox, HTMLSelect, NonIdealState, Intent, Position, Toaster } from '@blueprintjs/core';
import type { JsonSchema } from '@jsonforms/core';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { listDraftsV1 } from '../shared/api/drafts';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellEditorParams, ICellEditorComp } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface OptionItem { label: string; value: string }

interface ColumnDef {
  key: string;
  label: string;
  path: string[];
  type: 'string' | 'number' | 'boolean' | 'enum';
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
    const cols = extractColumns(schema, uischema);
    log('Columns extracted:', cols.length, 'columns', cols.map(c => c.key));
    return cols;
  }, [schema, uischema]);

  const [columnOptions, setColumnOptions] = useState<Record<string, Array<string | OptionItem>>>({});

  // merge in options into columns for rendering
  const renderedColumns = useMemo(() => {
    return columns.map(c => {
      const opts = (columnOptions && columnOptions[c.key]) ? columnOptions[c.key] : c.enumValues;
      return { ...c, enumValues: opts } as ColumnDef;
    });
  }, [columns, columnOptions]);

  // Convert to ag-grid column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    return renderedColumns.map(col => {
      const colDef: ColDef = {
        field: col.key,
        headerName: col.label,
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

  useEffect(() => {
    if (!setupId || !schemaKey) return;
    // for each column that ends with DescriptorId, try to resolve descriptor schema and fetch its drafts
    columns.forEach((col) => {
      const last = col.path[col.path.length - 1];
      if (!last || !/DescriptorId$/i.test(last)) return;

      (async () => {
        // heuristics: try replacing 'Spawn' suffix in schemaKey with 'Descriptor', else try the property base name
        const candidates: string[] = [];
        if (schemaKey.endsWith('Spawn')) candidates.push(schemaKey.replace(/Spawn$/, 'Descriptor'));
        const propBase = last.replace(/Id$/i, '');
        if (propBase) candidates.push(propBase);

        let resolvedKey: string | null = null;
        for (const cand of candidates) {
          try {
            const id = await resolveSchemaIdByKey(setupId, cand);
            if (id) { resolvedKey = cand; break; }
          } catch { /* try next */ }
        }
        if (!resolvedKey) return;

        try {
          const schemaId = await resolveSchemaIdByKey(setupId, resolvedKey!);
          const drafts = await listDraftsV1(setupId);
          const opts = drafts
            .filter(d => String(d.schemaId || '') === String(schemaId))
            .map(d => {
                let label: string;
                try {
                  const parsed = typeof d.content === 'string' ? JSON.parse(d.content) : d.content;
                  if (parsed && typeof parsed === 'object') {
                    const asObj = parsed as Record<string, unknown>;
                    const nice = String(asObj['Id'] ?? asObj['name'] ?? '');
                    if (nice) {
                      label = `${nice} (${d.id})`;
                    } else {
                      label = String(d.id ?? '');
                    }
                  } else {
                    label = String(d.id ?? '');
                  }
                } catch {
                  label = String(d.id ?? '');
                }
                // prefer descriptor's internal Id property as the option value if present
                try {
                  const parsed = typeof d.content === 'string' ? JSON.parse(d.content) : d.content;
                  if (parsed && typeof parsed === 'object') {
                    const asObj = parsed as Record<string, unknown>;
                    const descriptorId = String(asObj['Id'] ?? asObj['id'] ?? '');
                    if (descriptorId) return { label, value: descriptorId } as OptionItem;
                  }
                } catch {
                  // fallback
                }
                return { label, value: String(d.id ?? '') } as OptionItem;
            });
          setColumnOptions(prev => ({ ...prev, [col.key]: opts }));
        } catch (e) {
          console.debug('[Table] failed to fetch descriptor drafts', e);
        }
      })();
    });
  }, [columns, setupId, schemaKey]);

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

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
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

// Extract columns from JSON Schema, optionally respecting UISchema order
function extractColumns(schema: object, uischema?: object): ColumnDef[] {
  const cols: ColumnDef[] = [];
  const jsonSchema = schema as JsonSchema;
  
  if (!jsonSchema.properties) return cols;

  const props = jsonSchema.properties as Record<string, JsonSchema>;
  
  // Try to get order from UISchema if available
  const orderedKeys = uischema ? extractOrderFromUISchema(uischema, props) : Object.keys(props);

  for (const key of orderedKeys) {
    const propSchema = props[key];
    if (!propSchema) continue;

    // Resolve $ref if present
    const resolvedSchema = propSchema.$ref ? resolveRef(propSchema.$ref, jsonSchema) : propSchema;
    
    if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
      // Flatten nested objects
      const nestedProps = resolvedSchema.properties as Record<string, JsonSchema>;
      for (const [nestedKey, nestedSchema] of Object.entries(nestedProps)) {
        cols.push({
          key: `${key}.${nestedKey}`,
          label: `${key}.${nestedKey}`,
          path: [key, nestedKey],
          type: inferType(nestedSchema),
          enumValues: nestedSchema.enum as string[] | undefined,
        });
      }
    } else {
      cols.push({
        key,
        label: key,
        path: [key],
        type: inferType(resolvedSchema),
        enumValues: resolvedSchema.enum as string[] | undefined,
      });
    }
  }

  return cols;
}

// Extract property order from UISchema
function extractOrderFromUISchema(uischema: object, props: Record<string, JsonSchema>): string[] {
  const order: string[] = [];
  const ui = uischema as { elements?: Array<{ scope?: string; elements?: unknown[] }> };
  
  if (!ui.elements) return Object.keys(props);

  const extractScopes = (elements: unknown[]): void => {
    for (const el of elements) {
      if (typeof el === 'object' && el !== null) {
        const elem = el as { scope?: string; elements?: unknown[] };
        if (elem.scope && typeof elem.scope === 'string') {
          // Extract property name from scope like "#/properties/Id"
          const match = elem.scope.match(/#\/properties\/([^/]+)/);
          if (match && match[1] && props[match[1]]) {
            if (!order.includes(match[1])) {
              order.push(match[1]);
            }
          }
        }
        if (elem.elements && Array.isArray(elem.elements)) {
          extractScopes(elem.elements);
        }
      }
    }
  };

  extractScopes(ui.elements);
  
  // Add any remaining properties not in UISchema
  for (const key of Object.keys(props)) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }

  return order;
}

// Resolve $ref within schema
function resolveRef(ref: string, schema: JsonSchema): JsonSchema {
  if (!ref.startsWith('#/$defs/')) return { type: 'string' };
  
  const defName = ref.slice(8); // Remove "#/$defs/"
  const schemaAny = schema as unknown as { $defs?: Record<string, JsonSchema> };
  const defs = schemaAny.$defs;
  
  if (defs && defs[defName]) {
    return defs[defName];
  }
  
  return { type: 'string' };
}

function inferType(schema: JsonSchema): 'string' | 'number' | 'boolean' | 'enum' {
  if (schema.enum) return 'enum';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  return 'string';
}

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

// Blueprint-based cell editor for boolean
const BooleanCellEditor = forwardRef<ICellEditorComp, ICellEditorParams>((props, ref) => {
  const [value, setValue] = useState(Boolean(props.value));
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.checked);
  };

  return (
    <div ref={containerRef} style={{ padding: '4px' }}>
      <Checkbox
        checked={value}
        onChange={handleChange}
        style={{ margin: 0 }}
      />
    </div>
  );
});

// Blueprint-based cell editor for enum/select
const SelectCellEditor = forwardRef<ICellEditorComp, ICellEditorParams & { enumValues: Array<string | OptionItem> }>((props, ref) => {
  const [value, setValue] = useState(String(props.value ?? ''));
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value);
  };

  const opts = props.enumValues.map(v => typeof v === 'string' ? v : { label: v.label, value: v.value });

  return (
    <div ref={containerRef}>
      <HTMLSelect
        value={value}
        onChange={handleChange}
        options={opts}
        fill
      />
    </div>
  );
});

// Blueprint-based cell editor for number
const NumberCellEditor = forwardRef<ICellEditorComp, ICellEditorParams>((props, ref) => {
  const [value, setValue] = useState(props.value as number | undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (val: number) => {
    setValue(val);
  };

  return (
    <div ref={containerRef}>
      <NumericInput
        value={value}
        onValueChange={handleChange}
        fill
        buttonPosition="none"
        small
      />
    </div>
  );
});

// Blueprint-based cell editor for string
const StringCellEditor = forwardRef<ICellEditorComp, ICellEditorParams>((props, ref) => {
  const [value, setValue] = useState(String(props.value ?? ''));
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  return (
    <div ref={containerRef}>
      <InputGroup
        value={value}
        onChange={handleChange}
        fill
        small
      />
    </div>
  );
});
