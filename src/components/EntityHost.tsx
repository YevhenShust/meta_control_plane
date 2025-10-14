import type { UISchemaElement } from '@jsonforms/core';
import EntityEditor from '../editor/EntityEditor';
import useSetups from '../setup/useSetups';
import { useState, useEffect } from 'react';
import NewDraftDrawer from './NewDraftDrawer';
// Schema loading now via RTK Query prepared endpoint
import { useNavigate } from '../hooks/useNavigate';
import { useGetPreparedSchemaByKeyQuery } from '../store/api';

type FormParams = { kind: 'form';  params: { schemaKey: string; draftId: string; uiSchema?: UISchemaElement | Record<string, unknown> } };
type TableParams = { kind: 'table'; params: { schemaKey: string; uiSchema?: Record<string, unknown> } };
type NewDraftParams = { kind: 'new-draft'; params: { schemaKey: string; uiSchema?: Record<string, unknown> } };
type Placeholder = { kind: string; params?: Record<string, unknown> };
type HostProps = FormParams | TableParams | NewDraftParams | Placeholder;

export default function EntityHost({ kind, params }: HostProps) {
  const { selectedId: setupId } = useSetups();
  const view = kind === 'table' ? 'table' : kind === 'form' ? 'form' : undefined;
  const schemaKey = (params || {})?.schemaKey as string | undefined;
  const draftId = kind === 'form' ? ((params || {}) as FormParams['params']).draftId : undefined;
  const navigate = useNavigate();

  // debug logging removed per policy

  // State for new-draft drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [schema, setSchema] = useState<object | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const uischema = (params || {})?.uiSchema as object | undefined;

  // Open drawer when kind is new-draft
  useEffect(() => {
    if (kind === 'new-draft' && setupId && schemaKey) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [kind, setupId, schemaKey]);

  // Use RTK Query to fetch prepared schema for new-draft drawer
  const { data: prepared, error: preparedError, isFetching: isPreparing } = useGetPreparedSchemaByKeyQuery(
    { setupId: setupId || '', schemaKey: schemaKey || '' },
    { skip: kind !== 'new-draft' || !setupId || !schemaKey }
  );

  useEffect(() => {
    if (preparedError) {
      setSchemaError(String((preparedError as { error?: string }).error ?? 'Failed to load schema'));
      setSchema(null);
      return;
    }
    if (prepared && prepared.schema) {
      setSchema(prepared.schema as object);
      setSchemaError(null);
    } else if (isPreparing) {
      setSchema(null);
      setSchemaError(null);
    }
  }, [prepared, preparedError, isPreparing]);

  if (!setupId) return <div className="pad-sm">Select a Setup</div>;

  // Handle new-draft drawer
  if (kind === 'new-draft') {
    if (!schemaKey) return <div className="pad-sm">Missing schemaKey</div>;
    
    return (
      <>
        <div className="content-padding">
          {schemaError ? `Error loading schema: ${schemaError}` : 'Opening new draft form...'}
        </div>
        {schema && (
          <NewDraftDrawer
            isOpen={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
              // Navigate back to parent container
              navigate(['Game', 'Chests']);
            }}
            setupId={setupId}
            schemaKey={schemaKey}
            schema={schema}
            uischema={uischema}
            onSuccess={(res) => {
                // Navigate to the newly created draft (res.draftId)
                // res is { draftId, kind, prevId?, nextId? }
                if (res && res.draftId) {
                  navigate(['Game', 'Chests', res.draftId]);
                }
              }}
          />
        )}
      </>
    );
  }

  if (!view) return <div className="pad-sm text-muted-quiet">Немає рендера для: {kind}</div>;

  if (!schemaKey) return <div className="pad-sm">Missing schemaKey</div>;

  const ids = { setupId, schemaKey, draftId };

  return <EntityEditor ids={ids} view={view} />;
}