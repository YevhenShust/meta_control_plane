/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import Form from '@rjsf/antd';
import validator from '@rjsf/validator-ajv8';
import uiSchema from '../../ui/ChestDescriptor.uischema.json';
import { listDraftsV1, updateDraftV1 } from '../../shared/api/drafts';
import { getSchemaByIdV1 } from '../../shared/api/schema';
import useSetups from '../../setup/useSetups';

export default function ChestEditor({ params }: { params?: { entityId?: string } }) {
  const { selectedId } = useSetups();
  const draftId = params?.entityId ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<unknown | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedId || !draftId) {
        if (mounted) {
          setError('No setup or draft selected');
          setLoading(false);
        }
        return;
      }
      try {
        const drafts = await listDraftsV1(selectedId);
        const d = drafts.find(x => x.id === draftId);
        if (!d) {
          if (mounted) setError('Draft not found');
          return;
        }
        let data: unknown = {};
        try { data = JSON.parse(d.content ?? '{}'); } catch { data = d.content ?? {}; }
        const sch = await getSchemaByIdV1(d.schemaId!, selectedId);
        if (!mounted) return;
        setOriginal(data);
        setFormData(data);
        setSchema(sch);
      } catch (e: unknown) {
        if (mounted) setError((e && (e as Error).message) ? (e as Error).message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedId, draftId]);

  if (loading) return <>Loading…</>;
  if (error) return <>{error}</>;

  return (
    <div>
      <Form
        schema={schema as any}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        onChange={e => setFormData(e.formData)}
      >
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={async () => {
              if (!draftId) return;
              setSaving(true);
              try {
                await updateDraftV1(draftId, JSON.stringify(formData ?? {}));
              } catch (e) {
                console.error(e);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            Save
          </button>
          <button
            type="button"
            style={{ marginLeft: 8 }}
            onClick={() => setFormData(original)}
            disabled={saving}
          >
            Reset
          </button>
        </div>
      </Form>
    </div>
  );
}
