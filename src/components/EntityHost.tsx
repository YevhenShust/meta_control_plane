import type { UISchemaElement } from '@jsonforms/core';
import EntityEditor from '../editor/EntityEditor';
import useSetups from '../setup/useSetups';

type FormParams = { kind: 'form';  params: { schemaKey: string; draftId: string; uiSchema?: UISchemaElement | Record<string, unknown> } };
type TableParams = { kind: 'table'; params: { schemaKey: string; uiSchema?: Record<string, unknown> } };
type Placeholder = { kind: string; params?: Record<string, unknown> };
type HostProps = FormParams | TableParams | Placeholder;

export default function EntityHost({ kind, params }: HostProps) {
  const { selectedId: setupId } = useSetups();
  const view = kind === 'table' ? 'table' : kind === 'form' ? 'form' : undefined;
  const schemaKey = (params || {})?.schemaKey as string | undefined;
  const draftId = kind === 'form' ? ((params || {}) as FormParams['params']).draftId : undefined;

  console.debug('[Host] route -> view=', view, 'ids=', { setupId, schemaKey, draftId });

  if (!setupId) return <div className="pad-sm">Select a Setup</div>;

  if (!view) return <div className="pad-sm text-muted-quiet">Немає рендера для: {kind}</div>;

  if (!schemaKey) return <div className="pad-sm">Missing schemaKey</div>;

  const ids = { setupId, schemaKey, draftId };

  return <EntityEditor ids={ids} view={view} />;
}