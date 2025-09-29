Purpose / Stack

• Admin panel for GameMeta / AtlasMeta / Drafts.
• Uses JSON Forms + Material UI renderers as the only UI kit.
• AJV draft-07 as the validator.
• All forms are rendered from a schema and a UI schema.

Schema Handling
• Each backend schema (e.g., ChestDescriptor) has a schemaKey and is loaded via API.
• Before passing to JSON Forms, every schema must be processed with prepareSchemaForJsonForms (src/jsonforms/prepareSchema.ts):
  • Remove $id and $schema from all $defs.
  • Ensure the root schema uses draft-07.
• $ref links must always point to #/$defs/....
• Do not mix different drafts in the same document.

UI Schemas
• Stored in src/ui/<schemaKey>.uischema.json.
• Format: Eclipse JSON Forms UI schema (not RJSF).
• scope always points to a property: #/properties/....
• Optional "ui:renderer" can specify custom controls or table renderers.

EntityHost
• Loads schema, uischema, and data for the entity.
• Selects the renderer:
  • If "ui:renderer": "table" → use TableRenderer.
  • Otherwise → FormRenderer.
• Caches schemas for reuse.

Renderers
• src/renderers/FormRenderer.tsx
  • Main form renderer based on JSON Forms + MUI renderers.
  • Provides a custom ajv with strict: false, allErrors: true, ajv-formats, and a custom TimeSpan format.
• src/renderers/TableRenderer.tsx
  • For arrays/tables, use MUI DataGrid (or AG Grid).
  • Remove all Ant Design dependencies.

Events & Refresh
• After draft creation or save, emit DraftEvents.refresh.
• Subscribers must reload their data accordingly.

Migration Cleanup

• Remove all files and styles related to RJSF and Ant Design (rjsf-layout.css, slate.css, AntD Layout/Components).
• New JSON Forms–related files should live in src/renderers and src/jsonforms.
• The codebase must gradually migrate to Material UI + JSON Forms only.