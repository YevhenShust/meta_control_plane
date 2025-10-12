# RTK Query Menu Migration

## Overview

This document describes the migration of the menu and draft navigation system from legacy DraftEvents + Axios facade to RTK Query cache invalidation. This migration was completed in PR-6.

## Goals Achieved

✅ All menu-related state is now handled via RTK Query API layer  
✅ Menu auto-refresh works through RTK Query cache invalidation  
✅ No direct Axios or DraftEvents calls remain in menu code  
✅ Code is compact, readable, and fully type-safe  

## Architecture Changes

### Before (Legacy)

**Data Flow:**
1. Components called `listDrafts()` API facade directly
2. Manual event emitters (`DraftEvents.emitChanged()`) notified subscribers
3. Components subscribed to `DraftEvents.onChanged()` and manually refetched data
4. No caching, no deduplication, potential race conditions

**Problems:**
- Manual event management prone to bugs
- No automatic cache invalidation
- Duplicate API calls
- Complex lifecycle management
- Event subscriptions had to be manually cleaned up

### After (RTK Query)

**Data Flow:**
1. Components use `useListMenuItemsQuery({ setupId, schemaKey })`
2. RTK Query maintains normalized cache with tags
3. Mutations (`createDraft`, `updateDraft`) invalidate relevant tags
4. Cache invalidation triggers automatic refetch of affected queries
5. All queries deduplicated and cached automatically

**Benefits:**
- Automatic cache invalidation
- Built-in loading states and error handling
- Request deduplication
- Optimistic updates support
- Consistent data across components
- No manual cleanup required

## Key Components

### 1. RTK Query API Slice (`src/store/api.ts`)

#### New Endpoint: `listMenuItems`

```typescript
listMenuItems: builder.query<
  Array<{ id: string; label: string }>,
  { setupId: string; schemaKey: string }
>({
  queryFn: async (arg) => {
    // Fetch drafts and schemas
    // Filter by schemaKey
    // Build lightweight menu items with labels
  },
  providesTags: (_result, _error, arg) => [
    { type: 'Menu', id: `${arg.setupId}:${arg.schemaKey}` }
  ],
})
```

**Features:**
- Lightweight: returns only `{ id, label }[]` for menu rendering
- Derives labels from `content.Id` or falls back to `draft.id`
- Tags: `Menu:<setupId>:<schemaKey>` for granular invalidation

#### Updated Mutations

**`createDraft`:**
- Invalidates: `Drafts:<setupId>:all` and `Menu:<setupId>:<schemaKey>`
- New draft appears in menu automatically

**`updateDraft`:**
- Conditionally invalidates `Menu` tag only when `content.Id` changes
- Prevents unnecessary menu refreshes for non-label changes (e.g., table edits)
- Compares `prevContent.Id` vs `result.content.Id`

### 2. useDraftMenu Hook (`src/menu/useDraftMenu.ts`)

**Before:**
```typescript
// Manual API calls, event subscriptions, loading state management
const doLoad = async () => {
  const schemaId = await resolveSchemaIdByKey(selectedId, schemaKey);
  const all = await listDrafts(selectedId);
  const filtered = all.filter(d => d.schemaId === schemaId);
  setItems(filtered.map(...));
};

useEffect(() => {
  const off = onChanged((payload) => {
    if (payload.schemaKey === schemaKey) doLoad();
  });
  return off;
}, []);
```

**After:**
```typescript
// Simple RTK Query hook
const { data: menuItems, isLoading, error, refetch } = useListMenuItemsQuery(
  { setupId: selectedId || '', schemaKey },
  { skip: !selectedId }
);

const items = useMemo(() => {
  if (!menuItems) return [];
  return menuItems.map(item => ({
    title: item.label,
    kind: 'form',
    params: { schemaKey, draftId: item.id }
  }));
}, [menuItems, schemaKey]);
```

**Benefits:**
- Automatic refetch on cache invalidation
- Built-in loading/error states
- No manual subscriptions
- Request deduplication

### 3. SidebarMenuContainer (`src/components/sidebar/SidebarMenuContainer.tsx`)

**Before:**
```typescript
// Manual event subscription, loading logic
useEffect(() => {
  const off = onChanged((payload) => {
    // Find affected basePaths
    // Set refreshBasePath state
    // Clear after timeout
  });
  return off;
}, [setupId, selectedMenuPath]);

const loadDynamicChildren = async (basePath) => {
  const schemaId = await resolveSchemaIdByKey(setupId, schemaKey);
  const drafts = await listDrafts(setupId);
  // Filter, map, return
};
```

**After:**
```typescript
// Pre-subscribe to all dynamic form routes
const menuQueries = dynamicFormRoutes.map(([basePath, cfg]) => {
  const query = useListMenuItemsQuery(
    { setupId: setupId || '', schemaKey: cfg.schemaKey },
    { skip: !setupId }
  );
  return { basePath, schemaKey: cfg.schemaKey, query };
});

const loadDynamicChildren = (basePath) => {
  // Use cached data from RTK Query
  const menuQuery = menuQueries.find(q => q.basePath === basePath);
  return menuQuery?.query.data?.map(...) || [];
};
```

**Benefits:**
- All dynamic routes pre-subscribed (cache warming)
- Synchronous data access from cache
- No manual refresh logic
- No event subscriptions

### 4. EntityEditor (`src/editor/EntityEditor.tsx`)

**Before:**
```typescript
const save = async () => {
  const prevId = getContentId(snapshot);
  await updateDraft({ draftId, content: state.data });
  const nextId = getContentId(state.data);
  if (nextId !== prevId) {
    emitChanged({ schemaKey, setupId }); // Manual event
  }
};
```

**After:**
```typescript
const save = async () => {
  await updateDraft({
    draftId,
    content: state.data,
    setupId,
    schemaId: resolved?.schemaId,
    schemaKey,        // For menu invalidation
    prevContent: snapshot  // For comparison
  }).unwrap();
  // RTK Query handles cache invalidation automatically
};
```

**Benefits:**
- No manual event emission
- Cache invalidation happens in mutation
- Cleaner, more maintainable code

## Tagging Strategy

### Tag Types

1. **`Drafts`** - Full draft data for tables and forms
   - Format: `Drafts:<setupId>:<schemaId|'all'>`
   - Invalidated by: `createDraft`, `updateDraft`

2. **`Schemas`** - Schema definitions
   - Format: `Schemas:<setupId>`
   - Rarely invalidated

3. **`Menu`** (NEW) - Lightweight menu items
   - Format: `Menu:<setupId>:<schemaKey>`
   - Invalidated by: `createDraft` (always), `updateDraft` (when Id changes)

### Invalidation Rules

| Action | Invalidates | Result |
|--------|-------------|--------|
| Create draft | `Drafts:<setupId>:all`<br/>`Menu:<setupId>:<schemaKey>` | New leaf appears in menu and table |
| Update draft (Id changed) | `Drafts:<setupId>:<schemaId>`<br/>`Menu:<setupId>:<schemaKey>` | Menu label updates, form/table refresh |
| Update draft (Id unchanged) | `Drafts:<setupId>:<schemaId>` | Form/table refresh, menu stays same |

## Performance Considerations

### Optimizations

1. **Lightweight Menu Endpoint**
   - Returns only `{ id, label }[]` instead of full draft objects
   - Reduces data transfer and parsing overhead

2. **Request Deduplication**
   - RTK Query automatically deduplicates concurrent requests
   - Multiple components can use same query without extra API calls

3. **Selective Invalidation**
   - Menu only refreshes when necessary (create or Id change)
   - Table edits don't trigger menu refresh

4. **Cache Warming**
   - SidebarMenuContainer pre-subscribes to all dynamic routes
   - Data ready immediately when user expands menu

### Cache Behavior

- **Default cache time:** 60 seconds (RTK Query default)
- **Refetch on focus:** Disabled (can be enabled if needed)
- **Refetch on reconnect:** Enabled
- **Stale while revalidate:** Yes

## Migration Checklist

✅ Add "Menu" tag type to RTK Query API slice  
✅ Create `listMenuItems` endpoint  
✅ Update `createDraft` to invalidate Menu tags  
✅ Update `updateDraft` to conditionally invalidate Menu tags  
✅ Refactor `useDraftMenu` to use RTK Query  
✅ Refactor `SidebarMenuContainer` to use RTK Query  
✅ Remove `emitChanged` calls from `EntityEditor`  
✅ Remove `emitChanged` calls from `NewDraftDrawer` handler  
✅ Delete `src/shared/events/DraftEvents.ts`  
✅ Delete `src/shared/events/StoreBridge.ts`  
✅ Verify TypeScript compilation  
✅ Verify linting  
✅ Documentation complete  

## Testing

### Manual Test Cases

1. **Create new draft**
   - ✅ New item appears in menu immediately
   - ✅ No page refresh required

2. **Edit draft (change Id)**
   - ✅ Menu label updates automatically
   - ✅ Form shows updated data

3. **Edit draft (keep same Id)**
   - ✅ Menu label stays same
   - ✅ Form shows updated data
   - ✅ No unnecessary menu refresh

4. **Table edit (Chest in Location)**
   - ✅ Table row updates
   - ✅ Menu does NOT refresh (optimization)

5. **Multiple tabs/views**
   - ✅ Changes in one view reflected in other views
   - ✅ Single source of truth from cache

## Backward Compatibility

### API Facade

The existing API facade in `src/shared/api/` remains intact for backward compatibility:
- `listDrafts()`, `createDraft()`, `updateDraft()` still available
- Marked as legacy but not removed
- RTK Query uses these internally

### Migration Path

This PR completes the menu migration. Previous PRs:
- **PR-5:** Migrated TableRenderer and EntityEditor to RTK Query
- **PR-6:** This PR - Migrated menu system

No further DraftEvents usage remains in the codebase.

## Future Enhancements

1. **Optimistic Updates**
   - Could add optimistic updates to menu on create/update
   - Would make UI feel even more responsive

2. **Pagination**
   - Menu endpoint could support pagination for large draft lists
   - Currently loads all items (acceptable for most use cases)

3. **Search/Filter**
   - Could add search parameter to menu endpoint
   - Would enable client-side filtering in sidebar

4. **Websocket Integration**
   - Could add websocket support for real-time updates
   - Would refresh cache on server-side changes

## Troubleshooting

### Menu Not Updating

**Problem:** Menu doesn't show new draft after creation

**Solution:** Check that:
1. `createDraft` mutation includes `schemaKey` in arguments
2. Mutation invalidates `Menu:<setupId>:<schemaKey>` tag
3. Component is subscribed with correct `setupId` and `schemaKey`

### Stale Data

**Problem:** Menu shows old data after edit

**Solution:** Check that:
1. `updateDraft` includes `schemaKey` and `prevContent`
2. Mutation compares `content.Id` correctly
3. Menu tag is being invalidated

### Performance Issues

**Problem:** Too many API calls

**Solution:**
1. Check for duplicate subscriptions (use Redux DevTools)
2. Verify request deduplication is working
3. Consider increasing cache time if data rarely changes

## Conclusion

The migration to RTK Query provides a more robust, maintainable, and performant menu system. All state management is centralized in the Redux store, cache invalidation is automatic, and the code is significantly cleaner.

No manual event management or direct API calls remain in the menu code. The system is fully type-safe and ready for future enhancements.
