import { useEffect, useMemo, useState } from 'react';
import { onChanged } from '../shared/events/DraftEvents';
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

function log(...args: unknown[]) {
  console.debug('[Editor]', ...args);
}

export default function EntityEditor({ ids, view }: EntityEditorProps) {
  const { setupId, draftId, schemaKey } = ids;

  const [schema, setSchema] = useState<object | undefined>(undefined);
  const [uischema, setUischema] = useState<object | undefined>(undefined);
  const [resolved, setResolved] = useState<{ schemaId: string } | null>(null);
  const [ajv] = useState(() => {
    const a = createAjv();
    console.debug('[AJV] created');
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
    log('resolve schemaKey ->', schemaKey);
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
            log('loaded uischema from schemas/ui/', schemaKey);
          }
        } catch {
          // not fatal — log and continue. This is an expected missing-file case.
          console.debug('[Editor] ui schema not found for', schemaKey);
        }
      } catch (e) {
        if (!alive) return;
        setState({ data: null, isDirty: false, isValid: false, loading: false, error: (e as Error).message });
        console.error('[Editor] resolve failed', e);
      }
    })();
    return () => { alive = false; };
  }, [setupId, schemaKey]);

  // load data after schema resolved
  useEffect(() => {
    if (!resolved?.schemaId) return;
    let mounted = true;
    (async () => {
      try {
        if (view === 'form') {
          if (!draftId) throw new Error('draftId required for form view');
          log('load draft start', draftId);
          const all = await listDrafts(setupId);
          if (!mounted) return;
          const hit = all.find(d => String(d.id) === String(draftId) && String(d.schemaId || '') === String(resolved.schemaId));
          const content = hit?.content ?? {};
          setState({ data: content, isDirty: false, isValid: true, loading: false });
          setSnapshot(content ?? null);
          log('load draft done', draftId);
        } else {
          log('load drafts list start', { setupId, schemaId: resolved.schemaId });
          const rows = await listDrafts(setupId);
          if (!mounted) return;
          log('raw drafts loaded:', rows.length, 'total');
          const items = rows.filter(r => String(r.schemaId || '') === String(resolved.schemaId)).map(r => ({ id: String(r.id ?? ''), content: r.content }));
          log('filtered and mapped items:', items.length, 'for schemaId', resolved.schemaId);
          setState({ data: items, isDirty: false, isValid: true, loading: false });
          setSnapshot(items as unknown as DraftContent);
          log('load drafts list done', { count: items.length, items: items.map(i => i.id) });
        }
      } catch (e) {
        if (!mounted) return;
        setState({ data: null, isDirty: false, isValid: false, loading: false, error: (e as Error).message });
      }
    })();
    return () => { mounted = false; };
  }, [resolved?.schemaId, view, draftId, setupId]);

  // Listen for external draft changes and reload rows when in table view
  useEffect(() => {
    if (view !== 'table' || !resolved?.schemaId) return;
    const off = onChanged((payload) => {
      try {
        console.debug('[Editor] onChanged event', payload);
        if (!payload || payload.setupId !== setupId) return;
        // find if this change pertains to our schemaKey (not schemaId) to avoid resolving ids
        if (payload.schemaKey === schemaKey) {
          // force reload: replicate the list-loading logic
          (async () => {
            try {
              const rows = await listDrafts(setupId);
              const items = rows.filter(r => String(r.schemaId || '') === String(resolved.schemaId)).map(r => ({ id: String(r.id ?? ''), content: r.content }));
              setState({ data: items, isDirty: false, isValid: true, loading: false });
              setSnapshot(items as unknown as DraftContent);
              console.debug('[Editor] reloaded table rows after change', items.length);
            } catch (e) {
              console.debug('[Editor] reload rows failed', e);
            }
          })();
        }
      } catch { /* ignore */ }
    });
    return off;
  }, [view, resolved?.schemaId, setupId, schemaKey]);

  // Listen for table 'new' requests from TableRenderer (simple DOM event bridge)
  useEffect(() => {
    if (view !== 'table') return;
    const handler = () => {
      // open drawer and load schema for new draft
      (async () => {
        try {
          setDrawerSchema(null);
          if (!setupId || !schemaKey) throw new Error('Missing context for new draft');
          const { json } = await loadSchemaByKey(setupId, schemaKey);
          const parsed = tryParseContent(json) as object;
          setDrawerSchema(parsed);
          setDrawerOpen(true);
        } catch {
          setDrawerOpen(false);
        }
      })();
    };
    window.addEventListener('table-new-request', handler as EventListener);
    return () => window.removeEventListener('table-new-request', handler as EventListener);
  }, [view, setupId, schemaKey]);

  type TableRow = { id: string; content: unknown };

  const controller = useMemo(() => {
    async function save(): Promise<EditorSaveOutcome> {
      if (view === 'form') {
        if (!draftId) return { ok: false, error: 'No draftId' };
        try {
          log('save start', { draftId });
          await updateDraft(draftId, state.data ?? {});
          setState(s => ({ ...s, isDirty: false }));
          setSnapshot(state.data ?? null);
          log('save done', { draftId });
          return { ok: true };
        } catch (e) {
          log('save fail', { draftId, err: (e as Error).message });
          return { ok: false, error: (e as Error).message };
        }
      }
      return { ok: false, error: 'save not implemented for this view' };
    }

    async function saveRow(rowId: string, nextRow: unknown): Promise<EditorSaveOutcome> {
      try {
        log('saveRow start', rowId);
        await updateDraft(rowId, nextRow);
        setState(s => ({ ...s, isDirty: false }));
        log('saveRow done', rowId);
        return { ok: true };
      } catch (e) {
        log('saveRow fail', { rowId, err: (e as Error).message });
        return { ok: false, error: (e as Error).message };
      }
    }

    function reset() {
      log('reset');
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
      log('[Form] onChange');
      controller.setData(next as unknown);
      controller.setDirty(true);
    },
    onStatus(s) {
      log('[Form] onStatus', s);
      controller.setValid(s.valid);
      controller.setDirty(s.dirty);
    },
    onSave: async () => controller.save(),
    onReset: () => controller.reset(),
  };

  const tableProps: TableViewProps = {
  rows: Array.isArray(state.data) ? (state.data as TableRow[]) : [],
    schema: schema ?? {},
    uischema: uischema ?? undefined,
    ajv,
    setupId,
    schemaKey,
    schemaId: resolved?.schemaId,
    onEdit(rowId, patch) {
      log('[Table] onEdit', rowId);
      setState(s => {
        if (!Array.isArray(s.data)) return s;
        const next = (s.data as TableRow[]).map(r => (String(r.id) === String(rowId) ? { ...r, content: { ...(r.content ?? {}), ...(patch as object) } } : r));
        return { ...s, data: next, isDirty: true };
      });
    },
    async onSaveRow(rowId, nextRow) {
      log('[Table] onSaveRow', rowId);
      try {
        await updateDraft(rowId, nextRow);
        setState(s => ({ ...s, isDirty: false }));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
  };

  log('Preparing to render view:', view, 'with', Array.isArray(state.data) ? (state.data as TableRow[]).length : 0, 'rows');

  if (state.loading) return <div className="content-padding">Loading…</div>;
  if (state.error) return <div className="content-padding">Error: {state.error}</div>;

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
          rows={tableProps.rows}
          schema={tableProps.schema}
          uischema={tableProps.uischema}
          ajv={tableProps.ajv}
          onEdit={tableProps.onEdit}
          onSaveRow={tableProps.onSaveRow}
          setupId={setupId}
          schemaKey={schemaKey}
        />
      )}

      {drawerSchema && (
        <NewDraftDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          setupId={setupId}
          schemaKey={schemaKey}
          schema={drawerSchema}
          uischema={uischema}
          onSuccess={() => {
            // After successful create, emit change so table/menu refresh
            emitChanged({ schemaKey, setupId });
          }}
        />
      )}
    </div>
  );
}
