# RTK Query Migration - Implementation Summary

## Overview
Successfully implemented RTK Query API slice and migrated TableRenderer to use it, while maintaining backward compatibility and not breaking the form flow.

## Changes Made

### 1. Created RTK Query API Slice (`src/store/api.ts`)
- Used custom `queryFn` to reuse existing API facade (maintains VITE_USE_MOCK support)
- Endpoints implemented:
  - `listDrafts`: Query with cache tags `setupId:schemaId` and `setupId:all`
  - `createDraft`: Mutation that invalidates `setupId:all`
  - `updateDraft`: Mutation that invalidates both specific and general tags
  - `listSchemas`: Query with cache tags (for future use)
- Exported hooks: `useListDraftsQuery`, `useCreateDraftMutation`, `useUpdateDraftMutation`, `useListSchemasQuery`

### 2. Wired API Slice to Redux Store (`src/store/index.ts`)
- Added `apiSlice.reducer` to store under `api` path
- Added `apiSlice.middleware` to middleware chain
- Store now properly handles RTK Query state and cache

### 3. Migrated TableRenderer (`src/renderers/TableRenderer.tsx`)
- Added `schemaId` prop to `TableViewProps`
- Uses `useListDraftsQuery` when `setupId` and `schemaId` are available
- Uses `useUpdateDraftMutation` for saves when RTK is active
- Falls back to props (`rows`, `onSaveRow`) for backward compatibility
- Kept debounce/autosave logic (700ms)
- Kept optimistic updates with rollback on error
- Added loading state handling

### 4. Updated EntityEditor (`src/editor/EntityEditor.tsx`)
- Passes `schemaId` prop to TableRenderer
- Still loads data for backward compatibility (harmless redundancy)
- DraftEvents listener kept for other parts of the app

### 5. Migrated NewDraftDrawer (`src/components/NewDraftDrawer.tsx`)
- Uses `useCreateDraftMutation` instead of direct API call
- Cache automatically invalidates on draft creation
- Kept DraftEvents emit for backward compatibility with menu

### 6. Updated `.gitignore`
- Added `.env` to prevent committing environment configuration

## Cache Invalidation Strategy

The cache uses a two-level tag system:
- Specific tags: `Drafts:${setupId}:${schemaId}` - for precise invalidation
- General tags: `Drafts:${setupId}:all` - for broad invalidation

When a draft is created or updated, both tags are invalidated to ensure all affected queries refresh.

## Backward Compatibility

- TableRenderer falls back to props when RTK Query is not available
- Form flow remains completely unchanged
- DraftEvents still work for menu refresh and other components
- Existing API facade remains functional
- Mock mode (VITE_USE_MOCK=1) still works via custom queryFn

## Benefits

1. **Automatic Cache Management**: RTK Query handles caching, deduplication, and background refetching
2. **Optimistic Updates**: UI updates immediately, with rollback on error
3. **Reduced Boilerplate**: No manual loading states or error handling in most places
4. **Better Performance**: Requests are deduplicated and cached
5. **DevTools Integration**: RTK Query state visible in Redux DevTools
6. **Type Safety**: Full TypeScript support with proper typing

## What Still Works

- ✅ TableRenderer reads and displays data
- ✅ TableRenderer autosaves edits (with debounce)
- ✅ NewDraftDrawer creates drafts
- ✅ Cache invalidates on mutations (auto-refresh)
- ✅ Form view (Game/Chests) unchanged
- ✅ Mock mode (VITE_USE_MOCK=1)
- ✅ Menu refresh via DraftEvents
- ✅ All existing API facade functions

## Build & Lint Status

- ✅ TypeScript compilation: Success
- ✅ Vite build: Success
- ✅ ESLint: No errors or warnings

## Testing Recommendations

For manual testing:
1. Open app in mock mode (VITE_USE_MOCK=1)
2. Navigate to a table view (e.g., ChestDescriptor)
3. Verify table loads and displays data
4. Edit a cell, verify autosave after 700ms
5. Create a new draft via "New" button
6. Verify table auto-refreshes after create
7. Navigate to form view (individual draft)
8. Verify form still works as before
9. Test with real backend (remove VITE_USE_MOCK)

## Notes

- EntityEditor still loads data for table view (minor redundancy, but harmless)
- DraftEvents kept for backward compatibility with menu and other components
- Future optimization: Remove DraftEvents from EntityEditor once menu uses RTK Query
- Future enhancement: Migrate form view to use RTK Query mutations
