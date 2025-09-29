import { useEffect, useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { createAjv } from './ajvInstance';
import { blueprintRenderers } from './blueprint';
import { getSchemaByIdV1 } from '../shared/api/schema';
import { listDraftsV1 } from '../shared/api/drafts';
import { getUiSchemaByKey } from '../schemas/ui';

type Props = { setupId: string; schemaKey: string; draftId?: string };

export default function FormRenderer(props: Props) {
  const { setupId, schemaKey, draftId } = props;
  const [data, setData] = useState<Record<string, unknown> | undefined>(undefined);
  const [schema, setSchema] = useState<JsonSchema | undefined>(undefined);
  const [uiSchema, setUiSchema] = useState<UISchemaElement | undefined>(undefined);
  const [ajv] = useState(() => createAjv());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(undefined);
    setSchema(undefined);
    setUiSchema(undefined);
    setData(undefined);

    (async () => {
      try {
        // Load schema by key (schemaKey maps to schema id in server)
        const s = await getSchemaByIdV1(schemaKey, setupId);
        if (!mounted) return;
        // ensure it's a JsonSchema object
        const parsedSchema = (typeof s === 'string') ? JSON.parse(s) as JsonSchema : (s as JsonSchema);
        setSchema(parsedSchema);

        // ui schema lookup
        const u = getUiSchemaByKey(schemaKey) as unknown;
        if (u && typeof u === 'object') {
          setUiSchema(u as UISchemaElement);
        } else {
          // generate default vertical layout based on top-level properties
          const parsed = parsedSchema as JsonSchema;
          const props = parsed && parsed.properties && typeof parsed.properties === 'object' ? Object.keys(parsed.properties) : [];
          const generated: UISchemaElement = {
            type: 'VerticalLayout',
            elements: props.map((k: string) => ({ type: 'Control', scope: `#/properties/${k}` })),
          } as unknown as UISchemaElement;
          setUiSchema(generated);
        }

        // load draft if provided
        if (draftId) {
          const all = await listDraftsV1(setupId);
          if (!mounted) return;
          const hit = all.find(d => String(d.id) === String(draftId));
          if (hit && hit.content) {
            try {
              setData(JSON.parse(hit.content));
            } catch {
              setData(hit.content as unknown as Record<string, unknown>);
            }
          } else {
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

  return (
    <div className="content-padding">
      <JsonForms
        ajv={ajv}
        schema={schema}
        uischema={uiSchema}
        data={data}
        renderers={blueprintRenderers}
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

