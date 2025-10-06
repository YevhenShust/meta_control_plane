// Schema manipulation utilities
import type { JsonSchema } from '@jsonforms/core';

/**
 * Normalize a JSON schema for use with JSON Forms.
 * Removes problematic fields and ensures draft-07 compatibility.
 */
export function normalizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  // Placeholder for schema normalization logic
  return schema;
}

/**
 * Column definition extracted from schema
 */
export interface ColumnDef {
  key: string;
  title: string;
  type: string;
  path?: string[];
  enumValues?: Array<string | unknown>;
}

/**
 * Flatten a JSON schema into column definitions for table rendering
 */
export function flattenSchemaToColumns(schema: unknown): ColumnDef[] {
  const cols: ColumnDef[] = [];

  // Basic runtime guard: we expect a plain object-like JSON schema with a 'properties' field
  if (!schema || typeof schema !== 'object') return cols;
  const schemaAny = schema as Record<string, unknown>;
  if (!schemaAny.properties || typeof schemaAny.properties !== 'object') return cols;

  const props = schemaAny.properties as Record<string, JsonSchema>;

  for (const [key, propSchema] of Object.entries(props)) {
    if (!propSchema) continue;

  // Resolve $ref if present
  const resolvedSchema = propSchema.$ref ? resolveRef(propSchema.$ref, schemaAny as unknown as JsonSchema) : propSchema;
    
    if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
      // Flatten nested objects
      const nestedProps = resolvedSchema.properties as Record<string, JsonSchema>;
      for (const [nestedKey, nestedSchema] of Object.entries(nestedProps)) {
        cols.push({
          key: `${key}.${nestedKey}`,
          title: `${key}.${nestedKey}`,
          path: [key, nestedKey],
          type: inferType(nestedSchema),
          enumValues: nestedSchema.enum as string[] | undefined,
        });
      }
    } else {
      cols.push({
        key,
        title: key,
        path: [key],
        type: inferType(resolvedSchema),
        enumValues: resolvedSchema.enum as string[] | undefined,
      });
    }
  }

  return cols;
}

/**
 * Order columns based on UISchema element order
 */
export function orderColumnsByUISchema(columns: ColumnDef[], uischema?: unknown): ColumnDef[] {
  if (!uischema) return columns;

  const ui = uischema as { elements?: Array<{ scope?: string; elements?: unknown[] }> };
  if (!ui.elements) return columns;

  const order: string[] = [];
  
  const extractScopes = (elements: unknown[]): void => {
    for (const el of elements) {
      if (typeof el === 'object' && el !== null) {
        const elem = el as { scope?: string; elements?: unknown[] };
        if (elem.scope && typeof elem.scope === 'string') {
          // Extract property name from scope like "#/properties/Id"
          const match = elem.scope.match(/#\/properties\/([^/]+)/);
          if (match && match[1]) {
            if (!order.includes(match[1])) {
              order.push(match[1]);
            }
          }
        }
        if (elem.elements && Array.isArray(elem.elements)) {
          extractScopes(elem.elements);
        }
      }
    }
  };

  extractScopes(ui.elements);

  // Sort columns based on order, preserving columns not in uischema at the end
  const ordered: ColumnDef[] = [];
  const remaining: ColumnDef[] = [];

  for (const col of columns) {
    const topLevelKey = col.path && col.path.length > 0 ? col.path[0] : col.key;
    const idx = order.indexOf(topLevelKey);
    if (idx >= 0) {
      ordered.push(col);
    } else {
      remaining.push(col);
    }
  }

  // Sort ordered by their position in order array
  ordered.sort((a, b) => {
    const aKey = a.path && a.path.length > 0 ? a.path[0] : a.key;
    const bKey = b.path && b.path.length > 0 ? b.path[0] : b.key;
    return order.indexOf(aKey) - order.indexOf(bKey);
  });

  return [...ordered, ...remaining];
}

/**
 * Apply heuristics to resolve descriptor schema key from a base schema key
 * Examples:
 *   - "ChestSpawn" -> ["ChestDescriptor"]
 *   - "ItemDescriptorId" -> ["ItemDescriptor"]
 */
export function resolveDescriptorSchemaKeyHeuristics(schemaKeyCandidate: string): string[] {
  const candidates: string[] = [];
  
  // If schemaKey ends with 'Spawn', try replacing with 'Descriptor'
  if (schemaKeyCandidate.endsWith('Spawn')) {
    candidates.push(schemaKeyCandidate.replace(/Spawn$/, 'Descriptor'));
  }
  
  // If the candidate ends with 'Id', try removing it
  if (schemaKeyCandidate.endsWith('Id')) {
    const base = schemaKeyCandidate.replace(/Id$/i, '');
    if (base && !candidates.includes(base)) {
      candidates.push(base);
    }
  }
  
  // Also try the original as-is
  if (!candidates.includes(schemaKeyCandidate)) {
    candidates.push(schemaKeyCandidate);
  }
  
  return candidates;
}

// Helper: Resolve $ref within schema
function resolveRef(ref: string, schema: JsonSchema): JsonSchema {
  if (!ref.startsWith('#/$defs/')) return { type: 'string' };
  
  const defName = ref.slice(8); // Remove "#/$defs/"
  const schemaAny = schema as unknown as { $defs?: Record<string, JsonSchema> };
  const defs = schemaAny.$defs;
  
  if (defs && defs[defName]) {
    return defs[defName];
  }
  
  return { type: 'string' };
}

// Helper: Infer type from schema
function inferType(schema: JsonSchema): string {
  if (schema.enum) return 'enum';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  return 'string';
}
