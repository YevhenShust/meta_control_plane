export default function prepareSchemaForJsonForms(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  // deep clone
  const copy = JSON.parse(JSON.stringify(schema));

  // recursively remove $id/$schema under $defs (do not modify root $schema)
  function strip(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;
    const o = obj as Record<string, unknown>;
    if (typeof o['$id'] !== 'undefined') delete o['$id'];
    if (typeof o['$schema'] !== 'undefined') delete o['$schema'];
    for (const k of Object.keys(o)) strip(o[k]);
  }

  if (copy.$defs && typeof copy.$defs === 'object') {
    for (const k of Object.keys(copy.$defs)) strip(copy.$defs[k]);
  }

  return copy;
}
