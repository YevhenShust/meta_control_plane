import React from 'react';
import { FormGroup, TextArea } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { joinErrors } from '../utils';

const BPTextAreaInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label, errors } = props;
  if (visible === false) return null;
  const value = data ?? '';
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  return (
    <FormGroup label={label} helperText={helperText} intent={errors && Array.isArray(errors) && errors.length ? 'danger' : undefined}>
      <TextArea value={String(value)} disabled={enabled === false} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(path, e.target.value)} />
    </FormGroup>
  );
};

export const BPTextAreaControl = withJsonFormsControlProps(BPTextAreaInner);
export default BPTextAreaControl;
