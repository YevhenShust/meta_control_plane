// RTK Query API slice - provides caching and automatic invalidation
// Uses existing API facade to support VITE_USE_MOCK and centralized Axios handling

import { createApi } from '@reduxjs/toolkit/query/react';
import * as api from '../shared/api';
import type { DraftParsed, SchemaRecord } from '../shared/api';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';

// Custom base query that uses our existing API facade
// This ensures we keep using Axios with auth, headers, and mock fallback
const facadeBaseQuery = async () => ({ data: null });

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: facadeBaseQuery,
  tagTypes: ['Drafts', 'Schemas', 'MenuItems'],
  endpoints: (builder) => ({
    // List drafts for a setup with optional schema filtering
    listDrafts: builder.query<
      DraftParsed[],
      { setupId: string; schemaId?: string; params?: { skip?: number; limit?: number } }
    >({
      queryFn: async (arg) => {
        try {
          const drafts = await api.listDrafts(arg.setupId, arg.params);
          // Filter by schemaId if provided
          const filtered = arg.schemaId
            ? drafts.filter(d => String(d.schemaId || '') === String(arg.schemaId))
            : drafts;
          return { data: filtered };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` }
      ],
    }),

    // Create a new draft
    createDraft: builder.mutation<
      DraftParsed,
      { setupId: string; schemaKey: string; content: unknown }
    >({
      queryFn: async (arg) => {
        try {
          const draft = await api.createDraft(arg.setupId, arg.schemaKey, arg.content);
          return { data: draft };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        // Invalidate the list for this setup and the specific schema
        { type: 'Drafts', id: `${arg.setupId}:all` },
        // Invalidate menu items for this schema key
        { type: 'MenuItems', id: `${arg.setupId}:${arg.schemaKey}` },
        // Also invalidate any schema-specific lists (we don't know the schemaId yet)
      ],
    }),

    // Update an existing draft
    updateDraft: builder.mutation<
      DraftParsed,
      { draftId: string; content: unknown; setupId: string; schemaId?: string; schemaKey?: string }
    >({
      queryFn: async (arg) => {
        try {
          const draft = await api.updateDraft(arg.draftId, arg.content);
          return { data: draft };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (_result, _error, arg) => {
        const tags: Array<{ type: 'Drafts' | 'MenuItems'; id: string }> = [
          // Invalidate the list for this setup and schema
          { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` },
          { type: 'Drafts', id: `${arg.setupId}:all` },
        ];
        
        // If schemaKey is provided, invalidate specific menu items
        if (arg.schemaKey) {
          tags.push({ type: 'MenuItems', id: `${arg.setupId}:${arg.schemaKey}` });
        }
        
        return tags;
      },
    }),

    // List schemas for a setup
    listSchemas: builder.query<
      SchemaRecord[],
      { setupId: string; params?: { skip?: number; limit?: number } }
    >({
      queryFn: async (arg) => {
        try {
          const schemas = await api.listSchemasV1(arg.setupId, arg.params);
          return { data: schemas as SchemaRecord[] };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Schemas', id: arg.setupId }
      ],
    }),

    // List menu items for a schema key - specialized endpoint for menu building
    // Resolves schemaKey to schemaId via cached resolver, then returns menu-ready items
    listMenuItems: builder.query<
      { id: string; label: string }[],
      { setupId: string; schemaKey: string; titleSelector?: (content: unknown, draft: DraftParsed) => string }
    >({
      queryFn: async (arg) => {
        try {
          // Resolve schema ID via cached resolver
          const schemaId = await resolveSchemaIdByKey(arg.setupId, arg.schemaKey);
          
          // List all drafts for this setup
          const drafts = await api.listDrafts(arg.setupId);
          
          // Filter by schemaId
          const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
          
          // Build menu items with labels
          const items = filtered.map(d => {
            const content = d.content ?? {};
            let label = String(d.id);
            
            // Use custom title selector if provided
            if (arg.titleSelector) {
              const customLabel = arg.titleSelector(content, d);
              if (customLabel && customLabel.trim()) {
                label = customLabel.trim();
              }
            } else {
              // Default: try content.Id, fall back to draft.id
              const id: unknown = content && typeof content === 'object' && content !== null && 'Id' in content 
                ? (content as Record<string, unknown>).Id 
                : '';
              const idStr = (typeof id === 'string' ? id : '').trim();
              label = idStr || String(d.id);
            }
            
            return {
              id: String(d.id),
              label
            };
          });
          
          return { data: items };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        // Tag by setupId and schemaKey so cache invalidates when drafts change
        { type: 'MenuItems', id: `${arg.setupId}:${arg.schemaKey}` },
        // Also link to Drafts tag for automatic invalidation
        { type: 'Drafts', id: `${arg.setupId}:all` },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useListDraftsQuery,
  useCreateDraftMutation,
  useUpdateDraftMutation,
  useListSchemasQuery,
  useListMenuItemsQuery,
} = apiSlice;
