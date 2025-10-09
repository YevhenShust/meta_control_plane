# Quick Reference: DescriptorId Dropdown

## TL;DR

**Status**: ✅ Fully implemented and working

**What it does**: Automatically adds dropdown editors with human-readable labels for any table column ending with "DescriptorId".

**Where**: `src/renderers/TableRenderer.tsx` + `src/hooks/useDescriptorOptions.ts`

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Column Detection** | Automatic via regex `/DescriptorId$/i` |
| **Editor Type** | ag-grid's built-in `agSelectCellEditor` |
| **Options Source** | Prefetched from drafts via `useDescriptorOptionsForColumns` |
| **Display** | Human-readable labels via `valueFormatter` |
| **Caching** | Global cache, 5-minute TTL |
| **Backend Changes** | None required |

## For Developers

### Adding a New DescriptorId Column

**No code changes needed!** Just add a column ending with "DescriptorId" to your schema:

```json
{
  "type": "object",
  "properties": {
    "ChestDescriptorId": {
      "type": "string"
    }
  }
}
```

The system will:
1. Detect it automatically
2. Load options from the "ChestDescriptor" schema
3. Configure the dropdown
4. Display human-readable labels

### How Options Are Resolved

```
Column: "ChestDescriptorId"
  ↓ (remove "Id")
Property: "ChestDescriptor"
  ↓ (heuristics)
Schema: Tries ["ChestDescriptor", "ChestDescriptor"] via resolveSchemaIdByKey
  ↓ (list drafts)
Drafts: Filtered by resolved schema ID
  ↓ (map)
Options: [{ label: "Wooden Chest (123)", value: "WoodenChest" }, ...]
```

### Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `useDescriptorOptionsForColumns` | `useDescriptorOptions.ts:188` | Batch load options for multiple columns |
| `loadDescriptorOptions` | `useDescriptorOptions.ts:103` | Load options for a single column |
| `resolveDescriptorSchemaKeyHeuristics` | `schemaTools.ts` | Convert property name to schema key |

### Code Locations

```typescript
// Column identification
// src/renderers/TableRenderer.tsx:82-96
const descriptorColumns = useMemo(() => {
  return columns.filter(col => {
    const last = col.path?.[col.path.length - 1];
    return last && /DescriptorId$/i.test(last);
  });
}, [columns]);

// Options loading
// src/renderers/TableRenderer.tsx:98
const { map: descriptorOptionsMap } = useDescriptorOptionsForColumns(
  setupId, schemaKey, descriptorPropertyNames
);

// AG Grid configuration
// src/renderers/TableRenderer.tsx:214-237
colDef.cellEditor = 'agSelectCellEditor';
colDef.cellEditorParams = { values };
colDef.valueFormatter = p => labelMap.get(p.value) ?? p.value;
```

## Troubleshooting

### Dropdown doesn't appear

**Check:**
1. Does column name end with "DescriptorId"? (case-insensitive)
2. Are there drafts for the corresponding descriptor schema?
3. Check browser console for errors

### Options are empty

**Check:**
1. Descriptor schema exists and is accessible
2. Drafts exist for that schema
3. Schema resolution heuristics work (see `resolveDescriptorSchemaKeyHeuristics`)

### Labels show IDs instead of names

**Check:**
1. Draft content has `Id` or `name` field
2. `valueFormatter` is configured (should be automatic)

## Testing

Run validation:
```bash
node scripts/validate-descriptor-dropdown.js
```

Expected output:
```
✅ All validation tests passed!
```

## Performance Tips

- Options are cached globally (5-minute TTL)
- Batch loading prevents N+1 queries
- Concurrent requests are deduplicated
- Use React DevTools to verify options are loaded

## Related Files

- 📄 `IMPLEMENTATION_SUMMARY.md` - Detailed summary
- 📄 `docs/DESCRIPTOR_ID_DROPDOWN_IMPLEMENTATION.md` - Full implementation guide
- 📄 `docs/DESCRIPTOR_ID_DROPDOWN_FLOWCHART.md` - Visual flowchart
- 🧪 `scripts/validate-descriptor-dropdown.js` - Validation tests

## Example Data Flow

```typescript
// Input: Column "ItemDescriptorId"
// Output in grid:

| ItemDescriptorId              |
|-------------------------------|
| Diamond Sword (item_001)  [▼] |  ← Click to open dropdown
```

Dropdown shows:
```
┌─────────────────────────────┐
│ Diamond Sword (item_001)  ✓ │
│ Iron Sword (item_002)       │
│ Wooden Sword (item_003)     │
└─────────────────────────────┘
```

Saved value: `"DiamondSword"` (from draft content.Id)
Displayed value: `"Diamond Sword (item_001)"` (via valueFormatter)

## Need Help?

1. Read `IMPLEMENTATION_SUMMARY.md` for overview
2. Read `docs/DESCRIPTOR_ID_DROPDOWN_IMPLEMENTATION.md` for details
3. Run `node scripts/validate-descriptor-dropdown.js` to verify setup
4. Check browser console for errors
5. Review `src/renderers/TableRenderer.tsx` inline comments
