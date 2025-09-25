import { useEffect, useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers, materialCells } from '@jsonforms/material-renderers';
import useSetups from '../setup/useSetups';
import { resolveSchemaIdByKey } from '../core/uiLinking';
import { getSchemaByIdV1 } from '../shared/api/schema';
import chestUi from '../uischemas/ChestDescriptor.uischema.json';
import type { UISchemaElement } from '@jsonforms/core';

function removeIdsRecursive(obj: unknown) {
  if (!obj || typeof obj !== 'object') return;
  const o = obj as Record<string, unknown>;
  delete o.$id;
  delete o.$schema;
  for (const k of Object.keys(o)) {
    removeIdsRecursive(o[k]);
  }
}

function prepareSchemaForJsonForms(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const copy = JSON.parse(JSON.stringify(raw));
  if (copy.$defs && typeof copy.$defs === 'object') {
    for (const key of Object.keys(copy.$defs)) {
      removeIdsRecursive(copy.$defs[key]);
    }
  }
  return copy;
}

export default function JsonFormsDemoChest() {
  const { selectedId } = useSetups();
  const [schema, setSchema] = useState<unknown | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedId) return;
      try {
        const schemaId = await resolveSchemaIdByKey(selectedId, 'ChestDescriptor');
        if (!schemaId) throw new Error('ChestDescriptor schema not found');
        const s = await getSchemaByIdV1(schemaId, selectedId);
        const prepared = prepareSchemaForJsonForms(s);
        if (mounted) setSchema(prepared);
      } catch (e) {
        console.error('Failed to load ChestDescriptor schema', e);
        if (mounted) setSchema(null);
      }
    })();
    return () => { mounted = false; };
  }, [selectedId]);

  let loadedId: string | null = null;
  let propsCount = 0;
  if (schema && typeof schema === 'object') {
    const s = schema as Record<string, unknown>;
    const idVal = s.$id ?? s.id;
    loadedId = typeof idVal === 'string' ? idVal : null;
    if (s.properties && typeof s.properties === 'object') {
      propsCount = Object.keys(s.properties as Record<string, unknown>).length;
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8, color: 'var(--slate-text)' }}>
        Loaded schema: {loadedId ?? '—'} (properties: {propsCount})
      </div>
      {!schema ? (
        <div>Loading schema…</div>
      ) : (
        <>
          <JsonForms
            schema={schema as Record<string, unknown>}
            uischema={chestUi as UISchemaElement}
            data={data}
            renderers={materialRenderers}
            cells={materialCells}
            onChange={({ data }) => setData(data)}
          />
          <pre style={{ marginTop: 16, background: '#111', color: '#0f0', padding: 12, overflow: 'auto' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
