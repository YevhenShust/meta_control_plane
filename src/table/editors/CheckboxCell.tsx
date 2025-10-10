import { Checkbox } from '@blueprintjs/core';

interface CheckboxCellProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Checkbox cell for boolean values
 */
export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
  return (
    <Checkbox
      checked={value ?? false}
      onChange={(e) => onChange(e.currentTarget.checked)}
    />
  );
}
