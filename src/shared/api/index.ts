// API facade - single entry point for all backend/mock operations
// Provides unified interface with automatic mock fallback

import { listDraftsV1, createDraftV1, updateDraftV1 } from './drafts';
import { resolveSchemaIdByKey } from '../../core/schemaKeyResolver';

// Facade types (type-only imports)
import type { DraftParsed } from './facade/draft';
import { normalizeDraft } from './facade/draft';
import type { SchemaParsed } from './facade/schema';
import type { SetupParsed } from './facade/setup';

// Re-export low-level V1 functions for backward compatibility
export { listDraftsV1, createDraftV1, updateDraftV1 } from './drafts';
export { listSchemasV1, getSchemaByIdV1, uploadSchemaV1 } from './schema';
export { listSetups, getSetupById, createSetup } from './setup';

// Re-export canonical application-level types from `src/types/*`
export type { SchemaRecord } from '../../types/schema';
export type { SetupDto } from '../../types/setup';

// Re-export facade parsed types (for consumers that want parsed shapes)
export type { DraftParsed, SchemaParsed, SetupParsed };

// Re-export utilities
export { useMock, loadMockData } from './utils';

// High-level facade functions with automatic parsing and schema resolution

/**
 * List drafts for a setup with automatic content parsing
 * @param setupId - The setup ID
 * @param params - Optional pagination params
 * @returns Array of drafts with parsed content
 */
// normalizeDraft is provided by ./facade/draft

export async function listDrafts(setupId: string, params?: { skip?: number; limit?: number }): Promise<DraftParsed[]> {
  const drafts = await listDraftsV1(setupId, params);
  return drafts.map(normalizeDraft) as DraftParsed[];
}

/**
 * Create a draft with automatic schema ID resolution
 * @param setupId - The setup ID
 * @param schemaKey - The schema key (e.g., 'ChestDescriptor')
 * @param content - The draft content (will be stringified if needed)
 * @returns Created draft with parsed content
 */
export async function createDraft(setupId: string, schemaKey: string, content: unknown): Promise<DraftParsed> {
  const schemaId = await resolveSchemaIdByKey(setupId, schemaKey);
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  try {
    console.debug('[api] createDraft content preview', contentStr.slice(0, 2000));
  } catch (e) {
    console.debug('[api] createDraft preview error', e);
  }
  const draft = await createDraftV1(setupId, { schemaId, content: contentStr });
  return normalizeDraft(draft) as DraftParsed;
}

/**
 * Update a draft with automatic content stringification
 * @param draftId - The draft ID
 * @param content - The draft content (will be stringified if needed)
 * @returns Updated draft with parsed content
 */
export async function updateDraft(draftId: string, content: unknown): Promise<DraftParsed> {
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  try {
    console.debug('[api] updateDraft content preview', contentStr.slice(0, 2000));
  } catch (e) {
    console.debug('[api] updateDraft preview error', e);
  }
  const draft = await updateDraftV1(draftId, contentStr);
  return normalizeDraft(draft) as DraftParsed;
}
