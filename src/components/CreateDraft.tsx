import { useMemo } from 'react';
import useSetups from '../setup/useSetups';
import JsonFormsFormRenderer from '../renderers/JsonFormsFormRenderer';
import { useEffect, useState } from 'react';
import { resolveSchemaIdByKey } from '../core/uiLinking';
import { getSchemaByIdV1 } from '../shared/api/schema';
import prepareSchemaForJsonForms from '../jsonforms/prepareSchema';

type Props = {
  schemaKey: string;
  uiSchema?: Record<string, unknown>;
  initialFormData?: unknown | (() => unknown);
  onCreated?: (id: string) => void;
};

export default function CreateDraft({ schemaKey, uiSchema, initialFormData, onCreated }: Props) {
  const { selectedId } = useSetups();
  const [defaults, setDefaults] = useState<Record<string, unknown> | null>(null);
  const [resetCounter, setResetCounter] = useState(0);

  const initialData = useMemo(() => {
    if (typeof initialFormData === 'function') {
      try { return (initialFormData as () => unknown)() ?? {}; } catch { return {}; }
    }
    return initialFormData ?? {};
  }, [initialFormData]);

  // load schema and compute defaults when creating
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedId) return;
      try {
        const sid = await resolveSchemaIdByKey(selectedId, schemaKey);
        if (!sid) return;
        const raw = await getSchemaByIdV1(sid, selectedId);
        const prepared = prepareSchemaForJsonForms(raw as Record<string, unknown>) as Record<string, unknown>;

        // simple default extractor that resolves $ref from root $defs and honors allOf
        function resolveRefLocal(ref: string) {
          const parts = ref.split('/').filter(Boolean);
          const key = parts[parts.length - 1];
          const defs = prepared['$defs'] as Record<string, unknown> | undefined;
          if (defs && key in defs) return defs[key] as Record<string, unknown>;
          const definitions = prepared['definitions'] as Record<string, unknown> | undefined;
          if (definitions && key in definitions) return definitions[key] as Record<string, unknown>;
          return null;
        }

        function mergeAllOfLocal(node: Record<string, unknown>) {
          const props: Record<string, unknown> = { ...(node.properties as Record<string, unknown> || {}) };
          const req: string[] = Array.isArray(node.required) ? [...(node.required as string[])] : [];
          if (Array.isArray(node.allOf)) {
            for (const part of node.allOf as unknown[]) {
              let resolved: Record<string, unknown> | null = null;
              if (part && typeof part === 'object') {
                const p = part as Record<string, unknown>;
                if (typeof p.$ref === 'string') resolved = resolveRefLocal(p.$ref as string);
                else resolved = p;
              }
              if (resolved) {
                const rp = resolved.properties as Record<string, unknown> | undefined;
                if (rp && typeof rp === 'object') for (const k of Object.keys(rp)) props[k] = rp[k];
                if (Array.isArray(resolved.required)) for (const r of resolved.required as string[]) if (!req.includes(r)) req.push(r);
              }
            }
          }
          return { properties: props, required: req };
        }

        function buildDefaultsLocal(node: Record<string, unknown>) {
          const out: Record<string, unknown> = {};
          const merged = mergeAllOfLocal(node);
          const props = merged.properties;
          if (props && typeof props === 'object') {
            for (const k of Object.keys(props)) {
              const p = props[k] as Record<string, unknown> | undefined;
              if (!p) continue;
              if ('default' in p && p.default !== undefined) { out[k] = p.default; continue; }
              if (Array.isArray(p.enum) && p.enum.length > 0) { out[k] = p.enum[0]; continue; }
              if (p.type === 'array' || (p.items && typeof p.items === 'object')) { out[k] = []; continue; }
              if (p.type === 'object' || (p.properties && typeof p.properties === 'object')) {
                out[k] = buildDefaultsLocal(p as Record<string, unknown>); continue;
              }
              if (p.type === 'string') { out[k] = (typeof p.format === 'string' && p.format.toLowerCase() === 'timespan') ? '00:00:00' : ''; continue; }
              if (p.type === 'integer' || p.type === 'number') { out[k] = 0; continue; }
              if (p.type === 'boolean') { out[k] = false; continue; }
            }
          }
          for (const r of merged.required) {
            if (!(r in out)) {
              const p = props?.[r] as Record<string, unknown> | undefined;
              if (!p) { out[r] = ''; continue; }
              if ('default' in p && p.default !== undefined) { out[r] = p.default; continue; }
              if (Array.isArray(p.enum) && p.enum.length > 0) { out[r] = p.enum[0]; continue; }
              if (p.type === 'array' || (p.items && typeof p.items === 'object')) { out[r] = []; continue; }
              if (p.type === 'object' || (p.properties && typeof p.properties === 'object')) { out[r] = buildDefaultsLocal(p as Record<string, unknown>); continue; }
              if (p.type === 'string') { out[r] = (typeof p.format === 'string' && p.format.toLowerCase() === 'timespan') ? '00:00:00' : ''; continue; }
              if (p.type === 'integer' || p.type === 'number') { out[r] = 0; continue; }
              if (p.type === 'boolean') { out[r] = false; continue; }
              out[r] = '';
            }
          }
          return out;
        }

        const built = buildDefaultsLocal(prepared as Record<string, unknown>);
        if (mounted) setDefaults(built as Record<string, unknown>);
      } catch {
        if (mounted) setDefaults({});
      }
    })();
    return () => { mounted = false; };
  }, [selectedId, schemaKey]);

  if (!selectedId) return <div style={{ padding: 8 }}>Select a setup …</div>;

  return (
    <div style={{ padding: 8 }}>
      <h3>Create {schemaKey}</h3>
      <JsonFormsFormRenderer
        key={`create-${resetCounter}`}
        setupId={selectedId}
        schemaKey={schemaKey}
        uiSchema={uiSchema}
        initialData={{ ...(defaults ?? {}), ...(initialData as Record<string, unknown>) }}
        onCreated={(id) => {
          // remount the form to show defaults again for the next creation
          setResetCounter((c) => c + 1);
          if (onCreated) onCreated(id);
        }}
      />
    </div>
  );
}
