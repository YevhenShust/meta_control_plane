import React from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { joinErrors } from '../utils';

const BPStringControlInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label, errors } = props;
  if (visible === false) return null;
  const value = data ?? '';
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  return (
    <FormGroup label={label} helperText={helperText} intent={errors && errors.length ? 'danger' : undefined}>
      <InputGroup value={String(value)} disabled={enabled === false} onChange={(e) => handleChange(path, e.target.value)} />
    </FormGroup>
  );
};

export const BPStringControl = withJsonFormsControlProps(BPStringControlInner);
export default BPStringControl;
