import { useState, useEffect, useRef } from 'react';
import { NumericInput } from '@blueprintjs/core';

interface NumberCellProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Editable numeric cell for number values
 */
export function NumberCell({ value, onChange }: NumberCellProps) {
  const [localValue, setLocalValue] = useState<number | undefined>(value ?? undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      setLocalValue(value ?? undefined);
    }
  }, [value]);

  const handleValueChange = (_valueAsNumber: number, valueAsString: string) => {
    const parsed = parseFloat(valueAsString);
    const newValue = isNaN(parsed) ? null : parsed;
    setLocalValue(newValue ?? undefined);
    onChange(newValue);
  };

  return (
    <NumericInput
      value={localValue ?? ''}
      onValueChange={handleValueChange}
      fill
      selectAllOnFocus
      buttonPosition="none"
    />
  );
}
