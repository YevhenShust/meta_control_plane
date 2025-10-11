import { useEffect, useMemo, useState } from 'react';
import type { EntityEditorProps, EditorDataState, EditorSaveOutcome, FormViewProps, TableViewProps } from './EntityEditor.types';
// loadSchemaByKey already imported above
import { createAjv } from '../renderers/ajvInstance';
import FormRenderer from '../renderers/FormRenderer';
import TableRenderer from '../renderers/TableRenderer';
import { listDrafts, updateDraft } from '../shared/api';
import NewDraftDrawer from '../components/NewDraftDrawer';
import { emitChanged } from '../shared/events/DraftEvents';
import { loadSchemaByKey } from '../core/schemaKeyResolver';
import { tryParseContent } from '../core/parse';

type DraftContent = unknown;

export default function EntityEditor({ ids, view }: EntityEditorProps) {
  const { setupId, draftId, schemaKey } = ids;

  const [schema, setSchema] = useState<object | undefined>(undefined);
  const [uischema, setUischema] = useState<object | undefined>(undefined);
  const [resolved, setResolved] = useState<{ schemaId: string } | null>(null);
  const [ajv] = useState(() => {
    const a = createAjv();
    return a;
  });

  const [state, setState] = useState<EditorDataState<unknown>>({ data: null, isDirty: false, isValid: true, loading: true });

  // snapshot to support reset
  const [snapshot, setSnapshot] = useState<DraftContent | null>(null);

  // Drawer state for creating new drafts from table
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSchema, setDrawerSchema] = useState<object | null>(null);

  // resolve schema id and JSON
  useEffect(() => {
    let alive = true;
    setResolved(null);
    setState(s => ({ ...s, loading: true, error: undefined }));
    (async () => {
      try {
        const { id: sId, json } = await loadSchemaByKey(setupId, schemaKey);
        if (!alive) return;
        setResolved({ schemaId: String(sId) });
        const parsed = tryParseContent(json) as object;
        setSchema(parsed);
        // try to load a matching ui schema file from the ui folder using schemaKey
        try {
          // First try: ui schema files under src/schemas/ui/<SchemaKey>.uischema.json
          const maybe = await import(`../schemas/ui/${schemaKey}.uischema.json`);
          if (!alive) return;
          if (maybe && maybe.default) {
            setUischema(maybe.default as object);
          }
        } catch {
          // not fatal — expected missing-file case in some routes
        }
      } catch (e) {
        if (!alive) return;
        setState({ data: null, isDirty: false, isValid: false, loading: false, error: (e as Error).message });
        console.error('[Editor] resolve failed', e);
      }
    })();
    return () => { alive = false; };
  }, [setupId, schemaKey]);

  // load data after schema resolved (only for form view - table handles its own data)
  useEffect(() => {
    if (!resolved?.schemaId) return;
    if (view !== 'form') {
      // For table view, TableRenderer handles data loading via RTK Query
      setState({ data: null, isDirty: false, isValid: true, loading: false });
      return;
    }
    
    let mounted = true;
    (async () => {
      try {
        if (!draftId) throw new Error('draftId required for form view');
        const all = await listDrafts(setupId);
        if (!mounted) return;
        const hit = all.find(d => String(d.id) === String(draftId) && String(d.schemaId || '') === String(resolved.schemaId));
        const content = hit?.content ?? {};
        setState({ data: content, isDirty: false, isValid: true, loading: false });
        setSnapshot(content ?? null);
      } catch (e) {
        if (!mounted) return;
        setState({ data: null, isDirty: false, isValid: false, loading: false, error: (e as Error).message });
      }
    })();
    return () => { mounted = false; };
  }, [resolved?.schemaId, view, draftId, setupId]);

  // Listen for table 'new' requests from TableRenderer (simple DOM event bridge)
  useEffect(() => {
    if (view !== 'table') return;
    const handler = () => {
      // open drawer and load schema for new draft
      (async () => {
        try {
          setDrawerOpen(true);
          setDrawerSchema(null);
          if (!setupId || !schemaKey) throw new Error('Missing context for new draft');
          const { json } = await loadSchemaByKey(setupId, schemaKey);
          const parsed = tryParseContent(json) as object;
          setDrawerSchema(parsed);
        } catch {
          setDrawerOpen(false);
        }
      })();
    };
    window.addEventListener('table-new-request', handler as EventListener);
    return () => window.removeEventListener('table-new-request', handler as EventListener);
  }, [view, setupId, schemaKey]);

  const controller = useMemo(() => {
    async function save(): Promise<EditorSaveOutcome> {
      if (view === 'form') {
        if (!draftId) return { ok: false, error: 'No draftId' };
        try {
          await updateDraft(draftId, state.data ?? {});
          setState(s => ({ ...s, isDirty: false }));
          setSnapshot(state.data ?? null);
          return { ok: true };
        } catch (e) {
          console.error('[Editor] save failed', { draftId, err: (e as Error).message });
          return { ok: false, error: (e as Error).message };
        }
      }
      return { ok: false, error: 'save not implemented for this view' };
    }

    async function saveRow(rowId: string, nextRow: unknown): Promise<EditorSaveOutcome> {
      try {
        await updateDraft(rowId, nextRow);
        setState(s => ({ ...s, isDirty: false }));
        return { ok: true };
      } catch (e) {
        console.error('[Editor] saveRow failed', { rowId, err: (e as Error).message });
        return { ok: false, error: (e as Error).message };
      }
    }

    function reset() {
      setState(s => ({ ...s, data: snapshot, isDirty: false }));
    }

    function setData(next: unknown) {
      setState(s => ({ ...s, data: next }));
    }

    function setDirty(dirty: boolean) {
      setState(s => ({ ...s, isDirty: dirty }));
    }

    function setValid(valid: boolean) {
      setState(s => ({ ...s, isValid: valid }));
    }

    return {
      state,
      setData,
      setDirty,
      setValid,
      reset,
      save,
      saveRow,
    } as const;
  }, [state, snapshot, draftId, view]);

  // Handlers passed to views
  const formProps: FormViewProps = {
    data: state.data,
    schema: schema ?? {},
    uischema: uischema ?? undefined,
    ajv,
    onChange(next) {
      controller.setData(next as unknown);
      controller.setDirty(true);
    },
    onStatus(s) {
      controller.setValid(s.valid);
      controller.setDirty(s.dirty);
    },
    onSave: async () => controller.save(),
    onReset: () => controller.reset(),
  };

  const tableProps: TableViewProps = {
    schema: schema ?? {},
    uischema: uischema ?? undefined,
    ajv,
    setupId,
    schemaKey,
  };

  if (state.loading && view === 'form') return <div className="content-padding">Loading…</div>;
  if (state.error && view === 'form') return <div className="content-padding">Error: {state.error}</div>;

  return (
    <div>
      {view === 'form' ? (
        <FormRenderer
          data={formProps.data}
          schema={formProps.schema}
          uischema={formProps.uischema}
          ajv={formProps.ajv}
          onChange={formProps.onChange}
          onStatus={formProps.onStatus}
          onSave={formProps.onSave}
          onReset={formProps.onReset}
        />
      ) : (
        <TableRenderer
          schema={tableProps.schema}
          uischema={tableProps.uischema}
          ajv={tableProps.ajv}
          setupId={tableProps.setupId}
          schemaKey={tableProps.schemaKey}
        />
      )}

      {drawerOpen && (
        <NewDraftDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          setupId={setupId}
          schemaKey={schemaKey}
          schema={drawerSchema ?? {}}
          uischema={uischema}
          onSuccess={() => {
            // Emit change for menu refresh (table refreshes via RTK Query cache invalidation)
            emitChanged({ schemaKey, setupId });
          }}
        />
      )}
    </div>
  );
}
