import type { UISchemaElement } from '@jsonforms/core';
import EntityEditor from '../editor/EntityEditor';
import useSetups from '../setup/useSetups';
import { useState, useEffect } from 'react';
import NewDraftDrawer from './NewDraftDrawer';
import { loadSchemaByKey } from '../core/schemaKeyResolver';
import { useNavigate } from '../hooks/useNavigate';
import { tryParseContent } from '../core/parse';

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
      setSchemaError(null);
      // Load schema for the drawer
      loadSchemaByKey(setupId, schemaKey).then(({ json }) => {
        const parsed = tryParseContent(json) as object;
        setSchema(parsed);
      }).catch(e => {
        console.error('[Host] failed to load schema for new-draft', e);
        setSchemaError((e as Error).message);
      });
    } else {
      setDrawerOpen(false);
      setSchema(null);
      setSchemaError(null);
    }
  }, [kind, setupId, schemaKey]);

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
            onSuccess={(draftId) => {
              // Navigate to the newly created draft
              navigate(['Game', 'Chests', draftId]);
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