import { useMemo, useEffect, useState, useCallback } from 'react';
import validatorAjv8 from '@rjsf/validator-ajv8';
import Form from '@rjsf/antd';
import { ArrayFieldTemplate, ArrayFieldItemTemplate } from './antd/RjsfArrayTemplates';
import { buildSelectOptions } from '../core/uiLinking';
import { listDraftsV1, updateDraftV1 } from '../shared/api/drafts';
import { listSchemasV1, getSchemaByIdV1 } from '../shared/api/schema';
import useSetups from '../setup/useSetups';
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const [baseSchemaObject, setBaseSchemaObject] = useState<any | null>(null);
  const [enhancedSchema, setEnhancedSchema] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // 2) uiSchema fallback (memoized)
  const resolvedUiSchema = useMemo<Record<string, unknown>>(() => (props.uiSchema && typeof props.uiSchema === 'object' ? props.uiSchema as Record<string, unknown> : {}), [props.uiSchema]);

  // 3) select config
  const selectCfg = useMemo(() => pickSelectConfig(resolvedUiSchema), [resolvedUiSchema]);

  // helpers
  function deepClone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

  // load base schema and draft
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setBaseSchemaObject(null);
      setFormData(null);
      if (!selectedId) {
        if (mounted) { setError('Select setup'); setLoading(false); }
        return;
      }
      try {
        const schemas = await listSchemasV1(selectedId);
        const match = schemas.find(s => { try { return JSON.parse(String(s.content || '{}')).$id === schemaKey; } catch { return false; } });
        if (!match || !match.id) {
          if (mounted) { setError(`Schema not found or has no id: ${schemaKey}`); setLoading(false); }
          return;
        }
        const schemaObj = await getSchemaByIdV1(String(match.id), selectedId);

        // load draft content via listDraftsV1 and find by id
        const drafts = await listDraftsV1(selectedId);
        const dResp = drafts.find(x => String(x.id) === String(draftId));
        if (!dResp) {
          if (mounted) { setError('Draft not found'); setLoading(false); }
          return;
        }
        let data: any = {};
        try { data = JSON.parse(String(dResp.content || '{}')); } catch { data = dResp.content ?? {}; }
        if (mounted) {
          setBaseSchemaObject(schemaObj as any);
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

  // 4) enrich schema with enums using buildSelectOptions and selectCfg
  useEffect(() => {
    let closed = false;
    (async () => {
      const base = baseSchemaObject;
      if (!base) { setEnhancedSchema(null); return; }
      const copy = deepClone(base);

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

      if (copy?.properties && typeof copy.properties === 'object') {
        for (const key of Object.keys(enumMap)) {
          const prop = (copy.properties as any)[key];
          if (prop && typeof prop === 'object') {
            prop.enum = enumMap[key].values;
            (prop as any).enumNames = enumMap[key].labels;
          }
        }
      }

      if (!closed) setEnhancedSchema(copy);
    })();
    return () => { closed = true; };
  }, [baseSchemaObject, selectCfg, selectedId]);

  // 5) hide & required driven by uiSchema (memoized)
  const opts = useMemo(() => ((resolvedUiSchema as any)['ui:options']) || {}, [resolvedUiSchema]);
  const hidden = useMemo(() => Array.isArray(opts?.fieldVisibility?.hide) ? opts.fieldVisibility.hide : [], [opts]);
  const reqAdd = useMemo(() => Array.isArray(opts?.required?.add) ? opts.required.add : [], [opts]);
  const reqRemove = useMemo(() => Array.isArray(opts?.required?.remove) ? opts.required.remove : [], [opts]);

  const effectiveUiSchema = useMemo(() => {
    const ui = { ...(resolvedUiSchema as Record<string, any>) } as any;
    for (const k of hidden) ui[k] = { ...(ui[k] || {}), 'ui:widget': 'hidden', 'ui:options': { ...(ui[k]?.['ui:options']||{}), label: false } };
    return ui as Record<string, unknown>;
  }, [resolvedUiSchema, hidden]);

  const schemaForRjsf = useMemo(() => {
    const s = JSON.parse(JSON.stringify(enhancedSchema ?? baseSchemaObject ?? {}));
    const req: string[] = Array.isArray(s.required) ? [...s.required] : [];
    for (const r of reqAdd) if (!req.includes(r)) req.push(r);
    for (const r of reqRemove) {
      const i = req.indexOf(r);
      if (i >= 0) req.splice(i, 1);
    }
    s.required = req;
    // Sanitize nested defs: remove local $id/$schema to avoid AJV registering duplicate ids
    function sanitizeDefs(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.$defs && typeof obj.$defs === 'object') {
        for (const k of Object.keys(obj.$defs)) {
          const def = obj.$defs[k];
          if (def && typeof def === 'object') {
            delete def.$id;
            delete def.$schema;
            sanitizeDefs(def);
          }
        }
      }
      // also recurse into properties to catch nested $defs
      for (const key of Object.keys(obj)) {
        if (key === '$defs') continue;
        const child = obj[key];
        if (child && typeof child === 'object') sanitizeDefs(child);
      }
    }
    try { sanitizeDefs(s); } catch { /* ignore sanitization failures */ }
    return s;
  }, [enhancedSchema, baseSchemaObject, reqAdd, reqRemove]);

  // 6) transformErrors
  const transformErrors = useCallback((errors: any[]) => {
    if (!hidden.length) return errors;
    return errors.filter((e: any) => {
      const mp = e?.params?.missingProperty || '';
      return !(e.name === 'required' && hidden.includes(mp));
    });
  }, [hidden]);

  if (loading) return <>Loading…</>;
  if (error) return <>{error}</>;

  // 7) render Form with array templates and safe props
  return (
    <Form
      schema={schemaForRjsf}
      uiSchema={effectiveUiSchema}
      formData={formData}
      templates={{ ArrayFieldTemplate, ArrayFieldItemTemplate }}
      validator={validatorAjv8}
      transformErrors={transformErrors}
      onChange={({ formData }) => setFormData(formData)}
      onSubmit={async ({ formData: fd }) => {
        try {
          setSaving(true);
          await updateDraftV1(draftId, JSON.stringify(fd ?? {}));
          window.dispatchEvent(new CustomEvent('drafts:changed', { detail: { schemaKey, setupId: selectedId } }));
        } finally {
          setSaving(false);
        }
      }}
      liveValidate={false}
    >
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Form>
  );
}
