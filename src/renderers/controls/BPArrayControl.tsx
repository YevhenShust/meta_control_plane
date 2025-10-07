import React, { useMemo } from 'react';
import { Button, Card, FormGroup, NonIdealState } from '@blueprintjs/core';
import { withJsonFormsArrayControlProps } from '@jsonforms/react';
import type { ArrayControlProps, JsonSchema } from '@jsonforms/core';
import { JsonFormsDispatch } from '@jsonforms/react';
import { joinErrors } from '../utils';
import { Resolve } from '@jsonforms/core';

/**
 * Creates a default value for a JSON schema property.
 * This function recursively generates default values based on schema types.
 */
function createDefaultValue(schema: JsonSchema | undefined): unknown {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  // Handle schema with default value
  if ('default' in schema && schema.default !== undefined) {
    return schema.default;
  }

  // Handle different types
  const schemaType = schema.type;
  
  if (schemaType === 'object') {
    const obj: Record<string, unknown> = {};
    const properties = schema.properties;
    
    if (properties && typeof properties === 'object') {
      // Create default values for all properties
      Object.keys(properties).forEach(key => {
        const propSchema = properties[key];
        if (propSchema && typeof propSchema === 'object') {
          obj[key] = createDefaultValue(propSchema as JsonSchema);
        }
      });
    }
    
    return obj;
  }
  
  if (schemaType === 'array') {
    return [];
  }
  
  if (schemaType === 'string') {
    return '';
  }
  
  if (schemaType === 'number' || schemaType === 'integer') {
    return 0;
  }
  
  if (schemaType === 'boolean') {
    return false;
  }
  
  // For schemas without a type, try to infer from properties
  if (schema.properties) {
    return createDefaultValue({ ...schema, type: 'object' });
  }
  
  return undefined;
}

const BPArrayControlInner: React.FC<ArrayControlProps> = (props) => {
  const {
    data,
    path,
    schema,
    rootSchema,
    visible,
    enabled,
    label,
    errors,
    addItem,
    removeItems,
    renderers,
    cells,
  } = props;
  
  // Access arraySchema from props (it's in StatePropsOfArrayControl but not explicitly in the destructure above)
  const arraySchema = (props as unknown as { arraySchema?: JsonSchema }).arraySchema;

  const items = Array.isArray(data) ? data : [];
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  
  const childPath = useMemo(() => {
    return path;
  }, [path]);

  const itemSchema = useMemo(() => {
    // Use arraySchema if available (from StatePropsOfArrayControl), otherwise fall back to schema.items
    const items = (arraySchema?.items || schema.items) as JsonSchema;
    
    // If the items schema has a $ref, resolve it using the root schema
    if (items && typeof items === 'object' && '$ref' in items) {
      try {
        const resolved = Resolve.schema(rootSchema, items.$ref as string, rootSchema);
        return resolved;
      } catch (e) {
        console.error('[BPArrayControl] Failed to resolve schema ref:', items.$ref, e);
        return items;
      }
    }
    
    return items;
  }, [arraySchema, schema, rootSchema]);

  const defaultItemValue = useMemo(() => {
    // Create a default value based on the item schema
    return createDefaultValue(itemSchema);
  }, [itemSchema]);

  if (visible === false) return null;

  return (
    <FormGroup
      label={label}
      helperText={helperText}
      intent={Array.isArray(errors) && errors.length ? 'danger' : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '16px' }}>
            <NonIdealState
              icon="inbox"
              title="No items"
              description="Click 'Add Item' to add a new item to this array"
            />
          </div>
        ) : (
          items.map((_item, index) => {
            const itemPath = `${childPath}.${index}`;
            return (
              <Card key={index} style={{ padding: '12px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Item {index + 1}</span>
                  <Button
                    icon="trash"
                    minimal
                    small
                    intent="danger"
                    disabled={enabled === false}
                    onClick={() => removeItems?.(path, [index])()}
                  />
                </div>
                <JsonFormsDispatch
                  schema={itemSchema}
                  uischema={undefined}
                  path={itemPath}
                  enabled={enabled}
                  renderers={renderers}
                  cells={cells}
                  rootSchema={rootSchema}
                />
              </Card>
            );
          })
        )}
        <div>
          <Button
            icon="plus"
            text="Add Item"
            disabled={enabled === false}
            onClick={() => addItem(path, defaultItemValue)()}
            small
          />
        </div>
      </div>
    </FormGroup>
  );
};

export const BPArrayControl = withJsonFormsArrayControlProps(BPArrayControlInner);
export default BPArrayControl;
