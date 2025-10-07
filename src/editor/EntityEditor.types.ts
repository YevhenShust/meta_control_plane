export type ViewKind = 'form' | 'table';

export interface EditorIds {
  setupId: string;
  draftId?: string; // required for 'form'
  schemaKey: string;
}

export interface EditorResolvedIds extends EditorIds {
  schemaId: string;
}

export interface EditorDataState<T = unknown> {
  data: T | null;
  isDirty: boolean;
  isValid: boolean;
  loading: boolean;
  error?: string;
}

export interface EditorSaveOutcome {
  ok: boolean;
  error?: string;
}

export interface EditorController<T = unknown> {
  state: EditorDataState<T>;
  setData(next: T): void;
  setDirty(dirty: boolean): void;
  setValid(valid: boolean): void;
  reset(): void;
  save(): Promise<EditorSaveOutcome>;
  saveRow?(rowId: string, nextRow: unknown): Promise<EditorSaveOutcome>;
}

export interface EntityEditorProps {
  ids: EditorIds;
  view: ViewKind;
}

export interface FormViewProps<T = unknown> {
  data: T | null;
  schema: object;
  uischema?: object;
  ajv: import('ajv').Ajv;
  readonly?: boolean;

  onChange(next: T | null): void;
  onStatus?(s: { dirty: boolean; valid: boolean }): void;

  onSave(): Promise<EditorSaveOutcome>;
  onReset(): void;
}

export interface TableViewProps<Row = unknown> {
  rows: Row[];
  schema: object;
  uischema?: object;
  ajv: import('ajv').Ajv;
  /** setupId for backend requests (optional) */
  setupId?: string;
  /** schemaKey of the current table (optional) */
  schemaKey?: string;
  /** schemaId of the current table (optional, for RTK Query) */
  schemaId?: string;

  onEdit(rowId: string, patch: Partial<Row> | Row): void;
  onSaveRow(rowId: string, nextRow: Row): Promise<EditorSaveOutcome>;
  /** Optional: invoked when the user wants to create a new draft from the table UI */
  onCreate?: () => void;
}
