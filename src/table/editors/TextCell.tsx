import { useState, useEffect, useRef } from 'react';
import { EditableText } from '@blueprintjs/core';

interface TextCellProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Editable text cell for string values
 */
export function TextCell({ value, onChange }: TextCellProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  const handleConfirm = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <EditableText
      value={localValue}
      onChange={setLocalValue}
      onConfirm={handleConfirm}
      placeholder="Enter text..."
      selectAllOnFocus
    />
  );
}
