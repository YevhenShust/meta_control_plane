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

type Props = { schemaKey: 'ChestDescriptor' | string; draftId: string; uiSchema?: Record<string, unknown> };

export default function FormRenderer(props: Props) {
  const { schemaKey, draftId } = props;
  const { selectedId } = useSetups();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<any | null>(null);
  const [enhancedSchema, setEnhancedSchema] = useState<any | null>(null);
  const resolvedUiSchema = useMemo(() => {
    if (props.uiSchema && typeof props.uiSchema === 'object') return props.uiSchema as any;
    if (schemaKey === 'ChestDescriptor') return chestDescriptorUi as any;
    return {};
  }, [schemaKey, props.uiSchema]);
  const selectCfg = useMemo(() => {
    // pickSelectConfig implementation
    const opts = resolvedUiSchema && typeof resolvedUiSchema === 'object' ? (resolvedUiSchema as Record<string, unknown>)['ui:options'] as Record<string, unknown> | undefined : undefined;
    const cfg = opts && opts.selectColumns && typeof opts.selectColumns === 'object' ? opts.selectColumns as Record<string, unknown> : {};
    const out: Record<string, { schemaKey: string; labelPath?: string; valuePath?: string; sort?: boolean }> = {};
    for (const k of Object.keys(cfg)) {
      const raw = cfg[k] || {};
      if (raw && typeof raw === 'object') {
        const v = raw as Record<string, unknown>;
        if (typeof v.schemaKey === 'string') {
          out[k] = {
            schemaKey: v.schemaKey as string,
            labelPath: typeof v.labelPath === 'string' ? (v.labelPath as string) : 'Id',
            valuePath: typeof v.valuePath === 'string' ? (v.valuePath as string) : 'Id',
            sort: Boolean(v.sort),
          };
        }
      }
    }
    return out;
  }, [resolvedUiSchema]);
  const [formData, setFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // helpers
  function getByPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((acc: unknown, k: string) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
      return undefined;
    }, obj as unknown);
  }
  function parseJson(x: unknown): any {
    try { return typeof x === 'string' ? JSON.parse(x) : (x ?? {}); } catch { return {}; }
  }
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

  // enrich schema with enums derived from referenced schemas/drafts
  useEffect(() => {
    let closed = false;
    (async () => {
      const baseSchemaObject = schema;
      if (!baseSchemaObject) { setEnhancedSchema(null); return; }
      const schemaCopy = deepClone(baseSchemaObject);

      const enumMap: Record<string, { values: string[]; labels: string[] }> = {};

      if (selectedId) {
        for (const field of Object.keys(selectCfg)) {
          const refKey = selectCfg[field].schemaKey;
          try {
            const schemas = await listSchemasV1(selectedId);
            const match = schemas.find(s => {
              const raw = parseJson(s.content);
              return raw && typeof raw === 'object' && (raw as Record<string, unknown>)['$id'] === refKey;
            });
            if (!match || !match.id) continue;

            const drafts = await listDraftsV1(selectedId);
            const filtered = drafts.filter(d => String(d.schemaId || '') === String(match.id));

            const seen = new Set<string>();
            const values: string[] = [];
            const labels: string[] = [];
            for (const d of filtered) {
              const c = parseJson(d.content);
              const value = String(getByPath(c, selectCfg[field].valuePath || 'Id') ?? '');
              if (!value || seen.has(value)) continue;
              seen.add(value);
              const label = String(getByPath(c, selectCfg[field].labelPath || 'Id') ?? value);
              values.push(value);
              labels.push(label || value);
            }
            if (selectCfg[field].sort) {
              const zipped = values.map((v, i) => ({ v, l: labels[i] }));
              zipped.sort((a, b) => a.l.localeCompare(b.l));
              enumMap[field] = { values: zipped.map(z => z.v), labels: zipped.map(z => z.l) };
            } else {
              enumMap[field] = { values, labels };
            }
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

  if (loading) return <>Loading…</>;
  if (error) return <>{error}</>;

  return (
    <Form
      schema={enhancedSchema ?? (schema as any)}
      uiSchema={resolvedUiSchema}
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
