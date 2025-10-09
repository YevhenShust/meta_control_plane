import React from 'react';
import { FormGroup, HTMLSelect, Button, Intent, Spinner } from '@blueprintjs/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { joinErrors } from '../utils';
import { useDescriptorOptionsReadable } from '../../hooks/useDescriptorOptionsReadable';

/**
 * Extract prefix from property name for descriptor lookup
 * Example: "ChestDescriptorId" -> "Chest"
 */
function extractPrefixFromPath(path: string): string | undefined {
  const match = path.match(/^(.+?)DescriptorId$/i);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

/**
 * Custom control for descriptor fields that uses useDescriptorOptionsReadable
 * Shows human-readable dropdown with format: "[prefix] descriptorName — id"
 */
const BPDescriptorControlInner: React.FC<ControlProps> = (props) => {
  const { data, handleChange, path, visible, enabled, label, errors, uischema } = props;
  
  // Get setupId from root schema (passed via uischema options)
  const setupId = (uischema?.options as Record<string, unknown>)?.setupId as string | undefined;
  
  // Extract prefix from path for filtering
  const prefix = extractPrefixFromPath(path);
  
  // Use hook to load descriptor options (must be called before any early returns)
  const { options, loading, error } = useDescriptorOptionsReadable(setupId, prefix);
  
  if (visible === false) return null;
  
  const helperText = Array.isArray(errors) ? joinErrors(errors) : (errors ? String(errors) : undefined);
  const required = Array.isArray(uischema?.options?.required) ? uischema.options.required.includes(path) : false;
  
  // Show loading state
  if (loading) {
    return (
      <FormGroup label={label} helperText="Loading descriptor options...">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
          <Spinner size={20} />
          <span style={{ fontSize: '14px', color: '#999' }}>Loading...</span>
        </div>
      </FormGroup>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <FormGroup label={label} helperText={error} intent="danger">
        <div style={{ color: '#d13913', padding: '8px' }}>
          Failed to load options
        </div>
      </FormGroup>
    );
  }
  
  // Show "no options" state with create button
  if (options.length === 0) {
    return (
      <FormGroup label={label} helperText="No descriptor options available">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#999' }}>No descriptors found</span>
          <Button
            icon="add"
            intent={Intent.PRIMARY}
            small
            text="Create New"
            disabled
            title="Creating new descriptors is not yet implemented"
          />
        </div>
      </FormGroup>
    );
  }
  
  // Render select with descriptor options
  const selectOptions = [
    ...(required ? [] : [{ label: '-- Select a descriptor --', value: '' }]),
    ...options.map(opt => ({
      label: opt.label,
      value: opt.value,
    })),
  ];
  
  return (
    <FormGroup 
      label={label} 
      helperText={helperText} 
      intent={errors && Array.isArray(errors) && errors.length ? 'danger' : undefined}
    >
      <HTMLSelect
        value={data ?? ''}
        disabled={enabled === false}
        onChange={(e) => {
          const value = e.target.value;
          handleChange(path, value === '' ? undefined : value);
        }}
        options={selectOptions}
        fill
      />
    </FormGroup>
  );
};

export const BPDescriptorControl = withJsonFormsControlProps(BPDescriptorControlInner);
export default BPDescriptorControl;
