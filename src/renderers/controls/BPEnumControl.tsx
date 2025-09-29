import React from 'react';
import { FormGroup } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { joinErrors } from '../utils';

const BPEnumInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label, errors, schema, uischema } = props;
  const required = Array.isArray(uischema?.options?.required) ? uischema.options.required.includes(path) : false;
  if (visible === false) return null;
  const schemaEnum = schema && typeof schema === 'object' ? (schema as Record<string, unknown>)['enum'] : undefined;
  const options: unknown[] = Array.isArray(schemaEnum) ? (schemaEnum as unknown[]) : [];
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  return (
    <FormGroup label={label} helperText={helperText} intent={errors && Array.isArray(errors) && errors.length ? 'danger' : undefined}>
      <select value={data ?? ''} disabled={enabled === false} onChange={(e) => handleChange(path, e.target.value === '' ? undefined : e.target.value)}>
        {!required && <option value="">(none)</option>}
        {options.map((o, i) => <option key={i} value={String(o)}>{String(o)}</option>)}
      </select>
    </FormGroup>
  );
};

export const BPEnumControl = withJsonFormsControlProps(BPEnumInner);
export default BPEnumControl;
