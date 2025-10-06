// API facade - single entry point for all backend/mock operations
// Provides unified interface with automatic mock fallback

import type { DraftDto } from '../../types/draft';
import type { SchemaRecord } from '../../types/schema';
import type { SetupDto } from '../../types/setup';

// Re-export existing API functions
export { listDraftsV1, createDraftV1, updateDraftV1 } from './drafts';
export { listSchemasV1, getSchemaByIdV1, uploadSchemaV1 } from './schema';
export { listSetups, getSetupById, createSetup } from './setup';

// Re-export types
export type { DraftDto, SchemaRecord, SetupDto };

// Re-export utilities
export { useMock, loadMockData } from './utils';
