/**
 * Column generation from JSON Schema for TanStack Table
 */

export interface DescriptorOption {
  label: string;
  value: string;
}

export interface TableColumn {
  key: string;
  title: string;
  path: string[];
  type: 'string' | 'number' | 'boolean' | 'enum';
  enumValues?: Array<string | DescriptorOption>;
}

/**
 * Resolve a local $ref to its definition in $defs
 * @param ref The $ref string (e.g., "#/$defs/Vector3")
 * @param schema The root schema containing $defs
 * @returns The resolved schema object or null
 */
function resolveLocalRef(ref: string, schema: Record<string, unknown>): Record<string, unknown> | null {
  if (!ref.startsWith('#/$defs/')) return null;
  
  const defName = ref.replace('#/$defs/', '');
  const defs = schema.$defs as Record<string, unknown> | undefined;
  
  if (!defs || typeof defs !== 'object') return null;
  
  const resolved = defs[defName];
  return resolved && typeof resolved === 'object' ? resolved as Record<string, unknown> : null;
}

/**
 * Generate table columns from a JSON Schema
 * @param schema JSON Schema object
 * @param uischema Optional UI Schema for column ordering
 * @returns Array of column definitions
 */
export function generateColumnsFromSchema(
  schema: Record<string, unknown>,
  uischema?: Record<string, unknown>
): TableColumn[] {
  const columns: TableColumn[] = [];

  if (!schema.properties || typeof schema.properties !== 'object') {
    return columns;
  }

  const props = schema.properties as Record<string, unknown>;

  for (const [key, propSchema] of Object.entries(props)) {
    if (!propSchema || typeof propSchema !== 'object') continue;

    let resolvedSchema = propSchema as Record<string, unknown>;
    
    // Resolve $ref if present
    if (resolvedSchema.$ref && typeof resolvedSchema.$ref === 'string') {
      const resolved = resolveLocalRef(resolvedSchema.$ref, schema);
      if (resolved) {
        resolvedSchema = resolved;
      }
    }

    // Handle nested objects (either direct or resolved from $ref)
    if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
      const nestedProps = resolvedSchema.properties as Record<string, unknown>;
      for (const [nestedKey, nestedSchema] of Object.entries(nestedProps)) {
        columns.push({
          key: `${key}.${nestedKey}`,
          title: `${key}.${nestedKey}`,
          path: [key, nestedKey],
          type: inferType(nestedSchema as Record<string, unknown>),
          enumValues: (nestedSchema as Record<string, unknown>).enum as Array<string | DescriptorOption> | undefined,
        });
      }
    } else {
      columns.push({
        key,
        title: key,
        path: [key],
        type: inferType(resolvedSchema),
        enumValues: resolvedSchema.enum as Array<string | DescriptorOption> | undefined,
      });
    }
  }

  return orderColumnsByUISchema(columns, uischema);
}

/**
 * Order columns based on UISchema element order
 */
function orderColumnsByUISchema(columns: TableColumn[], uischema?: Record<string, unknown>): TableColumn[] {
  if (!uischema || !uischema.elements || !Array.isArray(uischema.elements)) {
    return columns;
  }

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

  extractScopes(uischema.elements);

  // Sort columns based on order
  const ordered: TableColumn[] = [];
  const remaining: TableColumn[] = [];

  for (const col of columns) {
    const topLevelKey = col.path[0];
    const idx = order.indexOf(topLevelKey);
    if (idx >= 0) {
      ordered.push(col);
    } else {
      remaining.push(col);
    }
  }

  ordered.sort((a, b) => {
    const aKey = a.path[0];
    const bKey = b.path[0];
    return order.indexOf(aKey) - order.indexOf(bKey);
  });

  return [...ordered, ...remaining];
}

/**
 * Infer the column type from a JSON Schema property
 */
function inferType(schema: Record<string, unknown>): 'string' | 'number' | 'boolean' | 'enum' {
  if (schema.enum) return 'enum';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  return 'string';
}
