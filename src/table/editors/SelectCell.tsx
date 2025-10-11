import { useState, useEffect, useMemo } from 'react';
import { HTMLSelect, Spinner } from '@blueprintjs/core';
import { useDescriptorOptions } from '../../hooks/useDescriptorOptions';
import type { DescriptorOption } from '../columns/fromSchema';

interface SelectCellProps {
  value: string;
  onChange: (value: string) => void;
  options?: Array<string | DescriptorOption>;
  setupId?: string;
  schemaKey?: string;
  propertyName?: string;
}

/**
 * Select cell for enum and descriptor values
 * Supports async loading of descriptor options
 */
export function SelectCell({ value, onChange, options, setupId, schemaKey, propertyName }: SelectCellProps) {
  const [localValue, setLocalValue] = useState(value ?? '');

  // Detect descriptor fields: trim "Id" suffix, then check if ends with "Descriptor"
  const normalized = (propertyName ?? '').replace(/Id$/i, '');
  const isDescriptor = /Descriptor$/i.test(normalized);
  
  // Call useDescriptorOptions with normalized property name (without "Id" suffix)
  // The hook expects the descriptor type name, not the property name with "Id"
  const { options: descriptorOptions, loading } = useDescriptorOptions(
    isDescriptor ? setupId : undefined,
    isDescriptor ? schemaKey : undefined,
    isDescriptor ? normalized : undefined
  );

  // Debug logging to verify hook is called with correct parameters
  useEffect(() => {
    if (isDescriptor) {
      console.log('[SelectCell] Descriptor field detected:', {
        propertyName,
        normalized,
        setupId,
        schemaKey,
        isDescriptor,
        optionsCount: descriptorOptions.length,
      });
    }
  }, [isDescriptor, propertyName, normalized, setupId, schemaKey, descriptorOptions.length]);

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const selectOptions = useMemo(() => {
    // Use descriptor options if available, otherwise fall back to provided options
    const opts = descriptorOptions.length > 0 ? descriptorOptions : options ?? [];
    
    const result: Array<{ label: string; value: string }> = [];
    
    for (const opt of opts) {
      if (typeof opt === 'string') {
        result.push({ label: opt, value: opt });
      } else if (opt && typeof opt === 'object' && 'value' in opt && 'label' in opt) {
        result.push({ label: opt.label, value: opt.value });
      }
    }
    
    return result;
  }, [descriptorOptions, options]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  if (loading) {
    return <Spinner size={16} />;
  }

  return (
    <HTMLSelect
      value={localValue}
      onChange={handleChange}
      fill
      options={[
        { label: '-- Select --', value: '' },
        ...selectOptions,
      ]}
    />
  );
}
