# Purpose
This app must avoid custom UI code. Everything renders from JSON Schema (server) + UI Schema (local). The agent MUST follow these rules.

# Core Types
```ts
// View descriptor passed to EntityHost
export type ViewDescriptor = {
  view?: 'form'|'table';           // if absent, derive from UI schema or fallback (form when draftId given, table otherwise)
  schemaKey: 'ChestDescriptor'|'ChestSpawn'|string;
  draftId?: string;                 // present => single-object form
};

// OpenAPI types
import type { components } from 'src/types/openapi.d.ts';
export type DraftDto  = NonNullable<components['schemas']['DraftDto']>;
export type SchemaDto = NonNullable<components['schemas']['SchemaDto']>;
```

Responsibilities
MainContent = resolver only.

Converts selectedMenuPath -> ViewDescriptor. No data fetching. No React.lazy here.

EntityHost = single rendering engine.

Receives ViewDescriptor.

Gets setupId from useSetups().

Resolves schemaId by schemaKey using listSchemasV1(setupId) (cached by ${setupId}:${schemaKey}).

Loads JSON Schema once (parsed), caches by ${setupId}:${schemaId}.

Loads UI Schema from local file src/ui/<schemaKey>.uischema.json.

Loads data:

If draftId → listDraftsV1(setupId) find by id (or a get-by-id if exists).

Else → list drafts filtered by schemaId.

Picks renderer:

If view specified in descriptor → use it.

Else if uiSchema["ui:renderer"] present → use it.

Else fallback: draftId ? 'form' : 'table'.

Emits refresh events after POST/PUT.

Renderers
Create reusable components in src/renderers/:

FormRenderer.tsx

Renders single object via RJSF (AJV8): <Form schema uiSchema validator formData .../>.

Save:

If draftId exists → updateDraftV1(draftId, JSON.stringify(formData)).

Else (creating) → createDraftV1(setupId, { schemaId, content: JSON.stringify(formData) }).

On success → emit DraftEvents.changed({ schemaKey, setupId }).

TableRenderer.tsx

Renders list of objects as AntD Table.

Columns come from uiSchema["ui:options"]?.tableColumns: string[] (e.g. ["DescriptorId","Position.X","Position.Y","Position.Z"]). If absent → sensible defaults per schema.

Cell value = safe getter by path (e.g. Position.X).

Actions:

Edit → opens Drawer with FormRenderer (same schema/uiSchema) for the selected row.

Create → opens Drawer with FormRenderer in create mode (no draftId).

After save/create → update local rows and emit DraftEvents.changed.

Schemas
No GET /Schema/{schemaId}; list by setup: listSchemasV1(setupId) then pick by id or $id.

Provide helpers in src/shared/api/schema.ts:

listSchemasV1(setupId): Promise<SchemaDto[]>

getSchemaByIdV1(schemaId, setupId): Promise<unknown> with in-memory cache ${setupId}:${schemaId}.

UI Schemas (local)
File: src/ui/<schemaKey>.uischema.json.

May include:

"ui:renderer": "form" | "table"

"ui:options": { "tableColumns": ["DescriptorId","Position.X","Position.Y","Position.Z"] }

Usual RJSF ui directives (order, widgets, labels).

Menus / Keys
Menu labels may duplicate. Selection keys MUST include draft.id for uniqueness.

Dynamic menus (e.g., Game→Chests) use hooks that read drafts list and map to items:

label from parsed content (e.g., content.Id || draft.id)

key path must end with draft.id.

Data Access
All server calls go via src/shared/api/* using the shared http instance.

Never use fetch/axios directly in components.

Events & Refresh
Implement a tiny pub/sub in src/shared/events/DraftEvents.ts with:

onChanged(listener)

emitChanged({ schemaKey, setupId })

Menus and tables subscribe to refresh their data when drafts change.

Type Safety
Always import OpenAPI types. No any for DTOs.

JSON content may be unknown; parse then narrow locally.

No screen files unless explicitly required; prefer EntityHost + Renderers.

Do / Don’t
Do: small, typed hooks; cache schemas; emit refresh on save.

Don’t: wire React.lazy inside MainContent; duplicate API calls; handcraft forms where RJSF can render them.

Minimal Resolver Examples
['Game','Chests', <draftId>] → { view:'form', schemaKey:'ChestDescriptor', draftId }

['Atlas','Location','Chests'] → { view:'table', schemaKey:'ChestSpawn' }
