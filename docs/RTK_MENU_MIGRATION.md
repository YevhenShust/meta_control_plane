# RTK Query Menu Migration

## Overview

The menu system has been migrated from legacy DraftEvents + Axios facade to RTK Query for automatic cache management and invalidation.

## What Changed

### Before (Legacy)
- Menu data was fetched using direct `listDrafts()` API calls
- Manual event emitters (`DraftEvents.emitChanged()`) notified menu components of changes
- Components subscribed to events using `DraftEvents.onChanged()`
- No automatic caching or deduplication

### After (RTK Query)
- Menu data is fetched using `useListMenuItemsQuery` hook
- RTK Query automatically manages caching, deduplication, and refetching
- Menu refreshes automatically when cache is invalidated by mutations
- No manual event system needed

## Architecture

### RTK Query Endpoint

**Endpoint**: `listMenuItems`

```typescript
listMenuItems: builder.query<
  Array<{ id: string; label: string }>,
  { setupId: string; schemaKey: string }
>
```

**Input**:
- `setupId`: The setup ID to filter drafts
- `schemaKey`: The schema key (e.g., 'ChestDescriptor', 'NpcDescriptor')

**Output**: Array of menu items with:
- `id`: Draft ID
- `label`: Human-readable label extracted from `content.Id` or `content.name`

**Cache Tag**: `{ type: 'Menu', id: 'setupId:schemaKey' }`

### Cache Invalidation

The menu cache is automatically invalidated when:

1. **Creating a new draft** (`createDraft` mutation):
   - Invalidates: `Menu:setupId:schemaKey`
   - Result: New menu item appears automatically

2. **Updating a draft in form view** (`updateDraft` mutation with `schemaKey`):
   - Invalidates: `Menu:setupId:schemaKey`
   - Result: Menu label updates if content.Id changed

3. **Updating a draft in table view** (`updateDraft` mutation without `schemaKey`):
   - Does NOT invalidate menu
   - Result: Menu stays stable during table edits (as expected)

### Updated Components

#### `useDraftMenu` Hook

```typescript
// OLD: Manual loading with event subscriptions
const [items, setItems] = useState([]);
useEffect(() => {
  const off = onChanged(() => void doLoad());
  return off;
}, []);

// NEW: RTK Query with automatic refetching
const { data, isLoading, error, refetch } = useListMenuItemsQuery(
  { setupId, schemaKey },
  { skip: !setupId }
);
```

**Benefits**:
- Automatic deduplication across multiple hook instances
- Background refetching when cache is stale
- Built-in loading and error states
- Maintains backward-compatible API

#### `SidebarMenuContainer`

```typescript
// OLD: Direct API calls in loadDynamicChildren
const drafts = await listDrafts(setupId);
const filtered = drafts.filter(d => d.schemaId === schemaId);

// NEW: Uses RTK Query cache imperatively
const state = store.getState();
const cached = state.api.queries[cacheKey];
```

**Benefits**:
- Reuses cached data if available
- Automatically triggers fetch if not cached
- Menu updates when cache is refreshed

#### Mutation Updates

**NewDraftDrawer** and **EntityEditor**:

```typescript
// Form view updates (invalidates menu)
await updateDraft({ 
  draftId, 
  content, 
  setupId, 
  schemaId,
  schemaKey // Pass schemaKey to trigger menu refresh
}).unwrap();

// Table view updates (does NOT invalidate menu)
await updateDraft({ 
  draftId, 
  content, 
  setupId, 
  schemaId
  // No schemaKey = no menu refresh
}).unwrap();
```

### Removed Components

- **`DraftEvents.ts`**: Deleted (no longer needed)
- All `emitChanged()` calls removed
- All `onChanged()` subscriptions removed

## Usage Examples

### Using the Menu Hook

```typescript
import { useDraftMenu } from '../menu/useDraftMenu';

function MyComponent() {
  const { items, loading, error } = useDraftMenu({
    schemaKey: 'ChestDescriptor'
  });
  
  // items automatically refresh when drafts are created/updated
  return <Menu items={items} />;
}
```

### Querying Menu Items Directly

```typescript
import { useListMenuItemsQuery } from '../store/api';

function MyComponent() {
  const { data: menuItems, isLoading } = useListMenuItemsQuery({
    setupId: 'my-setup-id',
    schemaKey: 'NpcDescriptor'
  });
  
  return <div>{menuItems?.length} items</div>;
}
```

### Triggering Menu Refresh

Menu refresh happens automatically through cache invalidation. No manual refresh needed!

If you need to manually refetch:

```typescript
const { refetch } = useListMenuItemsQuery({ setupId, schemaKey });

// Manually trigger refetch
await refetch();
```

## Benefits

1. **Automatic Cache Management**: RTK Query handles caching, deduplication, and refetching
2. **Type Safety**: Full TypeScript support with inferred types
3. **Performance**: Automatic request deduplication and background refetching
4. **Developer Experience**: No manual event system to maintain
5. **Debugging**: Built-in Redux DevTools support for inspecting cache state
6. **Testing**: Easier to test with RTK Query's built-in testing utilities

## Migration Checklist

- [x] Add "Menu" tag type to RTK Query API slice
- [x] Create `listMenuItems` endpoint
- [x] Update `createDraft` mutation to invalidate Menu tags
- [x] Update `updateDraft` mutation to conditionally invalidate Menu tags
- [x] Refactor `useDraftMenu` to use RTK Query
- [x] Refactor `SidebarMenuContainer` to use RTK Query
- [x] Remove `emitChanged` calls from NewDraftDrawer
- [x] Remove `emitChanged` calls from EntityEditor
- [x] Delete `DraftEvents.ts` file
- [x] Verify TypeScript compilation
- [x] Verify linting passes
- [x] Verify build succeeds

## Future Improvements

- Add optimistic updates for menu items
- Add pagination for large menu lists
- Add filtering and search capabilities
- Consider pre-fetching menu data for all schemas on setup load
