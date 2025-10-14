export default function prepareSchemaForJsonForms(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  // Deep clone to avoid mutating inputs passed from caches
  const copy = JSON.parse(JSON.stringify(schema));

  // Ensure draft-07 at root
  const root = copy as Record<string, unknown>;
  if (typeof root['$schema'] !== 'string' || !String(root['$schema']).includes('draft-07')) {
    root['$schema'] = 'http://json-schema.org/draft-07/schema#';
  }

  // Drop root $id to prevent Ajv collisions when schema is recompiled with runtime patches
  if (typeof root['$id'] !== 'undefined') {
    delete root['$id'];
  }

  // Normalize legacy "definitions" -> "$defs"
  if ((root as { definitions?: unknown }).definitions && !(root as { $defs?: unknown }).$defs) {
    (root as { $defs?: unknown }).$defs = (root as { definitions?: unknown }).definitions;
    delete (root as { definitions?: unknown }).definitions;
  }

  // Recursively remove $id/$schema under $defs (do not modify root $schema)
  function strip(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;
    if (typeof o['$id'] !== 'undefined') delete o['$id'];
    if (typeof o['$schema'] !== 'undefined') delete o['$schema'];
    for (const k of Object.keys(o)) strip(o[k]);
  }

  if ((root as { $defs?: unknown }).$defs && typeof (root as { $defs?: Record<string, unknown> }).$defs === 'object') {
    for (const k of Object.keys((root as { $defs: Record<string, unknown> }).$defs)) {
      strip((root as { $defs: Record<string, unknown> }).$defs[k]);
    }
  }

  // Localize $ref values: convert external refs ending with fragment into local ones and
  // normalize "#/definitions/..." to "#/$defs/..." for draft-07 usage
  const localizeRefs = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;
    if (typeof o['$ref'] === 'string') {
      const ref = String(o['$ref']);
      // If ref contains a fragment to $defs, keep only the fragment
      const hashIdx = ref.indexOf('#');
      if (hashIdx >= 0) {
        const frag = ref.slice(hashIdx);
        // Normalize definitions -> $defs
        const normalized = frag.replace('#/definitions/', '#/$defs/');
        if (normalized.startsWith('#/')) {
          o['$ref'] = normalized;
        }
      } else if (ref.startsWith('#/definitions/')) {
        o['$ref'] = ref.replace('#/definitions/', '#/$defs/');
      }
    }
    for (const k of Object.keys(o)) localizeRefs(o[k]);
  };
  localizeRefs(root);

  return copy;
}
