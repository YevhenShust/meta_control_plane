/**
 * Generate sensible default values from a JSON Schema.
 * Used for initializing new draft forms.
 */

type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
}

function resolveRef(_schema: JsonSchema, ref: string, rootSchema: JsonSchema): JsonSchema | null {
  // Only handle local refs like #/$defs/SomeType
  if (!ref.startsWith('#/')) return null;
  const path = ref.slice(2).split('/');
  let current: unknown = rootSchema;
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return current as JsonSchema;
}

function isTimeRelatedField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return (
    lower.includes('time') ||
    lower.includes('duration') ||
    lower.includes('cooldown') ||
    lower.includes('delay')
  );
}

function isRarityRelatedField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return lower.includes('rarity') || lower.includes('type');
}

export function generateDefaultValue(
  schema: JsonSchema,
  rootSchema: JsonSchema,
  fieldName = ''
): unknown {
  // If schema has explicit default, use it
  if (schema.default !== undefined) {
    return schema.default;
  }

  // Handle $ref
  if (schema.$ref) {
    const resolved = resolveRef(schema, schema.$ref, rootSchema);
    if (resolved) {
      return generateDefaultValue(resolved, rootSchema, fieldName);
    }
  }

  // Handle array of types (e.g., ["string", "null"])
  let type = schema.type;
  if (Array.isArray(type)) {
    // Pick first non-null type
    type = type.find(t => t !== 'null') || type[0];
  }

  // Handle enums
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    // If field name suggests rarity, try to find "Common"
    if (isRarityRelatedField(fieldName)) {
      const commonOption = schema.enum.find(
        v => typeof v === 'string' && v.toLowerCase() === 'common'
      );
      if (commonOption) return commonOption;
    }
    // Otherwise return first enum option
    return schema.enum[0];
  }

  switch (type) {
    case 'string':
      // Check if field name suggests time/duration
      if (isTimeRelatedField(fieldName)) {
        return '00:00:45';
      }
      return '';

    case 'number':
    case 'integer':
      return 0;

    case 'boolean':
      return false;

    case 'array':
      return [];

    case 'object':
      if (schema.properties) {
        const result: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          result[key] = generateDefaultValue(propSchema, rootSchema, key);
        }
        return result;
      }
      return {};

    case 'null':
      return null;

    default:
      // If no type specified, assume object
      if (schema.properties) {
        const result: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          result[key] = generateDefaultValue(propSchema, rootSchema, key);
        }
        return result;
      }
      return null;
  }
}

/**
 * Generate default content object from root schema
 */
export function generateDefaultContent(schema: JsonSchema): unknown {
  return generateDefaultValue(schema, schema);
}
