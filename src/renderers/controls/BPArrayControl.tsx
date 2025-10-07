import React, { useMemo } from 'react';
import { Button, Card, FormGroup, NonIdealState } from '@blueprintjs/core';
import { withJsonFormsArrayControlProps } from '@jsonforms/react';
import type { ArrayControlProps, JsonSchema } from '@jsonforms/core';
import { JsonFormsDispatch } from '@jsonforms/react';
import { joinErrors } from '../utils';

const BPArrayControlInner: React.FC<ArrayControlProps> = (props) => {
  const {
    data,
    path,
    schema,
    uischema,
    visible,
    enabled,
    label,
    errors,
    addItem,
    removeItems,
    renderers,
    cells,
  } = props;

  const items = Array.isArray(data) ? data : [];
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  
  const childPath = useMemo(() => {
    return path;
  }, [path]);

  const itemSchema = useMemo(() => {
    // For array items, the schema should be the items property of the array schema
    return schema.items as JsonSchema;
  }, [schema]);

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
                  uischema={uischema}
                  path={itemPath}
                  enabled={enabled}
                  renderers={renderers}
                  cells={cells}
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
            onClick={() => addItem(path, {})()}
            small
          />
        </div>
      </div>
    </FormGroup>
  );
};

export const BPArrayControl = withJsonFormsArrayControlProps(BPArrayControlInner);
export default BPArrayControl;
