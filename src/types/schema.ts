// Schema record - unified type for schemas across the app
export interface SchemaRecord {
  id: string;
  setupId: string;
  name?: string | null;
  content: string | Record<string, unknown>;
  created?: string;
  modified?: string;
}
