import { useEffect, useState } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';

export default function TableRenderer<Row = unknown>({ rows, onEdit, onSaveRow }: TableViewProps & { rows?: Row[] }) {
  useEffect(() => {
    console.debug('[Table] mount');
  }, []);

  const currentRows = Array.isArray(rows) ? rows as unknown as { id: string; content: unknown }[] : [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  return (
    <div className="content-padding">
      <h4>Items ({currentRows.length})</h4>
      <ul>
        {currentRows.map((r) => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            <strong>{r.id}</strong>
            <div style={{ fontSize: 12, color: '#888' }}>{JSON.stringify(r.content ?? {})}</div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => { setEditingId(String(r.id)); setEditValue(JSON.stringify(r.content ?? {}, null, 2)); console.debug('[Table] onEdit', r.id); onEdit?.(String(r.id), r.content as Partial<Row> ?? {} as Partial<Row>); }}>Edit</button>
            </div>
            {editingId === String(r.id) && (
              <div style={{ marginTop: 6 }}>
                <textarea value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: '100%', minHeight: 80 }} />
                <div style={{ marginTop: 6 }}>
                  <button onClick={async () => {
                    let parsed: unknown = editValue;
                    try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
                    console.debug('[Table] onSaveRow', editingId);
                    await onSaveRow(editingId as string, parsed as Row);
                    setEditingId(null);
                  }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{ marginLeft: 8 }}>Cancel</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
