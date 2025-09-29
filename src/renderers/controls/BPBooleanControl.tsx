import React from 'react';
import { Checkbox } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';

const BPBooleanInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label } = props;
  if (visible === false) return null;
  const value = Boolean(data);
  return (
    <Checkbox label={label} disabled={enabled === false} checked={value} onChange={(e: React.FormEvent<HTMLInputElement>) => handleChange(path, (e.target as HTMLInputElement).checked)} />
  );
};

export const BPBooleanControl = withJsonFormsControlProps(BPBooleanInner);
export default BPBooleanControl;
