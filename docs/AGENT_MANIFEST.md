# Agent Manifest

## Purpose / Stack
- Admin panel for **GameMeta / AtlasMeta / Drafts**.
- Frontend: **React + TypeScript + Vite**.
- Forms: **Eclipse JSON Forms** with **custom renderers** based on **Blueprint.js** (no Material UI, no Ant Design).
- Validation: **AJV draft-07** (+ ajv-formats if needed).

## High-level rules
- Keep changes **small and focused**. One issue → one PR.
- Do **not** change dependencies or lockfiles unless the task explicitly says so.
- Avoid inline styles; prefer component APIs and small, local CSS.
- Keep `src/index.css` minimal (layout & tiny utilities only).

## Schema Handling
- Each backend schema (e.g., `ChestDescriptor`) has a `schemaKey` and is loaded via API.
- Hardcoded schema keys: **only** in the navigation/menu definition.
- Before passing to JSON Forms, normalize schemas:
  - Remove `$id` / `$schema` from `$defs`.
  - Ensure root uses **draft-07**.
  - `$ref` must point to local defs: `#/$defs/...`.
  - Do not mix different drafts in one document.

## UI Schemas
- Location: `src/schemas/ui/<schemaKey>.uischema.json`.
- Format: Eclipse JSON Forms UI schema.
- `scope` points to `#/properties/...`.
- Optional `"ui:renderer"`: `"form"` or `"table"`.

## Host & Editor
- `EntityHost` routes to `EntityEditor`.
- `EntityEditor` resolves schema, uischema, data; chooses renderer:
  - `"ui:renderer": "table"` → `TableRenderer`.
  - Otherwise → `FormRenderer`.
- Must support full-entity form editing and per-row table editing.
- Emits save/reset events and refreshes data after draft updates.

## Renderers
- `src/renderers/FormRenderer.tsx`
  - Controlled component wrapping JSON Forms with Blueprint controls.
  - Shared AJV instance (strict: false, allErrors: true; add formats/custom formats as needed).
  - Props for host: `onChange`, `onStatus`.
- `src/renderers/TableRenderer.tsx`
  - Controlled component for arrays/tables using Blueprint table primitives.
  - Row edit + save hooks.
- Additional field/layout renderers live under `src/renderers`.

## Events & Refresh
- After draft creation or save, emit `DraftEvents.refresh`.
- Subscribers reload data accordingly.

## Coding Rules
- No `as any`. Use strict typing or explicit types.
- Keep components small and cohesive; avoid generic wrappers unless needed.
- Logging tags: `[Host]`, `[Editor]`, `[Form]`, `[Table]`, `[Schema]`.

## Migration Cleanup
- Remove legacy UI framework artifacts if found.
- New JSON Forms code lives under `src/renderers` and `src/jsonforms`.

## PR Quality
- Include short summary of changes and before/after screenshots when UI is affected.
- Ensure CI passes.
