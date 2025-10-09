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
  tagTypes: ['Drafts', 'Schemas'],
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
        // Also invalidate any schema-specific lists (we don't know the schemaId yet)
      ],
    }),

    // Update an existing draft
    updateDraft: builder.mutation<
      DraftParsed,
      { draftId: string; content: unknown; setupId: string; schemaId?: string }
    >({
      queryFn: async (arg) => {
        try {
          const draft = await api.updateDraft(arg.draftId, arg.content);
          return { data: draft };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        // Invalidate the list for this setup and schema
        { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` },
        { type: 'Drafts', id: `${arg.setupId}:all` },
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

    // Search drafts by query string
    searchDrafts: builder.query<
      Array<{ id: string; label: string; value: string }>,
      { setupId: string; schemaId?: string; query?: string }
    >({
      queryFn: async (arg) => {
        try {
          const drafts = await api.listDrafts(arg.setupId);
          let filtered = arg.schemaId
            ? drafts.filter(d => String(d.schemaId || '') === String(arg.schemaId))
            : drafts;
          
          // Filter by query if provided
          if (arg.query && arg.query.trim()) {
            const q = arg.query.toLowerCase();
            filtered = filtered.filter(d => {
              const idMatch = String(d.id).toLowerCase().includes(q);
              const contentStr = JSON.stringify(d.content).toLowerCase();
              return idMatch || contentStr.includes(q);
            });
          }
          
          // Return id, label, and value format
          const results = filtered.map(d => ({
            id: String(d.id),
            label: String(d.id),
            value: String(d.id),
          }));
          
          return { data: results };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` }
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
  useSearchDraftsQuery,
} = apiSlice;
