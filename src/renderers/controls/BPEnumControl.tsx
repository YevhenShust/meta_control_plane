import React from 'react';
import { FormGroup, HTMLSelect } from '@blueprintjs/core';
import type { OptionProps } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { joinErrors } from '../utils';

const BPEnumInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label, errors, schema, uischema } = props;
  const requiredFromUi = Array.isArray(uischema?.options?.required) ? uischema.options.required.includes(path) : false;
  if (visible === false) return null;
  const schemaEnum = schema && typeof schema === 'object' ? (schema as Record<string, unknown>)['enum'] : undefined;
  const options: unknown[] = Array.isArray(schemaEnum) ? (schemaEnum as unknown[]) : [];
  // Treat minLength >= 1 as required too (set by patched schema for descriptor fields)
  const minLength = typeof (schema as Record<string, unknown>)?.['minLength'] === 'number' ? (schema as Record<string, unknown>)['minLength'] as number : 0;
  const required = requiredFromUi || minLength > 0;
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  const optsSource = required ? options : ['(none)', ...options];
  // If current data is undefined and field is required, ensure initial value is empty string to force selection
  // but don't include '(none)' in required mode
  const opts: OptionProps[] = optsSource.map(o => ({ label: String(o), value: String(o) }));
  return (
    <FormGroup label={label} helperText={helperText} intent={errors && Array.isArray(errors) && errors.length ? 'danger' : undefined}>
      <HTMLSelect
        value={data ?? (required ? '' : '')}
        disabled={enabled === false}
        onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          handleChange(path, v === '' || v === '(none)' ? undefined : v);
        }}
        options={opts}
      />
    </FormGroup>
  );
};

export const BPEnumControl = withJsonFormsControlProps(BPEnumInner);
export default BPEnumControl;
