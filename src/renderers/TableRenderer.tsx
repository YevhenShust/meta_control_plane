import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, Input, InputNumber } from 'antd';
import useSetups from '../setup/useSetups';
import { listSchemasV1 } from '../shared/api/schema';
import { listDraftsV1, updateDraftV1 } from '../shared/api/drafts';
import type { components } from '../types/openapi.d.ts';
type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;
type Props = { schemaKey: string; uiSchema?: Record<string, unknown> };

type Row = { id: string; content: unknown };

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((acc: unknown, k: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj as unknown);
}
function setByPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  const last = parts.pop()!;
  let cur: Record<string, unknown> = obj;
  for (const p of parts) {
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {} as Record<string, unknown>;
    cur = cur[p] as Record<string, unknown>;
  }
  cur[last] = value;
}
function parseJson(x: unknown): unknown {
  try {
    if (typeof x === 'string') return JSON.parse(x);
    return x ?? {};
  } catch { return {}; }
}
function pickTableColumns(uiSchema?: Record<string, unknown>): string[] {
  const opts = uiSchema && typeof uiSchema === 'object' ? (uiSchema as Record<string, unknown>)['ui:options'] as Record<string, unknown> | undefined : undefined;
  const cols = opts && Array.isArray(opts?.tableColumns) ? (opts.tableColumns as unknown as string[]) : [];
  return cols;
}

export default function TableRenderer({ schemaKey, uiSchema }: Props) {
  const { selectedId } = useSetups();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const cols = useMemo(() => pickTableColumns(uiSchema), [uiSchema]);

  // локальні незбережені зміни по рядках (rowId -> content)
  const editsRef = useRef(new Map<string, unknown>());
  // debounce таймери по рядках (rowId -> timeout id)
  const timersRef = useRef(new Map<string, number>());

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true); setError(null);
    try {
      const schemas: SchemaDto[] = await listSchemasV1(selectedId);
      const match = schemas.find(s => {
        const raw = parseJson(s.content);
        return raw && typeof raw === 'object' && (raw as Record<string, unknown>)['$id'] === schemaKey;
      });
      if (!match || !match.id) throw new Error(`Schema not found: ${schemaKey}`);

      const drafts = await listDraftsV1(selectedId);
      const filtered = drafts.filter(d => String(d.schemaId || '') === String(match.id));
      const mapped: Row[] = filtered.map(d => ({ id: String(d.id), content: parseJson(d.content) }));
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [schemaKey, selectedId]);

  useEffect(() => { if (selectedId) void load(); }, [selectedId, schemaKey, load]);

  // реакція на зовнішнє збереження (FormRenderer, інші екрани)
  useEffect(() => {
    const onChanged = (e: Event) => {
      const d = (e as CustomEvent<{ schemaKey?: string; setupId?: string }>).detail || {};
      if (d.schemaKey === schemaKey && d.setupId === selectedId) {
        // очистити локальні правки і перезавантажити
        editsRef.current.clear();
        void load();
      }
    };
    window.addEventListener('drafts:changed', onChanged);
    return () => window.removeEventListener('drafts:changed', onChanged);
  }, [load, schemaKey, selectedId]);

  const scheduleSave = useCallback((rowId: string) => {
    // поновити debounce
    const prev = timersRef.current.get(rowId);
    if (prev) window.clearTimeout(prev);
    const t = window.setTimeout(async () => {
      const content = editsRef.current.get(rowId);
      if (content == null) return;
      try {
        await updateDraftV1(rowId, JSON.stringify(content));
        // оновити локальні рядки оптимістично
        setRows(prevRows => prevRows.map(r => (r.id === rowId ? { ...r, content } : r)));
        // повідомити слухачів і очистити локальний буфер
        window.dispatchEvent(new CustomEvent('drafts:changed', { detail: { schemaKey, setupId: selectedId } }));
        editsRef.current.delete(rowId);
      } catch {
        // залишаємо правку в буфері; користувач може ще раз змінити — повторимо спробу
      }
    }, 700);
    timersRef.current.set(rowId, t);
  }, [schemaKey, selectedId]);

  const flushSave = useCallback(async (rowId: string) => {
    const t = timersRef.current.get(rowId);
    if (t) { window.clearTimeout(t); timersRef.current.delete(rowId); }
    const content = editsRef.current.get(rowId);
    if (content == null) return;
    try {
      await updateDraftV1(rowId, JSON.stringify(content));
      setRows(prevRows => prevRows.map(r => (r.id === rowId ? { ...r, content } : r)));
      window.dispatchEvent(new CustomEvent('drafts:changed', { detail: { schemaKey, setupId: selectedId } }));
      editsRef.current.delete(rowId);
    } catch {
      // no-op
    }
  }, [schemaKey, selectedId]);

  useEffect(() => () => {
    // cleanup таймерів при демонтажі
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const tableCols = useMemo(() => {
    return cols.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      render: (_: unknown, r: Row) => {
        const current = editsRef.current.has(r.id) ? editsRef.current.get(r.id) : r.content;
        const v = getByPath(current, col);
        const isNumber = typeof v === 'number' || /^[A-Za-z]*\.(X|Y|Z)$/.test(col);

        if (isNumber) {
          return (
            <InputNumber
              style={{ width: '100%' }}
              value={typeof v === 'number' ? v : undefined}
              onChange={(val) => {
                const draft = JSON.parse(JSON.stringify(current ?? {}));
                setByPath(draft, col, typeof val === 'number' ? val : null);
                editsRef.current.set(r.id, draft);
                scheduleSave(r.id);
              }}
              onBlur={() => flushSave(r.id)}
            />
          );
        }
        return (
          <Input
            value={typeof v === 'string' ? v : String(v ?? '')}
            onChange={(e) => {
              const draft = JSON.parse(JSON.stringify(current ?? {}));
              setByPath(draft, col, e.target.value);
              editsRef.current.set(r.id, draft);
              scheduleSave(r.id);
            }}
            onBlur={() => flushSave(r.id)}
          />
        );
      }
    }));
  }, [cols, flushSave, scheduleSave]);

  if (!selectedId) return <div style={{ padding: 8 }}>Select setup</div>;
  if (error) return <div style={{ padding: 8, color: 'crimson' }}>{error}</div>;
  if (!cols.length) return <div style={{ padding: 8 }}>No columns configured</div>;

  return (
    <Table<Row>
      rowKey={(r) => r.id}
      loading={loading}
      dataSource={rows}
      columns={tableCols}
      pagination={false}
    />
  );
}

