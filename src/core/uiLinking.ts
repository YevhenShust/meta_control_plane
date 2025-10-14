import { listSchemas, listDrafts } from '../shared/api';

export async function resolveSchemaIdByKey(setupId: string, schemaKey: string): Promise<string | null> {
  try {
    const schemas = await listSchemas(setupId);
    for (const s of schemas) {
        const raw = s.content;
        if (raw && typeof raw === 'object' && (raw as Record<string, unknown>)['$id'] === schemaKey) {
        return String(s.id);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export type SelectColumnConfig = { schemaKey: string; labelPath?: string; valuePath?: string; sort?: boolean };

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

export async function buildSelectOptions(
  setupId: string,
  cfg: SelectColumnConfig
): Promise<Array<{ label: string; value: string }>> {
  const schemaId = await resolveSchemaIdByKey(setupId, cfg.schemaKey);
  if (!schemaId) return [];
  const drafts = await listDrafts(setupId);
  const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
  const seen = new Set<string>();
  const out: Array<{ label: string; value: string }> = [];
  for (const d of filtered) {
    const c = d.content;
    const value = String(getByPath(c, cfg.valuePath || 'Id') ?? '');
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = String(getByPath(c, cfg.labelPath || 'Id') ?? value);
    out.push({ label: label || value, value });
  }
  if (cfg.sort) out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}
