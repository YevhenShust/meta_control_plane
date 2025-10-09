# DescriptorId Dropdown: Visual Flowchart

## Feature Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TableRenderer Component                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────┐
         │  1. Identify DescriptorId Columns          │
         │  Filter: /DescriptorId$/i.test(path)       │
         │  Example: "ChestDescriptorId" → matched    │
         └────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────┐
         │  2. Extract Property Names                 │
         │  Transform: remove "Id" suffix             │
         │  "ChestDescriptorId" → "ChestDescriptor"   │
         └────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────┐
         │  3. Batch Load Options                     │
         │  useDescriptorOptionsForColumns(...)       │
         │  Input: ["ChestDescriptor", "ItemDesc..."] │
         └────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                useDescriptorOptionsForColumns Hook                 │
├───────────────────────────────────────────────────────────────────┤
│  For each property name:                                          │
│    ┌────────────────────────────────────────────────┐            │
│    │  3a. Check Cache (5 min TTL)                   │            │
│    │  Key: "setupId:schemaKey:propertyName"         │            │
│    └────────────────────────────────────────────────┘            │
│                      │                                            │
│                      ▼                                            │
│    ┌────────────────────────────────────────────────┐            │
│    │  3b. Resolve Schema ID via Heuristics          │            │
│    │  "ChestDescriptor" → Try schema resolution     │            │
│    └────────────────────────────────────────────────┘            │
│                      │                                            │
│                      ▼                                            │
│    ┌────────────────────────────────────────────────┐            │
│    │  3c. Fetch Drafts (listDrafts API)            │            │
│    │  Filter by resolved schemaId                   │            │
│    └────────────────────────────────────────────────┘            │
│                      │                                            │
│                      ▼                                            │
│    ┌────────────────────────────────────────────────┐            │
│    │  3d. Map to Options                            │            │
│    │  draft.id + draft.content.Id → {label, value}  │            │
│    └────────────────────────────────────────────────┘            │
│                      │                                            │
│                      ▼                                            │
│    ┌────────────────────────────────────────────────┐            │
│    │  3e. Cache & Return                            │            │
│    │  Store in global cache for reuse               │            │
│    └────────────────────────────────────────────────┘            │
│                                                                   │
│  Returns: { map: { "ChestDescriptor": [options] } }              │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────┐
         │  4. Merge Options into Columns             │
         │  column.enumValues = descriptorOptions     │
         └────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────────┐
         │  5. Configure AG Grid Column               │
         │  cellEditor: "agSelectCellEditor"          │
         │  cellEditorParams: { values: [...] }       │
         │  valueFormatter: id → label                │
         └────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                          AG Grid Table                             │
├───────────────────────────────────────────────────────────────────┤
│  Column: ChestDescriptorId                                        │
│  ┌──────────────────────────────────────────────────┐            │
│  │  Display: "Wooden Chest (123)"           [▼]     │            │
│  └──────────────────────────────────────────────────┘            │
│           │                                                       │
│           │ (user clicks)                                         │
│           ▼                                                       │
│  ┌──────────────────────────────────────────────────┐            │
│  │  ┌────────────────────────────────────────────┐  │            │
│  │  │  Wooden Chest (123)                    ✓   │  │            │
│  │  │  Iron Chest (456)                          │  │            │
│  │  │  Golden Chest (789)                        │  │            │
│  │  └────────────────────────────────────────────┘  │            │
│  └──────────────────────────────────────────────────┘            │
│           │                                                       │
│           │ (user selects "Iron Chest (456)")                     │
│           ▼                                                       │
│  ┌──────────────────────────────────────────────────┐            │
│  │  valueSetter: params.newValue = "IronChest"      │            │
│  │  handleCellChange(rowId, path, "IronChest")      │            │
│  └──────────────────────────────────────────────────┘            │
│           │                                                       │
│           ▼                                                       │
│  ┌──────────────────────────────────────────────────┐            │
│  │  RTK Mutation: updateDraft({ content: {...} })   │            │
│  └──────────────────────────────────────────────────┘            │
│           │                                                       │
│           ▼                                                       │
│  ┌──────────────────────────────────────────────────┐            │
│  │  Display: "Iron Chest (456)" (via valueFormatter)│            │
│  └──────────────────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────────────┘
```

## Key Points

1. **Automatic Detection**: No configuration needed - columns ending with "DescriptorId" are automatically enhanced
2. **Efficient Loading**: All options loaded in parallel, cached globally
3. **User-Friendly**: Displays human-readable labels, not technical IDs
4. **Built-in Editor**: Uses ag-grid's native select editor for consistency
5. **Robust Saving**: Optimistic updates with automatic rollback on error

## Example Option Format

```javascript
{
  label: "Wooden Chest (123)",  // Display name
  value: "WoodenChest"          // Actual value saved
}
```

Where:
- **label** = `draft.content.Id` + " (" + `draft.id` + ")"
- **value** = `draft.content.Id` (or `draft.id` as fallback)

## Performance

- ⚡ **Caching**: 5-minute TTL prevents redundant fetches
- ⚡ **Batching**: One request per descriptor type (not per row)
- ⚡ **Deduplication**: Concurrent calls share the same promise
- ⚡ **Optimistic UI**: Immediate feedback, async save
