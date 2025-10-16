// API facade - single entry point for all backend/mock operations
// Provides unified interface with automatic mock fallback

import { listDraftsV1, createDraftV1, updateDraftV1 } from './drafts';
import { listSchemasV1, getSchemaByIdV1, uploadSchemaV1 } from './schema';
import { listSetupsV1, getSetupByIdV1, createSetupV1 } from './setup';
import { postAuthTokenV1 } from './auth';
import { resolveSchemaIdByKey } from '../../core/schemaKeyResolver';

// Facade types (type-only imports)
import type { DraftParsed } from './facade/draft';
import { normalizeDraft } from './facade/draft';
import type { SchemaParsed } from './facade/schema';
import { normalizeSchema } from './facade/schema';
import type { SetupParsed } from './facade/setup';
import { normalizeSetup } from './facade/setup';

// Do NOT re-export low-level V1 functions to prevent leaking API versions to consumers

// Re-export canonical application-level types from `src/types/*`
export type { SchemaRecord } from '../../types/schema';
export type { SetupDto } from '../../types/setup';
export type { AuthTokenResponse } from '../../types/auth';

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
 * List schemas for a setup with automatic content parsing (versionless facade).
 * This prevents leaking V1 details and centralizes normalization.
 */
export async function listSchemas(
  setupId: string,
  params?: { skip?: number; limit?: number }
): Promise<SchemaParsed[]> {
  const schemas = await listSchemasV1(setupId, params);
  return schemas.map(normalizeSchema) as SchemaParsed[];
}

/**
 * Versionless setups facade wrappers to align with drafts/schemas pattern.
 */
export async function listSetups(params?: { skip?: number; limit?: number }): Promise<SetupParsed[]> {
  const setups = await listSetupsV1(params);
  return setups.map(normalizeSetup) as SetupParsed[];
}

export async function getSetupById(setupId: string): Promise<SetupParsed | null> {
  const s = await getSetupByIdV1(setupId);
  return s ? normalizeSetup(s) : null;
}

export async function createSetup(body: Parameters<typeof createSetupV1>[0]): Promise<SetupParsed> {
  const s = await createSetupV1(body);
  return normalizeSetup(s);
}

/**
 * Versionless wrapper for getting a schema JSON by its ID within a setup.
 * Mirrors the v1 signature to avoid churn in consumers if used.
 */
export async function getSchemaById(schemaId: string, setupId: string): Promise<Awaited<ReturnType<typeof getSchemaByIdV1>>> {
  return await getSchemaByIdV1(schemaId, setupId);
}

/**
 * Versionless wrapper for uploading a schema to a setup.
 */
export async function uploadSchema(setupId: string, schema: unknown): Promise<Awaited<ReturnType<typeof uploadSchemaV1>>> {
  return await uploadSchemaV1(setupId, schema);
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
  // Defensive check: avoid sending requests with invalid draft ids (e.g. 'undefined')
  if (!draftId || String(draftId) === 'undefined') {
    const err = new Error(`Invalid draftId: ${String(draftId)}`);
    console.error('[api] updateDraft called with invalid draftId', draftId);
    throw err;
  }
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const draft = await updateDraftV1(draftId, contentStr);
  return normalizeDraft(draft) as DraftParsed;
}

/**
 * Versionless auth facade: issue token
 */
export async function loginRequest(username: string, password: string) {
  return await postAuthTokenV1({ username, password });
}
