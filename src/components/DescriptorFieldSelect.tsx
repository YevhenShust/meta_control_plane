import { HTMLSelect, Button, Spinner, Intent } from '@blueprintjs/core';
import { useDescriptorOptionsReadable } from '../hooks/useDescriptorOptionsReadable';

interface DescriptorFieldSelectProps {
  /** Setup ID for fetching descriptor options */
  setupId: string | undefined;
  /** Optional prefix to filter descriptors (e.g., "Chest") */
  prefix?: string;
  /** Current selected value (descriptor ID) */
  value?: string;
  /** Callback when selection changes */
  onChange: (id: string) => void;
  /** Optional label for the select field */
  label?: string;
  /** Optional callback to open new draft drawer */
  onCreateNew?: () => void;
}

/**
 * Format a descriptor label for display
 * @param label - The label from the option
 * @returns Formatted label string
 */
function formatDescriptorLabel(label: string): string {
  return label;
}

/**
 * Handle select change event
 * @param event - Change event from select element
 * @param onChange - Callback to invoke with new value
 */
function handleSelectChange(
  event: React.ChangeEvent<HTMLSelectElement>,
  onChange: (id: string) => void
): void {
  onChange(event.target.value);
}

/**
 * Open the new draft drawer
 * @param onCreateNew - Optional callback to open new draft drawer
 */
function openNewDraftDrawer(onCreateNew?: () => void): void {
  if (onCreateNew) {
    onCreateNew();
  }
}

/**
 * Descriptor field selector component
 * Shows a dropdown of descriptor options with human-readable labels
 * Supports filtering by prefix and creating new drafts
 */
export default function DescriptorFieldSelect({
  setupId,
  prefix,
  value,
  onChange,
  label,
  onCreateNew,
}: DescriptorFieldSelectProps) {
  const { options, loading, error } = useDescriptorOptionsReadable(setupId, prefix);
  
  // Show loading spinner while fetching options
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {label && <label>{label}:</label>}
        <Spinner size={20} />
        <span style={{ fontSize: '14px', color: '#999' }}>Loading options...</span>
      </div>
    );
  }
  
  // Show error if loading failed
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {label && <label>{label}:</label>}
        <div style={{ color: '#d13913', fontSize: '14px' }}>
          Error loading options: {error}
        </div>
      </div>
    );
  }
  
  // Show "No drafts" button when no options available
  if (options.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {label && <label>{label}:</label>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#999' }}>
            No descriptors available
          </span>
          {onCreateNew && (
            <Button
              icon="add"
              intent={Intent.PRIMARY}
              small
              text="Create New"
              onClick={() => openNewDraftDrawer(onCreateNew)}
            />
          )}
        </div>
      </div>
    );
  }
  
  // Render select with options
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontWeight: 500 }}>{label}:</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <HTMLSelect
          value={value || ''}
          onChange={(e) => handleSelectChange(e, onChange)}
          style={{ flex: 1 }}
        >
          <option value="">-- Select a descriptor --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {formatDescriptorLabel(opt.label)}
            </option>
          ))}
        </HTMLSelect>
        {onCreateNew && (
          <Button
            icon="add"
            intent={Intent.PRIMARY}
            small
            title="Create new descriptor"
            onClick={() => openNewDraftDrawer(onCreateNew)}
          />
        )}
      </div>
    </div>
  );
}
