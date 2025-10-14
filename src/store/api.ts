// RTK Query API slice - provides caching and automatic invalidation
// Uses existing API facade to support VITE_USE_MOCK and centralized Axios handling

import { createApi } from '@reduxjs/toolkit/query/react';
import * as api from '../shared/api';
import type { DraftParsed, SchemaRecord, SetupDto } from '../shared/api';
import { loadSchemaByKey, resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import prepareSchemaForJsonForms from '../jsonforms/prepareSchema';

// Custom base query that uses our existing API facade
// This ensures we keep using Axios with auth, headers, and mock fallback
const facadeBaseQuery = async () => ({ data: null });

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: facadeBaseQuery,
  tagTypes: ['Drafts', 'Schemas', 'MenuItems', 'Setups'],
  endpoints: (builder) => ({
    // List setups
    listSetups: builder.query<
      SetupDto[],
      { params?: { skip?: number; limit?: number } } | void
    >({
      queryFn: async (arg) => {
        try {
          const setups = await api.listSetups(arg && 'params' in (arg as object) ? (arg as { params?: { skip?: number; limit?: number } }).params : undefined);
          return { data: setups as SetupDto[] };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: () => [{ type: 'Setups' as const }],
    }),

    // Get setup by id
    getSetupById: builder.query<
      SetupDto | null,
      { setupId: string }
    >({
      queryFn: async (arg) => {
        try {
          const s = await api.getSetupById(arg.setupId);
          return { data: s as SetupDto | null };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_res, _err, arg) => [{ type: 'Setups' as const, id: arg.setupId }],
    }),

    // Create setup
    createSetup: builder.mutation<
      SetupDto,
      { name: string }
    >({
      queryFn: async (arg) => {
        try {
          const created = await api.createSetup({ name: arg.name });
          return { data: created as SetupDto };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (res) => {
        const tags: Array<{ type: 'Setups'; id?: string }> = [{ type: 'Setups' } as const];
        if (res?.id) tags.push({ type: 'Setups', id: String(res.id) } as const);
        return tags;
      },
    }),
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

    // Prepared JSON Schema by schemaKey with server list resolution and local normalization
    getPreparedSchemaByKey: builder.query<
      { schemaId: string; schema: unknown },
      { setupId: string; schemaKey: string }
    >({
      queryFn: async (arg) => {
        try {
          const { id, json } = await loadSchemaByKey(arg.setupId, arg.schemaKey);
          const prepared = prepareSchemaForJsonForms(json);
          return { data: { schemaId: String(id), schema: prepared } };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Schemas', id: arg.setupId }
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
      invalidatesTags: (result, _error, arg) => [
        // Invalidate the draft list for this setup and the specific schema
        { type: 'Drafts', id: `${arg.setupId}:${result?.schemaId ?? 'all'}` },
        { type: 'Drafts', id: `${arg.setupId}:all` },
        // Always invalidate menu items when a draft is created
        { type: 'MenuItems', id: `${arg.setupId}:${arg.schemaKey}` },
      ],
    }),

    // Update an existing draft
    updateDraft: builder.mutation<
      DraftParsed,
      { draftId: string; content: unknown; setupId: string; schemaId?: string; schemaKey?: string; invalidateMenu?: boolean }
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
        // Only invalidate menu items if explicitly requested (when content.Id changed)
        if (arg.invalidateMenu && arg.schemaKey) {
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
          const schemas = await api.listSchemas(arg.setupId, arg.params);
          return { data: schemas as SchemaRecord[] };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Schemas', id: arg.setupId }
      ],
    }),

    // List menu items for a dynamic menu branch
    listMenuItems: builder.query<
      Array<{ id: string; label: string }>,
      { setupId: string; schemaKey: string }
    >({
      queryFn: async (arg) => {
        try {
          const schemaId = await resolveSchemaIdByKey(arg.setupId, arg.schemaKey);
          const drafts = await api.listDrafts(arg.setupId);
          const filtered = drafts.filter(d => String(d.schemaId || '') === String(schemaId));
          const items = filtered.map(d => {
            let label = String(d.id ?? '');
            const parsed = d.content;
            if (parsed && typeof parsed === 'object') {
              const asObj = parsed as Record<string, unknown>;
              label = String(asObj['Id'] ?? asObj['name'] ?? label);
            }
            return { id: String(d.id ?? ''), label };
          });
          return { data: items };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (_result, _error, arg) => [
        { type: 'MenuItems', id: `${arg.setupId}:${arg.schemaKey}` }
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
  useGetPreparedSchemaByKeyQuery,
  useListSetupsQuery,
  useGetSetupByIdQuery,
  useCreateSetupMutation,
} = apiSlice;
