// Draft data transfer object - unified type for drafts across the app
export interface DraftDto {
  id: string;
  setupId: string;
  schemaId: string;
  content: unknown;
  created?: string;
  modified?: string;
}
