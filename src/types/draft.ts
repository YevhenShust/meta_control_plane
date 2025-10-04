// Draft data transfer object - unified type for drafts across the app
// Based on OpenAPI schema but simplified for internal use
export interface DraftDto {
  id: string;
  setupId: string;
  schemaId: string;
  content: unknown; // Can be string or parsed object
  created?: string;
  modified?: string;
}
