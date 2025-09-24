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
import { buildSelectOptions } from '../core/uiLinking';
import { ArrayFieldItemTemplate, ArrayFieldTemplate } from './antd/RjsfArrayTemplates';
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { components } from '../types/openapi.d.ts';
type DraftDto = NonNullable<components['schemas']['DraftDto']>;
type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;

type Props = { schemaKey: string; draftId: string; uiSchema?: Record<string, unknown> };

type SelectColumnConfig = { schemaKey: string; labelPath?: string; valuePath?: string; sort?: boolean };
function pickSelectConfig(uiSchema?: Record<string, unknown>): Record<string, SelectColumnConfig> {
  const opts = uiSchema && typeof uiSchema === 'object' ? (uiSchema as any)['ui:options'] : undefined;
  const cfg = opts && typeof opts.selectColumns === 'object' ? (opts.selectColumns as Record<string, any>) : {};
  const out: Record<string, SelectColumnConfig> = {};
  for (const k of Object.keys(cfg)) {
    const v = cfg[k] || {};
    if (typeof v?.schemaKey === 'string') {
      out[k] = {
        schemaKey: v.schemaKey,
        labelPath: typeof v.labelPath === 'string' ? v.labelPath : 'Id',
        valuePath: typeof v.valuePath === 'string' ? v.valuePath : 'Id',
        sort: !!v.sort,
      };
    }
  }
  return out;
}

export default function FormRenderer(props: Props) {
  const { schemaKey, draftId } = props;
  const { selectedId } = useSetups();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<any | null>(null);
  const [enhancedSchema, setEnhancedSchema] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const resolvedUiSchema = useMemo(() => (props.uiSchema && typeof props.uiSchema === 'object' ? props.uiSchema as any : {}), [props.uiSchema]);
  const selectCfg = useMemo(() => pickSelectConfig(resolvedUiSchema), [resolvedUiSchema]);

  // helpers
  function deepClone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

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

  // enrich schema with enums derived from referenced schemas/drafts (use buildSelectOptions)
  useEffect(() => {
    let closed = false;
    (async () => {
      const baseSchemaObject = schema;
      if (!baseSchemaObject) { setEnhancedSchema(null); return; }
      const schemaCopy = deepClone(baseSchemaObject);

      const enumMap: Record<string, { values: string[]; labels: string[] }> = {};

      if (selectedId) {
        for (const field of Object.keys(selectCfg)) {
          try {
            const opts = await buildSelectOptions(selectedId, selectCfg[field]);
            enumMap[field] = { values: opts.map(o => o.value), labels: opts.map(o => o.label) };
          } catch {
            // ignore
          }
        }
      }

      if (schemaCopy?.properties && typeof schemaCopy.properties === 'object') {
        for (const key of Object.keys(enumMap)) {
          const prop = (schemaCopy.properties as any)[key];
          if (prop && typeof prop === 'object') {
            prop.enum = enumMap[key].values;
            (prop as any).enumNames = enumMap[key].labels;
          }
        }
      }

      if (!closed) setEnhancedSchema(schemaCopy);
    })();
    return () => { closed = true; };
  }, [schema, selectCfg, selectedId]);

  // Build effective uiSchema by hiding fields from ui options
  const uiOptions = useMemo(() => (resolvedUiSchema && typeof resolvedUiSchema === 'object') ? (resolvedUiSchema as any)['ui:options'] : undefined, [resolvedUiSchema]);
  const fieldVisibility = useMemo(() => Array.isArray(uiOptions?.hide) ? (uiOptions!.hide as string[]) : [], [uiOptions]);
  const requiredAdd = useMemo(() => Array.isArray((uiOptions as any)?.required?.add) ? (uiOptions as any).required.add as string[] : [], [uiOptions]);
  const requiredRemove = useMemo(() => Array.isArray((uiOptions as any)?.required?.remove) ? (uiOptions as any).required.remove as string[] : [], [uiOptions]);

  const effectiveUiSchema = useMemo(() => {
    const copy = deepClone(resolvedUiSchema ?? {});
    for (const f of fieldVisibility) {
      (copy as any)[f] = { ...(copy as any)[f] || {}, 'ui:widget': 'hidden', 'ui:options': { ...(((copy as any)[f] && (copy as any)[f]['ui:options']) || {}), label: false } };
    }
    return copy;
  }, [resolvedUiSchema, fieldVisibility]);

  const schemaForRjsf = useMemo(() => {
    const base = deepClone(enhancedSchema ?? schema ?? {});
    if (!base || typeof base !== 'object') return base;
    base.required = Array.isArray(base.required) ? Array.from(base.required) : [];
    for (const r of requiredAdd) {
      if (!base.required.includes(r)) base.required.push(r);
    }
    if (Array.isArray(requiredRemove) && requiredRemove.length) {
      base.required = base.required.filter((x: string) => !requiredRemove.includes(x));
    }
    return base;
  }, [enhancedSchema, schema, requiredAdd, requiredRemove]);

  if (loading) return <>Loading…</>;
  if (error) return <>{error}</>;

  function transformErrors(errors: any[]) {
    if (!fieldVisibility || !fieldVisibility.length) return errors;
    return errors.filter((err) => {
      try {
        if (err && err.name === 'required') {
          const missing = err.params && (err.params.missingProperty || (err.params as any)?.missingProperty);
          if (typeof missing === 'string' && fieldVisibility.includes(missing)) return false;
        }
      } catch { /* ignore */ }
      return true;
    });
  }

  return (
    <Form
      schema={schemaForRjsf}
      uiSchema={effectiveUiSchema}
      templates={{ ArrayFieldItemTemplate, ArrayFieldTemplate }}
      validator={validator}
      showErrorList={false}
      liveValidate={false}
      noHtml5Validate
      noValidate={DEV_SKIP_VALIDATION}
      transformErrors={transformErrors}
      onError={(errs) => { if (!DEV_SKIP_VALIDATION) console.warn('[RJSF] validation errors', errs); else console.debug('[RJSF][DEV-SKIP] errors', errs); }}
      formData={formData}
      onChange={e => setFormData(e.formData)}
      onSubmit={async () => {
        try {
          setSaving(true);
          await updateDraftV1(draftId, JSON.stringify(formData ?? {}));
          // notify listeners
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
