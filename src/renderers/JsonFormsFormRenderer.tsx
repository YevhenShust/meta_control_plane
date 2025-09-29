import { useEffect, useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers, materialCells } from '@jsonforms/material-renderers';
import prepareSchemaForJsonForms from '../jsonforms/prepareSchema';
import MaterialScope from '../theme/MaterialScope';
import type { UISchemaElement, JsonSchema } from '@jsonforms/core';
import { Generate } from '@jsonforms/core';
import { useTheme } from '@mui/material';
import { getSchemaByIdV1 } from '../shared/api/schema';
import { updateDraftV1, createDraftV1 } from '../shared/api/drafts';
import { emitChanged } from '../shared/events/DraftEvents';
import { resolveSchemaIdByKey } from '../core/uiLinking';
import { buildSelectOptions } from '../core/uiLinking';
import useDrafts from '../setup/useDrafts';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type Props = {
  setupId: string;
  schemaKey: string;
  draftId?: string;
  uiSchema?: UISchemaElement | Record<string, unknown>;
  initialData?: Record<string, unknown> | null;
  onCreated?: (id: string) => void;
};

export default function JsonFormsFormRenderer({ setupId, schemaKey, draftId, uiSchema: uiSchemaProp, initialData, onCreated }: Props) {
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [uiLocal, setUiLocal] = useState<UISchemaElement | undefined>(undefined);
  const [enhancedSchema, setEnhancedSchema] = useState<JsonSchema | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [sid, setSid] = useState<string | null>(null);
  const draftsCtx = useDrafts();

  useEffect(() => {
    let mounted = true;
    (async () => {
      // keep resolved in outer scope so we can use it after the try/catch
      let resolved: string | null = null;
      try {
        resolved = await resolveSchemaIdByKey(setupId, schemaKey);
        if (!resolved) throw new Error(`Schema id not found for key: ${schemaKey}`);
        if (!mounted) return;
        setSid(resolved);
        const raw = await getSchemaByIdV1(resolved, setupId);
        const prepared = prepareSchemaForJsonForms(raw as Record<string, unknown>) as JsonSchema;
        // If the schema root is a $ref into $defs or definitions, resolve it so Generate.uiSchema works
        function derefRoot(s: unknown) {
          if (!s || typeof s !== 'object') return s;
          const obj = s as Record<string, unknown>;
          const refVal = obj['$ref'];
          if (typeof refVal === 'string') {
            const parts = refVal.split('/').filter(Boolean);
            const key = parts[parts.length - 1];
            if (obj.$defs && typeof obj.$defs === 'object') {
              const defs = obj.$defs as Record<string, unknown>;
              if (key in defs) return defs[key];
            }
            if ('definitions' in obj && typeof obj['definitions'] === 'object') {
              const defs = obj['definitions'] as Record<string, unknown>;
              if (key in defs) return defs[key];
            }
          }
          return s;
        }

        let finalSchema = derefRoot(prepared) as JsonSchema;
        // If dereferenced target looks like an object schema but misses the type, add it so Generate.uiSchema can work
        try {
          if (finalSchema && typeof finalSchema === 'object') {
            const asAny = finalSchema as Record<string, unknown>;
            if (!asAny.type && (asAny.properties || asAny.$defs || asAny.definitions)) {
              const mutable = asAny as Record<string, unknown>;
              mutable['type'] = 'object';
              finalSchema = mutable as JsonSchema;
            }
          }
        } catch {
          // ignore
        }
        if (mounted) setSchema(finalSchema);
      } catch (e) {
        console.error('Failed to load schema', e);
        if (mounted) setSchema(null);
      }

      if (!uiSchemaProp) {
        // try renderer-local ui location first, then the older uischemas folder used by demo
        let loadedUi: UISchemaElement | Record<string, unknown> | undefined;
        try {
          const mod = await import(`./ui/${schemaKey}.uischema.json`);
          loadedUi = ((mod as { default?: unknown }).default ?? mod) as UISchemaElement | Record<string, unknown>;
          console.info('[JF] loaded ui from ./ui');
  } catch {
          try {
            const mod2 = await import(`../uischemas/${schemaKey}.uischema.json`);
            loadedUi = ((mod2 as { default?: unknown }).default ?? mod2) as UISchemaElement | Record<string, unknown>;
            console.info('[JF] loaded ui from ../uischemas');
          } catch {
            // fallback to Generate.uiSchema
            console.info('[JF] no local uischema found, will Generate.uiSchema');
          }
        }
        if (mounted && loadedUi) setUiLocal(loadedUi as UISchemaElement);
      }

      if (draftId) {
        try {
          // try cache first
          const cached = draftsCtx.getDraftById(setupId, draftId);
          if (cached) { setData(cached.content as Record<string, unknown>); }
          else {
            // ensure drafts for this schema are loaded
            await draftsCtx.ensureDrafts(setupId, resolved as string);
            const after = draftsCtx.getDraftById(setupId, draftId);
            if (after) setData(after.content as Record<string, unknown>);
          }
        } catch (e) {
          console.error('Failed to load drafts', e);
        }
      }
    })();
    return () => { mounted = false; };
  }, [setupId, schemaKey, draftId, uiSchemaProp, draftsCtx]);

  // If creating (no draftId) simply apply initialData passed from CreateDraft
  useEffect(() => {
    if (draftId) return;
    if (!initialData) return;
    if (data && Object.keys(data).length !== 0) return;
    try { setData(initialData ?? {}); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, draftId]);

  // helper removed: we now always build defaults when creating

  // enrich schema with select options (enum + enumNames) based on ui:options.selectColumns
  function pickSelectConfig(uiSchema?: Record<string, unknown>): Record<string, { schemaKey: string; labelPath?: string; valuePath?: string; sort?: boolean }> {
    const opts = uiSchema && typeof uiSchema === 'object' ? (uiSchema as Record<string, unknown>)['ui:options'] as Record<string, unknown> | undefined : undefined;
    const cfg = opts && typeof opts === 'object' && 'selectColumns' in opts && typeof (opts as Record<string, unknown>)['selectColumns'] === 'object'
      ? (opts as Record<string, unknown>)['selectColumns'] as Record<string, unknown>
      : {};
    const out: Record<string, { schemaKey: string; labelPath?: string; valuePath?: string; sort?: boolean }> = {};
    for (const k of Object.keys(cfg)) {
      const v = cfg[k] as Record<string, unknown> | undefined;
      if (v && typeof v['schemaKey'] === 'string') {
        out[k] = {
          schemaKey: v['schemaKey'] as string,
          labelPath: typeof v['labelPath'] === 'string' ? v['labelPath'] as string : 'Id',
          valuePath: typeof v['valuePath'] === 'string' ? v['valuePath'] as string : 'Id',
          sort: !!v['sort'],
        };
      }
    }
    return out;
  }

  useEffect(() => {
    let closed = false;
    (async () => {
      const base = schema;
      if (!base) { setEnhancedSchema(null); return; }
      // deep clone
      const copy = JSON.parse(JSON.stringify(base)) as JsonSchema;

      const resolvedUiSchema = uiSchemaProp && typeof uiSchemaProp === 'object' ? uiSchemaProp as Record<string, unknown> : {}; 
      const selectCfg = pickSelectConfig(resolvedUiSchema);

      const enumMap: Record<string, { values: string[]; labels: string[] }> = {};
      if (setupId) {
        for (const field of Object.keys(selectCfg)) {
          try {
            const opts = await buildSelectOptions(setupId, selectCfg[field]) as Array<{ value: string | number | boolean; label: string }>;
            enumMap[field] = { values: opts.map((o) => String(o.value)), labels: opts.map((o) => o.label) };
          } catch {
            // ignore
          }
        }
      }

      if (copy?.properties && typeof copy.properties === 'object') {
        type SchemaProp = JsonSchema & { enum?: string[]; enumNames?: string[] };
        const properties = copy.properties as Record<string, SchemaProp>;
        for (const key of Object.keys(enumMap)) {
          const prop = properties[key];
          if (prop && typeof prop === 'object') {
            prop.enum = enumMap[key].values;
            prop.enumNames = enumMap[key].labels;
          }
        }
      }

      // sanitize nested defs similar to FormRenderer
            function sanitizeDefs(obj: unknown) {
              if (!obj || typeof obj !== 'object') return;
              const node = obj as Record<string, unknown>;
              if (node.$defs && typeof node.$defs === 'object') {
                const defs = node.$defs as Record<string, unknown>;
                for (const k of Object.keys(defs)) {
                  const def = defs[k];
                  if (def && typeof def === 'object') {
                    const defNode = def as Record<string, unknown>;
                    delete defNode['$id'];
                    delete defNode['$schema'];
                    sanitizeDefs(defNode);
                  }
                }
              }
              for (const key of Object.keys(node)) {
                if (key === '$defs') continue;
                const child = node[key];
                if (child && typeof child === 'object') sanitizeDefs(child);
              }
            }
            try { sanitizeDefs(copy); } catch { /* ignore */ }

      if (!closed) setEnhancedSchema(copy as JsonSchema);
    })();
    return () => { closed = true; };
  }, [schema, setupId, uiSchemaProp]);

  const schemaForJsonForms = enhancedSchema ?? schema;

  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addFormat('TimeSpan', /^\d{2}:\d{2}:\d{2}$/);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (draftId) {
        await updateDraftV1(draftId, JSON.stringify(data));
      } else {
        const created = await createDraftV1(setupId, { schemaId: sid ?? undefined, content: JSON.stringify(data) });
        // if parent provided a callback, inform about new id
        try {
          const newId = created && typeof created === 'object' && 'id' in created ? String((created as Record<string, unknown>).id) : undefined;
          if (newId && typeof onCreated === 'function') onCreated(newId);
        } catch {
          // ignore
        }
      }
      emitChanged({ schemaKey, setupId });
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const resolvedUi = uiSchemaProp ? (uiSchemaProp as UISchemaElement) : (uiLocal ?? (schemaForJsonForms ? (Generate.uiSchema(schemaForJsonForms as JsonSchema) as UISchemaElement) : undefined));

  const uiRootType = resolvedUi ? (resolvedUi as { type?: unknown }).type : undefined;
  const theme = useTheme();
  console.info('[JF] materialRenderers length:', Array.isArray(materialRenderers) ? materialRenderers.length : 'not array');
  console.info('[JF] ui root type:', uiRootType);

  return (
    <MaterialScope>
      <div>
        {!schema && <div>Loading schema…</div>}
        {schema && (
          <>
            <JsonForms
              schema={schemaForJsonForms as JsonSchema}
              uischema={resolvedUi}
              data={data}
              renderers={materialRenderers}
              cells={materialCells}
              onChange={({ data }) => setData(data)}
              ajv={ajv}
            />
            <div style={{ marginTop: 12 }}>
              <button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
            <pre style={{ marginTop: 12, background: theme.palette.background.paper, color: theme.palette.text.primary, padding: 12 }}>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}
      </div>
    </MaterialScope>
  );
}
