import type { UISchemaElement } from '@jsonforms/core';
import TableRenderer from '../renderers/TableRenderer';
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

    // Forms are temporarily disabled while migrating off Material UI.
    return (
      <div className="content-padding">
        <strong>Forms disabled</strong>
        <div className="mt-sm">Form rendering is disabled during the MUI→Blueprint migration. Schema: <code>{schemaKey}</code></div>
      </div>
    );
  }

  if (kind === 'table') {
    const { schemaKey, uiSchema } = (params || {}) as TableParams['params'];
      if (!schemaKey) return <div className="pad-sm">Missing schemaKey</div>;
    return <TableRenderer schemaKey={schemaKey} uiSchema={uiSchema} />;
  }

  return <div className="pad-sm text-muted-quiet">Немає рендера для: {kind}</div>;
}