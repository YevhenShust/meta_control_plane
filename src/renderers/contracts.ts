// Renderer contracts - stable interfaces for form and table renderers

/**
 * Props for table renderer component
 */
export interface TableRendererProps {
  schema: Record<string, unknown>;
  uischema?: Record<string, unknown>;
  rows: Array<{ id: string; content: unknown }>;
  onCellChange?: (rowId: string, patch: Record<string, unknown>) => void;
  onAutosave?: (rowId: string, fullRow: unknown) => Promise<void>;
}

/**
 * Props for form renderer component
 */
export interface FormRendererProps {
  schema: Record<string, unknown>;
  uischema?: Record<string, unknown>;
  data: unknown;
  onChange: (data: unknown) => void;
  onStatus?: (valid: boolean) => void;
}
