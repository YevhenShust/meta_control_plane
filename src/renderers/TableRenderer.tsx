import { useEffect, useMemo, useState, useCallback } from 'react';
import { Table, Drawer } from 'antd';
import FormRenderer from './FormRenderer';
import useSetups from '../setup/useSetups';
import { listSchemasV1 } from '../shared/api/schema';
import { listDraftsV1 } from '../shared/api/drafts';
import type { components } from '../types/openapi.d.ts';

type DraftDto = NonNullable<components['schemas']['DraftDto']>;
type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;

type Props = { schemaKey: string; uiSchema?: Record<string, unknown> };

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce((acc: unknown, k) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

export default function TableRenderer({ schemaKey, uiSchema }: Props) {
  const { selectedId } = useSetups();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: string; content: unknown }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!selectedId) return;
      const schemas: SchemaDto[] = await listSchemasV1(selectedId);
      const match = schemas.find(s => {
        try {
          const raw = typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
          return raw && typeof raw === 'object' && (raw as Record<string, unknown>)['$id'] === schemaKey;
        } catch {
          return false;
        }
      });
      if (!match || !match.id) throw new Error(`Schema not found: ${schemaKey}`);
      const drafts: DraftDto[] = await listDraftsV1(selectedId);
      const filtered = drafts.filter(d => String(d.schemaId || '') === String(match.id));
      const mapped = filtered.map(d => {
        let content: unknown = {};
        try { content = typeof d.content === 'string' ? JSON.parse(d.content) : (d.content as unknown) ?? {}; } catch { /* ignore malformed content */ }
        return { id: String(d.id), content };
      });
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [schemaKey, selectedId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const d = (e as CustomEvent)?.detail || {};
      if (d.schemaKey === schemaKey && d.setupId === selectedId) {
        void load();
      }
    };
    window.addEventListener('drafts:changed', onChanged as EventListener);
    return () => window.removeEventListener('drafts:changed', onChanged as EventListener);
  }, [schemaKey, selectedId, load]);

  const cols = useMemo(() => {
    const opts = uiSchema && typeof uiSchema === 'object' ? (uiSchema as Record<string, unknown>)['ui:options'] : undefined;
    if (opts && typeof opts === 'object' && Array.isArray((opts as Record<string, unknown>)['tableColumns'])) {
      return (opts as Record<string, unknown>)['tableColumns'] as string[];
    }
    return [] as string[];
  }, [uiSchema]);

  const tableCols = useMemo(() => {
    if (cols.length === 0) return [];
    return cols.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      render: (_: unknown, r: { content: unknown }) => {
        const v = getByPath(r.content, col);
        return typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      }
    }));
  }, [cols]);

  if (!selectedId) return <div style={{ padding: 8 }}>Select setup</div>;
  if (error) return <div style={{ padding: 8, color: 'crimson' }}>{error}</div>;
  if (cols.length === 0) return <div style={{ padding: 8 }}>No columns configured</div>;

  return (
    <>
      <Table
        rowKey={(r) => r.id}
        loading={loading}
        dataSource={rows}
        columns={tableCols}
        pagination={false}
        onRow={(record) => ({
    onClick: () => setEditingId(((record as unknown) as { id: string }).id),
        })}
      />

      <Drawer
        title={`Edit ${schemaKey}`}
        open={!!editingId}
        onClose={() => setEditingId(null)}
        width={720}
        destroyOnClose
      >
        {editingId ? (
          <FormRenderer schemaKey={schemaKey} draftId={editingId} uiSchema={uiSchema as Record<string, unknown> | undefined} />
        ) : null}
      </Drawer>
    </>
  );
}
