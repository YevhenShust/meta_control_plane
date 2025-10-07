import { createApi } from '@reduxjs/toolkit/query/react';
import * as api from '../shared/api';
import type { DraftParsed, SchemaParsed } from '../shared/api';

// RTK Query API slice with custom queryFn to reuse our existing API facade
// This maintains support for VITE_USE_MOCK and keeps the Axios-based HTTP layer

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: async () => ({ data: null }), // dummy base query (we use queryFn)
  tagTypes: ['Drafts', 'Schemas'],
  endpoints: (builder) => ({
    // List drafts for a setup with optional filtering
    listDrafts: builder.query<DraftParsed[], { setupId: string; schemaId?: string; params?: { skip?: number; limit?: number } }>({
      queryFn: async (arg) => {
        try {
          const allDrafts = await api.listDrafts(arg.setupId, arg.params);
          // Filter by schemaId if provided
          const filtered = arg.schemaId 
            ? allDrafts.filter(d => String(d.schemaId || '') === String(arg.schemaId))
            : allDrafts;
          return { data: filtered };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` },
        { type: 'Drafts', id: `${arg.setupId}:all` }, // Also provide a general tag for invalidation
      ],
    }),

    // Create a draft
    createDraft: builder.mutation<DraftParsed, { setupId: string; schemaKey: string; content: unknown }>({
      queryFn: async (arg) => {
        try {
          const draft = await api.createDraft(arg.setupId, arg.schemaKey, arg.content);
          return { data: draft };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (_result, _error, arg) => {
        // Invalidate all drafts for this setup (we don't have schemaId at mutation time)
        return [{ type: 'Drafts', id: `${arg.setupId}:all` }];
      },
    }),

    // Update a draft
    updateDraft: builder.mutation<DraftParsed, { id: string; content: unknown; setupId: string; schemaId?: string }>({
      queryFn: async (arg) => {
        try {
          const draft = await api.updateDraft(arg.id, arg.content);
          return { data: draft };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Drafts', id: `${arg.setupId}:${arg.schemaId ?? 'all'}` },
        { type: 'Drafts', id: `${arg.setupId}:all` }, // Invalidate all for this setup
      ],
    }),

    // List schemas for a setup
    listSchemas: builder.query<SchemaParsed[], { setupId: string }>({
      queryFn: async (arg) => {
        try {
          const schemas = await api.listSchemasV1(arg.setupId);
          return { data: schemas as SchemaParsed[] };
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
} = apiSlice;
