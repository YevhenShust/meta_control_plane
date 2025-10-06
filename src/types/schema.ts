// Re-export canonical SchemaDto from the API module (generated from OpenAPI).
// Code that previously consumed SchemaRecord can import SchemaRecord and it will refer to SchemaDto.
export type { SchemaDto as SchemaRecord } from '../shared/api/schema';
