# Agent Manifest

## Purpose / Stack
- Admin panel for **GameMeta / AtlasMeta / Drafts**.
- Uses **Eclipse JSON Forms** with **custom Blueprint.js renderers** (no Material UI, no Ant Design).
- Validation with **AJV draft-07**.
- All forms are rendered from a schema and a UI schema.

## Schema Handling
- Each backend schema (e.g., `ChestDescriptor`) has a `schemaKey` and is loaded via API.
- Hardcoded schema keys must exist **only in the menu definition**; do not duplicate them anywhere else.
- Before passing to JSON Forms, schemas must be normalized:
  - Remove `$id` and `$schema` from all `$defs`.
  - Ensure the root schema uses draft-07.
- `$ref` links must always point to `#/$defs/...`.
- Do not mix JSON Schema drafts in the same document.

## UI Schemas
- Stored in `src/schemas/ui/<schemaKey>.uischema.json`.
- Format: Eclipse JSON Forms UI schema.
- `scope` always points to a property: `#/properties/...`.
- Optional `"ui:renderer"` can specify `"form"` or `"table"`.

## EntityHost / EntityEditor
- `EntityHost` routes to `EntityEditor`.
- `EntityEditor` resolves schema, uischema, and data for the entity.
- Chooses renderer:
  - If `"ui:renderer": "table"` → use `TableRenderer`.
  - Otherwise → `FormRenderer`.
- Must support both whole-entity form editing and per-row table editing.
- Must emit save/reset events and refresh state after draft updates.

## Renderers
- `src/renderers/FormRenderer.tsx`
  - Controlled component using JSON Forms + Blueprint controls.
  - Uses a shared AJV instance (strict: false, allErrors: true, ajv-formats, and custom `TimeSpan` format).
  - Must provide `onChange` and `onStatus` props for `EntityEditor`.
- `src/renderers/TableRenderer.tsx`
  - Controlled component for arrays/tables.
  - Uses Blueprint table components (not MUI DataGrid, not Ant Design).
  - Must provide per-row edit and save hooks.
- Additional renderers (Boolean, Enum, Number, String, TextArea, Layouts, etc.) live in `src/renderers`.

## Events & Refresh
- After draft creation or save, emit `DraftEvents.refresh`.
- Subscribers must reload their data accordingly.

## Coding Rules
- Do **not** use `as any`. Use strict typing (`unknown` or explicit types).
- Keep code minimal, modular, and focused. Avoid introducing new wrappers/containers unless strictly necessary.
- Logging must use clear tags: `[Host]`, `[Editor]`, `[Form]`, `[Table]`, `[Schema]`.

## Migration Cleanup
- Legacy UI framework artifacts should be removed if still present. New JSON Forms–related files must live under `src/renderers` and `src/jsonforms`.
