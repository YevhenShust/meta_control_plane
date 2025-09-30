import { useEffect, useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { createAjv } from './ajvInstance';
import { getBlueprintRenderers } from './blueprint/registry';
import ChestDescriptorUi from '../schemas/ui/ChestDescriptor.uischema.json';
import { loadSchemaByKey } from '../core/schemaKeyResolver';
import { listDraftsV1 } from '../shared/api/drafts';
// ui schema is hardcoded to ChestDescriptorUi import below

type Props = { setupId: string; schemaKey: string; draftId?: string };

// single blueprint renderers instance (module-level)
const bpRenderers = getBlueprintRenderers();
console.debug('[JF] blueprint renderers (count):', bpRenderers.length);

export default function FormRenderer(props: Props) {
  const { setupId, schemaKey, draftId } = props;
  const [data, setData] = useState<Record<string, unknown> | undefined>(undefined);
  const [schema, setSchema] = useState<JsonSchema | undefined>(undefined);
  const [ajv] = useState(() => createAjv());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(undefined);
  setSchema(undefined);
    setData(undefined);

    (async () => {
      try {
  // Resolve DB schema id and JSON schema by logical schemaKey
  const { id: resolvedSchemaId, json: jsonSchema } = await loadSchemaByKey(setupId, schemaKey);
  if (!mounted) return;
  const parsedSchema = (typeof jsonSchema === 'string') ? JSON.parse(jsonSchema) as JsonSchema : (jsonSchema as JsonSchema);
  setSchema(parsedSchema);

        // ui schema is hardcoded to ChestDescriptor for now

        // load draft if provided. Ensure the draft belongs to the resolved schema id
        if (draftId) {
          const all = await listDraftsV1(setupId);
          if (!mounted) return;
          const hit = all.find(d => String(d.id) === String(draftId) && String(d.schemaId || '') === String(resolvedSchemaId));
          if (hit && hit.content) {
            try {
              setData(JSON.parse(hit.content));
            } catch {
              setData(hit.content as unknown as Record<string, unknown>);
            }
          } else {
            // draft not found or wrong schema – show empty data to avoid errors
            setData({});
          }
        } else {
          setData({});
        }
      } catch (e) {
        setError((e as Error)?.message ?? String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [schemaKey, draftId, setupId]);

  if (loading) return <div className="content-padding">Loading form…</div>;
  if (error) return <div className="content-padding">Error loading form: {error}</div>;
  if (!schema) return <div className="content-padding">No schema available</div>;


  if (!schema) throw new Error('No JSON Schema loaded');
  if (!ChestDescriptorUi) throw new Error('UI schema not found for ChestDescriptor');

  return (
    <div className="content-padding">
      <JsonForms
        ajv={ajv}
        schema={schema}
        uischema={(ChestDescriptorUi as unknown) as UISchemaElement}
        data={data}
        renderers={bpRenderers}
        cells={[]}
        onChange={({ data: d }) => setData(d)}
      />

      <div style={{ marginTop: 12 }}>
        <h5>Data preview</h5>
        <pre style={{ maxHeight: 240, overflow: 'auto', background: '#0b0b0b', color: '#fff', padding: 8 }}>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}

// Verification steps:
// 1. Start dev server: `yarn dev`
// 2. Open a draft path like: http://localhost:5173/?path=Game%2FChests%2F<someDraftId>
// 3. Confirm Blueprint-styled inputs are visible and changing values updates the JSON preview below the form.
// 4. Check browser console for errors and ensure no "No applicable renderer found." messages appear.

