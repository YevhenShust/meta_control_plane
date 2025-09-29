import React from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { toNumeric, joinErrors } from '../utils';

const BPNumberInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label, errors } = props;
  if (visible === false) return null;
  const value = data ?? '';
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  return (
    <FormGroup label={label} helperText={helperText} intent={errors && Array.isArray(errors) && errors.length ? 'danger' : undefined}>
      <InputGroup value={value === undefined ? '' : String(value)} disabled={enabled === false} onChange={(e) => {
        const n = toNumeric(e.target.value);
        handleChange(path, n);
      }} />
    </FormGroup>
  );
};

export const BPNumberControl = withJsonFormsControlProps(BPNumberInner);
export default BPNumberControl;
