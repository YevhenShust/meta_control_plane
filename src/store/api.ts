// RTK Query API slice - provides caching and automatic invalidation
// Uses existing API facade to support VITE_USE_MOCK and centralized Axios handling

import { createApi } from '@reduxjs/toolkit/query/react';
import * as api from '../shared/api';
import type { DraftParsed, SchemaRecord } from '../shared/api';

// Custom base query that uses our existing API facade
// This ensures we keep using Axios with auth, headers, and mock fallback
const facadeBaseQuery = async () => ({ data: null });

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: facadeBaseQuery,
  tagTypes: ['Drafts', 'Schemas', 'Menu'],
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
        // Invalidate menu for this schema
        { type: 'Menu', id: `${arg.setupId}:${arg.schemaKey}` },
      ],
    }),

    // Update an existing draft
    updateDraft: builder.mutation<
      DraftParsed,
      { draftId: string; content: unknown; setupId: string; schemaId?: string; schemaKey?: string; prevContent?: unknown }
    >({
      queryFn: async (arg) => {
        try {
          const draft = await api.updateDraft(arg.draftId, arg.content);
          return { data: draft };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, _error, arg) => {
        const tags: Array<{ type: 'Drafts' | 'Menu'; id: string }> = [
          // Invalidate the list for this setup and schema
          { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` },
          { type: 'Drafts', id: `${arg.setupId}:all` },
        ];
        
        // Invalidate menu if schemaKey is provided (to handle label changes)
        if (arg.schemaKey) {
          // Check if content.Id changed (which affects menu labels)
          const prevId = arg.prevContent && typeof arg.prevContent === 'object' 
            ? (arg.prevContent as Record<string, unknown>)['Id'] 
            : undefined;
          const nextId = result && typeof result.content === 'object'
            ? (result.content as Record<string, unknown>)['Id']
            : undefined;
          
          // Invalidate menu if Id changed or if we can't determine the change
          if (prevId !== nextId || !arg.prevContent) {
            tags.push({ type: 'Menu', id: `${arg.setupId}:${arg.schemaKey}` });
          }
        }
        
        return tags;
      },
    }),

    // List menu items (lightweight) for a specific schema in a setup
    listMenuItems: builder.query<
      Array<{ id: string; label: string }>,
      { setupId: string; schemaKey: string }
    >({
      queryFn: async (arg) => {
        try {
          const drafts = await api.listDrafts(arg.setupId);
          // Resolve schemaId from schemaKey
          const schemas = await api.listSchemasV1(arg.setupId);
          let schemaId: string | null = null;
          for (const s of schemas) {
            const parsed = typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
            if (parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>)['$id'] === arg.schemaKey) {
              schemaId = String(s.id);
              break;
            }
          }
          if (!schemaId) return { data: [] };
          
          // Filter drafts by schemaId
          const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
          
          // Build menu items with labels from content.Id or draft.id
          const items = filtered.map(d => {
            let label = String(d.id ?? '');
            const content = d.content;
            if (content && typeof content === 'object') {
              const id = (content as Record<string, unknown>)['Id'];
              if (typeof id === 'string' && id.trim()) {
                label = id.trim();
              }
            }
            return { id: String(d.id), label };
          });
          
          return { data: items };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Menu', id: `${arg.setupId}:${arg.schemaKey}` }
      ],
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
