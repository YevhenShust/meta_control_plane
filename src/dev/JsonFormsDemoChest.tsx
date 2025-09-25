import { useEffect, useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers, materialCells } from '@jsonforms/material-renderers';
import useSetups from '../setup/useSetups';
import { resolveSchemaIdByKey } from '../core/uiLinking';
import { getSchemaByIdV1 } from '../shared/api/schema';
import { listDraftsV1 } from '../shared/api/drafts';
import chestUi from '../uischemas/ChestDescriptor.uischema.json';
import type { UISchemaElement } from '@jsonforms/core';

export default function JsonFormsDemoChest() {
  const { selectedId } = useSetups();
  const [schema, setSchema] = useState<unknown | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const ready = !!selectedId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ready) return;
      try {
        // шукаємо schemaId по $id ключу
        const schemaId = await resolveSchemaIdByKey(selectedId!, 'ChestDescriptor');
        if (!schemaId) throw new Error('ChestDescriptor schema not found');
        const s = await getSchemaByIdV1(schemaId, selectedId!);
        if (!cancelled) setSchema(s);

        // необовʼязково: беремо перший драфт як початкові дані
        const drafts = await listDraftsV1(selectedId!);
        const draft = drafts.find(d => String(d.schemaId || '') === String(schemaId));
        if (draft && draft.content && !cancelled) {
          try {
            setData(typeof draft.content === 'string' ? JSON.parse(draft.content) : draft.content);
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setSchema(null);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, selectedId]);

  if (!ready) return <div style={{ padding: 16 }}>Select a setup first…</div>;
  if (!schema) return <div style={{ padding: 16 }}>Loading schema…</div>;

  return (
    <div style={{ padding: 16 }}>
      <JsonForms
        schema={schema}
        uischema={chestUi as UISchemaElement}
        data={data}
        renderers={materialRenderers}
        cells={materialCells}
        onChange={({ data }) => setData(data)}
      />
      <pre style={{ marginTop: 16, background: '#111', color: '#0f0', padding: 12, overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
