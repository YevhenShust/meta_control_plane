import { useEffect, useMemo, useState } from 'react';
import Form from '@rjsf/antd';
import { customizeValidator } from '@rjsf/validator-ajv8';
const timeSpanRe = /^\d{2}:\d{2}:\d{2}$/; // HH:MM:SS
const validator = customizeValidator({
  customFormats: { TimeSpan: timeSpanRe },
  ajvOptionsOverrides: { allErrors: true }
});

const DEV_SKIP_VALIDATION = Boolean(import.meta.env.DEV);
import useSetups from '../setup/useSetups';
import { listSchemasV1, getSchemaByIdV1 } from '../shared/api/schema';
import { listDraftsV1, updateDraftV1 } from '../shared/api/drafts';
import chestDescriptorUi from '../ui/ChestDescriptor.rjsf.uischema.json';
import { ArrayFieldItemTemplate, ArrayFieldTemplate } from './antd/RjsfArrayTemplates';
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { components } from '../types/openapi.d.ts';
type DraftDto = NonNullable<components['schemas']['DraftDto']>;
type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;

type Props = { schemaKey: 'ChestDescriptor' | string; draftId: string };

export default function FormRenderer({ schemaKey, draftId }: Props) {
  const { selectedId } = useSetups();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<any | null>(null);
  const uiSchema = useMemo(() => {
    if (schemaKey === 'ChestDescriptor') return chestDescriptorUi as any;
    return {} as any;
  }, [schemaKey]);
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setSchema(null);
      setFormData(null);
      if (!selectedId) {
        if (mounted) { setError('Select setup'); setLoading(false); }
        return;
      }
      try {
        const schemas = await listSchemasV1(selectedId);
        const match = schemas.find((s: SchemaDto) => { try { return JSON.parse(String(s.content || '{}')).$id === schemaKey; } catch { return false; } });
        if (!match || !match.id) {
          if (mounted) { setError(`Schema not found or has no id: ${schemaKey}`); setLoading(false); }
          return;
        }
        const schemaObj = await getSchemaByIdV1(String(match.id), selectedId);
        const drafts = await listDraftsV1(selectedId);
        const d = drafts.find((x: DraftDto) => String(x.id) === String(draftId));
        if (!d) {
          if (mounted) { setError('Draft not found'); setLoading(false); }
          return;
        }
        let data: any = {};
        try { data = JSON.parse(String(d.content || '{}')); } catch { data = d.content ?? {}; }
        if (mounted) {
          setSchema(schemaObj as any);
          setFormData(data);
          setError(null);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (mounted) setError((e && (e as Error).message) ? (e as Error).message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedId, draftId, schemaKey]);

  if (loading) return <>Loading…</>;
  if (error) return <>{error}</>;

  return (
    <Form
      schema={schema as any}
      uiSchema={uiSchema}
      templates={{ ArrayFieldItemTemplate, ArrayFieldTemplate }}
      validator={validator}
      showErrorList={false}
      liveValidate={false}
      noHtml5Validate
      noValidate={DEV_SKIP_VALIDATION}
      onError={(errs) => { if (!DEV_SKIP_VALIDATION) console.warn('[RJSF] validation errors', errs); else console.debug('[RJSF][DEV-SKIP] errors', errs); }}
      formData={formData}
      onChange={e => setFormData(e.formData)}
      onSubmit={async () => {
        try {
          setSaving(true);
          await updateDraftV1(draftId, JSON.stringify(formData ?? {}));
          // notify listeners (e.g., Game/Chests menu)
          window.dispatchEvent(
            new CustomEvent('drafts:changed', {
              detail: { schemaKey, setupId: selectedId }
            })
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Form>
  );
}
