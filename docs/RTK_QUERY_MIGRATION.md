# RTK Query Migration: Draft Menu System

## Overview

The draft menu system has been migrated from legacy event-driven Axios calls to RTK Query for better caching, automatic invalidation, and improved developer experience.

## What Changed

### Before (Legacy)
- Manual API calls via `listDrafts()` and `resolveSchemaIdByKey()`
- Event-driven updates via `DraftEvents.onChanged()`
- Manual state management (loading, error, items)
- No caching or deduplication

### After (RTK Query)
- Centralized `listMenuItems` RTK Query endpoint
- Automatic cache invalidation on draft create/update
- Built-in loading/error states
- In-memory schema key resolution cache
- Automatic re-fetching when data changes

## Key Features

### 1. RTK Query Endpoint: `listMenuItems`

Located in `src/store/api.ts`, this endpoint:
- **Input**: `{ setupId: string; schemaKey: string; titleSelector?: function }`
- **Output**: `{ id: string; label: string }[]`
- **Caching**: Tagged with `MenuItems` and `Drafts` for automatic invalidation
- **Schema Resolution**: Uses cached resolver for performance

### 2. In-Memory Schema Cache

Located in `src/core/schemaKeyResolver.ts`:
```typescript
// Cache format: "setupId:schemaKey" → schemaId
const schemaIdCache = new Map<string, string>();

// Clear cache if needed (e.g., on schema updates)
clearSchemaCache();
```

### 3. Updated Hook: `useDraftMenu`

The hook interface remains **identical** for backward compatibility:
```typescript
const { items, loading, error, refresh, ensureLoaded, loadNow } = useDraftMenu({
  schemaKey: 'ChestDescriptor',
  titleSelector: (content, draft) => content.Id || draft.id
});
```

**By default**, it uses RTK Query mode for automatic updates.

## Rollback Safety

### Using Legacy Mode

If issues arise, you can switch to legacy mode:

```typescript
const { items, loading, error } = useDraftMenu({
  schemaKey: 'ChestDescriptor',
  useLegacyMode: true  // ⚠️ Use event-driven mode
});
```

**When to use legacy mode:**
- During initial rollout to verify behavior
- If RTK Query invalidation causes issues
- For debugging or comparison purposes

**Note**: Legacy mode still works but bypasses RTK Query caching benefits.

## Automatic Cache Invalidation

Menu items automatically refresh when:

1. **Draft Created**: `createDraft` mutation invalidates:
   - `{ type: 'Drafts', id: 'setupId:all' }`
   - `{ type: 'MenuItems', id: 'setupId:schemaKey' }`

2. **Draft Updated**: `updateDraft` mutation invalidates:
   - `{ type: 'Drafts', id: 'setupId:schemaId' }`
   - `{ type: 'Drafts', id: 'setupId:all' }`
   - `{ type: 'MenuItems', id: 'setupId:schemaKey' }` (if schemaKey provided)

3. **Schema Key Change**: Changing `schemaKey` prop triggers new query

## Migration Checklist

- [x] Add in-memory caching to `schemaKeyResolver`
- [x] Create `listMenuItems` RTK Query endpoint
- [x] Update `useDraftMenu` to use RTK Query with legacy fallback
- [x] Pass `schemaKey` to all `updateDraft` calls
- [x] Update invalidation tags in mutations
- [x] Verify build and lint pass

## Components Updated

1. **`src/store/api.ts`**
   - Added `listMenuItems` endpoint
   - Updated `createDraft` and `updateDraft` invalidation tags
   - Added `MenuItems` tag type

2. **`src/core/schemaKeyResolver.ts`**
   - Added `schemaIdCache` and `schemaDataCache` Maps
   - Updated `resolveSchemaIdByKey` and `loadSchemaByKey` with caching
   - Added `clearSchemaCache()` utility

3. **`src/menu/useDraftMenu.ts`**
   - Integrated RTK Query with `useListMenuItemsQuery`
   - Kept legacy implementation for rollback
   - Added `useLegacyMode` flag

4. **`src/editor/EntityEditor.tsx`**
   - Pass `schemaKey` to `updateDraft` calls

5. **`src/renderers/TableRenderer.tsx`**
   - Pass `schemaKey` to `updateDraft` calls

6. **`src/components/NewDraftDrawer.tsx`**
   - Pass `schemaKey` to `updateDraft` calls

## Performance Benefits

1. **Caching**: Schema resolution cached in memory (Map-based)
2. **Deduplication**: Multiple components requesting same data share cache
3. **Automatic Updates**: No manual event subscription needed
4. **Optimistic UI**: RTK Query supports optimistic updates if needed

## Monitoring

In development mode, debug logs show:
- Cache hits/misses for schema resolution
- RTK Query fetch status and invalidation
- Legacy mode activation (if used)

## Future Improvements

1. Consider migrating `SidebarMenuContainer` to use `listMenuItems` directly
2. Add optimistic updates for draft creation
3. Implement background refetching for stale data
4. Add retry logic for failed queries
5. Remove legacy event system once migration is stable

## Questions?

For issues or questions, refer to:
- RTK Query docs: https://redux-toolkit.js.org/rtk-query/overview
- Source code in `src/store/api.ts` and `src/menu/useDraftMenu.ts`
