// API facade - single entry point for all backend/mock operations
// Provides unified interface with automatic mock fallback

import type { DraftDto } from '../../types/draft';
import type { SchemaRecord } from '../../types/schema';
import type { SetupDto } from '../../types/setup';
import { listDraftsV1, createDraftV1, updateDraftV1 } from './drafts';
import { tryParseContent } from '../../core/parse';
import { resolveSchemaIdByKey } from '../../core/schemaKeyResolver';

// Re-export low-level V1 functions for backward compatibility
export { listDraftsV1, createDraftV1, updateDraftV1 } from './drafts';
export { listSchemasV1, getSchemaByIdV1, uploadSchemaV1 } from './schema';
export { listSetups, getSetupById, createSetup } from './setup';

// Re-export types
export type { DraftDto, SchemaRecord, SetupDto };

// Re-export utilities
export { useMock, loadMockData } from './utils';

// High-level facade functions with automatic parsing and schema resolution

/**
 * List drafts for a setup with automatic content parsing
 * @param setupId - The setup ID
 * @param params - Optional pagination params
 * @returns Array of drafts with parsed content
 */
export async function listDrafts(setupId: string, params?: { skip?: number; limit?: number }): Promise<DraftDto[]> {
  const drafts = await listDraftsV1(setupId, params);
  return drafts.map(draft => ({
    ...draft,
    content: tryParseContent(draft.content) as string,
  }));
}

/**
 * Create a draft with automatic schema ID resolution
 * @param setupId - The setup ID
 * @param schemaKey - The schema key (e.g., 'ChestDescriptor')
 * @param content - The draft content (will be stringified if needed)
 * @returns Created draft with parsed content
 */
export async function createDraft(setupId: string, schemaKey: string, content: unknown): Promise<DraftDto> {
  const schemaId = await resolveSchemaIdByKey(setupId, schemaKey);
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const draft = await createDraftV1(setupId, { schemaId, content: contentStr });
  return {
    ...draft,
    content: tryParseContent(draft.content) as string,
  };
}

/**
 * Update a draft with automatic content stringification
 * @param draftId - The draft ID
 * @param content - The draft content (will be stringified if needed)
 * @returns Updated draft with parsed content
 */
export async function updateDraft(draftId: string, content: unknown): Promise<DraftDto> {
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const draft = await updateDraftV1(draftId, contentStr);
  return {
    ...draft,
    content: tryParseContent(draft.content) as string,
  };
}
