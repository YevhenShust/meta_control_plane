import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, HTMLTable, InputGroup, NumericInput, Checkbox, HTMLSelect, NonIdealState, Intent, Position, Toaster } from '@blueprintjs/core';
import type { JsonSchema } from '@jsonforms/core';

interface ColumnDef {
  key: string;
  label: string;
  path: string[];
  type: 'string' | 'number' | 'boolean' | 'enum';
  enumValues?: string[];
}

interface RowData {
  id: string;
  content: Record<string, unknown>;
}

const toaster = Toaster.create({ position: Position.TOP });

function log(...args: unknown[]) {
  console.debug('[Table]', ...args);
}

export default function TableRenderer({ rows, schema, uischema, onSaveRow }: TableViewProps) {
  const [localRows, setLocalRows] = useState<RowData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 25;

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
    setLocalRows(typedRows);
  }, [rows]);

  // Extract columns from schema
  const columns = useMemo(() => {
    return extractColumns(schema, uischema);
  }, [schema, uischema]);

  // Filter rows based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm) return localRows;
    const lower = searchTerm.toLowerCase();
    return localRows.filter(row => {
      return columns.some(col => {
        const val = getNestedValue(row.content, col.path);
        return String(val ?? '').toLowerCase().includes(lower);
      });
    });
  }, [localRows, searchTerm, columns]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    const col = columns.find(c => c.key === sortColumn);
    if (!col) return filteredRows;
    
    return [...filteredRows].sort((a, b) => {
      const valA = getNestedValue(a.content, col.path);
      const valB = getNestedValue(b.content, col.path);
      
      let cmp = 0;
      if (valA == null && valB == null) cmp = 0;
      else if (valA == null) cmp = 1;
      else if (valB == null) cmp = -1;
      else if (typeof valA === 'number' && typeof valB === 'number') cmp = valA - valB;
      else cmp = String(valA).localeCompare(String(valB));
      
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortColumn, sortDirection, columns]);

  // Paginate
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  const handleSort = useCallback((colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  }, [sortColumn]);

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
          }
        }
      }
    }, 700); // 700ms debounce
  }, [localRows, onSaveRow, rows]);

  if (localRows.length === 0) {
    return <NonIdealState icon="inbox" title="No items" description="No drafts found for this container." />;
  }

  return (
    <div className="content-padding">
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <InputGroup
          leftIcon="search"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          small
        />
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--bp5-text-color-muted)' }}>
          {sortedRows.length} items
        </span>
      </div>

      <HTMLTable striped interactive bordered style={{ width: '100%' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                {col.label}
                {sortColumn === col.key && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map(row => (
            <tr key={row.id}>
              {columns.map(col => (
                <td key={col.key}>
                  <CellEditor
                    value={getNestedValue(row.content, col.path)}
                    column={col}
                    onChange={(val) => handleCellChange(row.id, col.path, val)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </HTMLTable>

      {totalPages > 1 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            small
            icon="chevron-left"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
          />
          <span style={{ fontSize: '12px' }}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            small
            icon="chevron-right"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
          />
        </div>
      )}
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

interface CellEditorProps {
  value: unknown;
  column: ColumnDef;
  onChange: (value: unknown) => void;
}

function CellEditor({ value, column, onChange }: CellEditorProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: unknown) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  if (column.type === 'boolean') {
    return (
      <Checkbox
        checked={Boolean(localValue)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.checked)}
        style={{ margin: 0 }}
      />
    );
  }

  if (column.type === 'enum' && column.enumValues) {
    return (
      <HTMLSelect
        value={String(localValue ?? '')}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange(e.target.value)}
        options={column.enumValues}
        fill
      />
    );
  }

  if (column.type === 'number') {
    return (
      <NumericInput
        value={localValue as number | undefined}
        onValueChange={handleChange}
        fill
        buttonPosition="none"
        small
      />
    );
  }

  // Default: string
  return (
    <InputGroup
      value={String(localValue ?? '')}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
      fill
      small
    />
  );
}
