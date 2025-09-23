import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, Input, InputNumber, Select } from 'antd';
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

type SelectColumnConfig = { schemaKey: string; labelPath?: string; valuePath?: string; sort?: boolean };
function pickSelectConfig(uiSchema?: Record<string, unknown>): Record<string, SelectColumnConfig> {
  const opts = uiSchema && typeof uiSchema === 'object' ? (uiSchema as Record<string, unknown>)['ui:options'] as Record<string, unknown> | undefined : undefined;
  const cfg = opts && opts.selectColumns && typeof opts.selectColumns === 'object' ? opts.selectColumns as Record<string, unknown> : {};
  const out: Record<string, SelectColumnConfig> = {};
  for (const k of Object.keys(cfg)) {
    const raw = cfg[k] || {};
    if (raw && typeof raw === 'object') {
      const v = raw as Record<string, unknown>;
      if (typeof v.schemaKey === 'string') {
        out[k] = {
          schemaKey: v.schemaKey as string,
          labelPath: typeof v.labelPath === 'string' ? (v.labelPath as string) : 'Id',
          valuePath: typeof v.valuePath === 'string' ? (v.valuePath as string) : 'Id',
          sort: Boolean(v.sort),
        };
      }
    }
  }
  return out;
}

export default function TableRenderer({ schemaKey, uiSchema }: Props) {
  const { selectedId } = useSetups();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const cols = useMemo(() => pickTableColumns(uiSchema), [uiSchema]);
  const selectCfg = useMemo(() => pickSelectConfig(uiSchema), [uiSchema]);
  const [selectOptions, setSelectOptions] = useState<Record<string, Array<{label: string; value: string}>>>({});

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

  // load select options for configured select columns
  const loadOptions = useCallback(async () => {
    if (!selectedId) return;
    const next: Record<string, Array<{label: string; value: string}>> = {};
    for (const col of Object.keys(selectCfg)) {
      const refKey = selectCfg[col].schemaKey;
      try {
        const schemas: SchemaDto[] = await listSchemasV1(selectedId);
        const match = schemas.find(s => {
          const raw = parseJson(s.content);
          return raw && typeof raw === 'object' && (raw as Record<string, unknown>)['$id'] === refKey;
        });
        if (!match || !match.id) continue;
        const drafts = await listDraftsV1(selectedId);
        const filtered = drafts.filter(d => String(d.schemaId || '') === String(match.id));
        const opts: Array<{label: string; value: string}> = [];
        const seen = new Set<string>();
        for (const d of filtered) {
          const c = parseJson(d.content);
          const label = String(getByPath(c, selectCfg[col].labelPath || 'Id') ?? '');
          const value = String(getByPath(c, selectCfg[col].valuePath || 'Id') ?? '');
          if (!value || seen.has(value)) continue;
          seen.add(value);
          opts.push({ label: label || value, value });
        }
        if (selectCfg[col].sort) opts.sort((a, b) => a.label.localeCompare(b.label));
        next[col] = opts;
      } catch { /* ignore */ }
    }
    setSelectOptions(next);
  }, [selectedId, selectCfg]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  // refresh options when referenced drafts change
  useEffect(() => {
    const onChanged = (e: Event) => {
      const d = (e as CustomEvent<{ schemaKey?: string; setupId?: string }>).detail || {};
      if (!d.setupId || d.setupId !== selectedId) return;
      if (d.schemaKey === schemaKey || Object.values(selectCfg).some(s => s.schemaKey === d.schemaKey)) {
        editsRef.current.clear();
        void load();
        void loadOptions();
      }
    };
    window.addEventListener('drafts:changed', onChanged);
    return () => window.removeEventListener('drafts:changed', onChanged);
  }, [load, schemaKey, selectCfg, selectedId, loadOptions]);

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
        const cfg = selectCfg[col];
        const current = editsRef.current.has(r.id) ? editsRef.current.get(r.id) : r.content;
        const v = getByPath(current, col);

        if (cfg) {
          const opts = selectOptions[col] || [];
          return (
            <Select
              style={{ width: '100%' }}
              options={opts}
              value={typeof v === 'string' ? v : undefined}
              onChange={(val) => {
                const draft = JSON.parse(JSON.stringify(current ?? {}));
                setByPath(draft, col, val);
                editsRef.current.set(r.id, draft);
                scheduleSave(r.id);
              }}
              onBlur={() => flushSave(r.id)}
              showSearch
              optionFilterProp="label"
            />
          );
        }

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
  }, [cols, flushSave, scheduleSave, selectCfg, selectOptions]);

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

