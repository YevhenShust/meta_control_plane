import { useEffect, useState } from 'react';
import type { TableViewProps } from '../editor/EntityEditor.types';
import { Button, TextArea } from '@blueprintjs/core';

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
          <li key={r.id} className="table-item">
            <strong>{r.id}</strong>
            <div className="table-item-content">{JSON.stringify(r.content ?? {})}</div>
            <div className="table-item-actions">
              <Button small minimal onClick={() => { setEditingId(String(r.id)); setEditValue(JSON.stringify(r.content ?? {}, null, 2)); console.debug('[Table] onEdit', r.id); onEdit?.(String(r.id), r.content as Partial<Row> ?? {} as Partial<Row>); }}>Edit</Button>
            </div>
            {editingId === String(r.id) && (
              <div className="table-edit-container">
                <TextArea growVertically fill value={editValue} onChange={e => setEditValue((e.target as HTMLTextAreaElement).value)} className="table-edit-textarea" />
                <div className="table-edit-actions">
                  <Button small onClick={async () => {
                    let parsed: unknown = editValue;
                    try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
                    console.debug('[Table] onSaveRow', editingId);
                    await onSaveRow(editingId as string, parsed as Row);
                    setEditingId(null);
                  }}>Save</Button>
                  <Button small className="table-action-button-spacing" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
