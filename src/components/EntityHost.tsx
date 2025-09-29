import type { UISchemaElement } from '@jsonforms/core';
import TableRenderer from '../renderers/TableRenderer';
import FormRenderer from '../renderers/FormRenderer';
import useSetups from '../setup/useSetups';

type FormParams = { kind: 'form';  params: { schemaKey: string; draftId: string; uiSchema?: UISchemaElement | Record<string, unknown> } };
type TableParams = { kind: 'table'; params: { schemaKey: string; uiSchema?: Record<string, unknown> } };
type Placeholder = { kind: string; params?: Record<string, unknown> };
type HostProps = FormParams | TableParams | Placeholder;

export default function EntityHost({ kind, params }: HostProps) {
  const { selectedId: setupId } = useSetups();
  if (kind === 'form') {
  const { schemaKey, draftId } = (params || {}) as FormParams['params'];
    if (!schemaKey || !draftId) return <div className="pad-sm">Missing schemaKey or draftId</div>;
    if (!setupId) return <div className="pad-sm">Select a Setup</div>;

    // Mount the (possibly stubbed) FormRenderer so forms are actually mounted.
    return <FormRenderer setupId={setupId} schemaKey={schemaKey} draftId={draftId} />;
  }

  if (kind === 'table') {
    const { schemaKey, uiSchema } = (params || {}) as TableParams['params'];
      if (!schemaKey) return <div className="pad-sm">Missing schemaKey</div>;
    return <TableRenderer schemaKey={schemaKey} uiSchema={uiSchema} />;
  }

  return <div className="pad-sm text-muted-quiet">Немає рендера для: {kind}</div>;
}