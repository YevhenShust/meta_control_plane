import type { ICellEditorParams } from 'ag-grid-community';

export interface OptionItem { label: string; value: string }

export type SelectEditorParams = ICellEditorParams & { enumValues: Array<string | OptionItem> };

export default {} as unknown;
