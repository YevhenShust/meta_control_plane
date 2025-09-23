import { Table, InputNumber, Typography, Select } from 'antd';
import { useEffect, useState, useRef } from 'react';
import useSetups from '../../setup/useSetups';
import { listSchemasV1 } from '../../shared/api/schema';
import { listDraftsV1, updateDraftV1 } from '../../shared/api/drafts';
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = { id: string; schemaId: string; content: any; saving?: boolean; error?: string | null };

export default function AtlasChestSpawnsScreen() {
  const { selectedId } = useSetups();
  const [rows, setRows] = useState<Row[]>([]);
  const rowsRef = useRef<Row[]>(rows);
  const saveTimers = useRef(new Map<string, number>());
  const [descriptorOpts, setDescriptorOpts] = useState<Array<{ value: string; label: string }>>([]);
  const [descLoading, setDescLoading] = useState(false);

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedId) return;
      try {
        const schemas = await listSchemasV1(selectedId);
        const picked = schemas.find(s => {
          try { return JSON.parse(String(s.content || '{}')).$id === 'ChestSpawn'; } catch { return false; }
        }) ?? schemas[0];
        const drafts = await listDraftsV1(selectedId);
        const filtered = drafts.filter(d => d.schemaId === picked?.id);
        // load chest descriptor drafts once for DescriptorId select options
        try {
          setDescLoading(true);
          const chestDesc = schemas.find(s => {
            try { return JSON.parse(String(s.content || '{}')).$id === 'ChestDescriptor'; } catch { return false; }
          });
          if (chestDesc?.id) {
            const opts = drafts
              .filter(d => d.schemaId === chestDesc.id)
              .map(d => {
                let id = String(d.id);
                try { id = (JSON.parse(String(d.content || '{}')).Id) || id; } catch { /* ignore parse errors */ }
                return { value: id, label: id };
              })
              .sort((a, b) => a.label.localeCompare(b.label));
            if (mounted) setDescriptorOpts(opts);
          }
        } finally {
          setDescLoading(false);
        }
        const mapped: Row[] = filtered.map(d => {
          let parsed: any = {};
          try { parsed = JSON.parse(String(d.content || '{}')); } catch { parsed = {}; }
          return { id: String(d.id), schemaId: String(d.schemaId), content: parsed, saving: false, error: null };
        });
        if (mounted) setRows(mapped);
      } catch {
        if (mounted) setRows([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedId]);

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  function scheduleSave(rowId: string) {
    const tm = saveTimers.current.get(rowId);
    if (tm) clearTimeout(tm as any);
    const h = window.setTimeout(async () => {
      try {
        const row = rowsRef.current.find(r => r.id === rowId);
        if (!row) return;
        await updateDraftV1(rowId, JSON.stringify(row.content ?? {}));
        setRows(prev => prev.map(r => r.id === rowId ? ({ ...r, saving: false }) : r));
      } catch (e: any) {
        setRows(prev => prev.map(r => r.id === rowId ? ({ ...r, saving: false, error: e?.message ?? 'Save failed' }) : r));
      }
    }, 800);
    saveTimers.current.set(rowId, h as any);
  }

  function edit(rowId: string, mutator: (draftContent: any) => void) {
    setRows(prev => prev.map(r => r.id === rowId ? ({ ...r, content: (() => { const c = { ...(r.content ?? {}) }; mutator(c); return c; })(), saving: true, error: null }) : r));
    scheduleSave(rowId);
  }

  if (!selectedId) return <div style={{ padding: 8 }}>Select setup</div>;

  const columns = [
    {
      title: 'DescriptorId',
      render: (_: any, row: Row) => {
        const current = row.content?.DescriptorId ?? '';
        const opts = current && !descriptorOpts.some(o => o.value === current) ? [{ value: current, label: current }, ...descriptorOpts] : descriptorOpts;
        return (
          <Select
            value={current}
            options={opts}
            loading={descLoading}
            showSearch
            allowClear={false}
            placeholder="Select chest Id"
            filterOption={(input, opt) => (opt?.label as string).toLowerCase().includes(String(input).toLowerCase())}
            onChange={(val) => edit(row.id, d => { d.DescriptorId = val; })}
            style={{ minWidth: 160 }}
          />
        );
      },
    },
    {
      title: 'Position',
      render: (_: any, row: Row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <InputNumber value={row.content?.Position?.X ?? 0} onChange={(val) => edit(row.id, d => { d.Position = d.Position ?? { X: 0, Y: 0, Z: 0 }; d.Position.X = Number(val) || 0; })} />
          <InputNumber value={row.content?.Position?.Y ?? 0} onChange={(val) => edit(row.id, d => { d.Position = d.Position ?? { X: 0, Y: 0, Z: 0 }; d.Position.Y = Number(val) || 0; })} />
          <InputNumber value={row.content?.Position?.Z ?? 0} onChange={(val) => edit(row.id, d => { d.Position = d.Position ?? { X: 0, Y: 0, Z: 0 }; d.Position.Z = Number(val) || 0; })} />
        </div>
      ),
    },
    {
      title: 'Rotation',
      render: (_: any, row: Row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <InputNumber value={row.content?.Rotation?.X ?? 0} onChange={(val) => edit(row.id, d => { d.Rotation = d.Rotation ?? { X: 0, Y: 0, Z: 0 }; d.Rotation.X = Number(val) || 0; })} />
          <InputNumber value={row.content?.Rotation?.Y ?? 0} onChange={(val) => edit(row.id, d => { d.Rotation = d.Rotation ?? { X: 0, Y: 0, Z: 0 }; d.Rotation.Y = Number(val) || 0; })} />
          <InputNumber value={row.content?.Rotation?.Z ?? 0} onChange={(val) => edit(row.id, d => { d.Rotation = d.Rotation ?? { X: 0, Y: 0, Z: 0 }; d.Rotation.Z = Number(val) || 0; })} />
        </div>
      ),
    },
    {
      title: 'Update status',
      render: (_: any, row: Row) => (
        row.saving ? <Typography.Text type="secondary">Saving…</Typography.Text> : (row.error ? <Typography.Text type="danger">{row.error}</Typography.Text> : null)
      ),
    },
  ];

  return <Table dataSource={rows} pagination={false} columns={columns} />;
}
