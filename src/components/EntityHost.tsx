import FormRenderer from '../renderers/FormRenderer';
import TableRenderer from '../renderers/TableRenderer';

type FormParams = { kind: 'form';  params: { schemaKey: string; draftId: string; uiSchema?: Record<string, unknown> } };
type TableParams = { kind: 'table'; params: { schemaKey: string; uiSchema?: Record<string, unknown> } };
type Placeholder = { kind: string; params?: Record<string, unknown> };
type HostProps = FormParams | TableParams | Placeholder;

export default function EntityHost({ kind, params }: HostProps) {
  if (kind === 'form') {
    const { schemaKey, draftId, uiSchema } = (params || {}) as FormParams['params'];
    if (!schemaKey || !draftId) return <div style={{ padding: 8 }}>Missing schemaKey or draftId</div>;
    return <FormRenderer schemaKey={schemaKey} draftId={draftId} uiSchema={uiSchema} />;
  }

  if (kind === 'table') {
    const { schemaKey, uiSchema } = (params || {}) as TableParams['params'];
    if (!schemaKey) return <div style={{ padding: 8 }}>Missing schemaKey</div>;
    return <TableRenderer schemaKey={schemaKey} uiSchema={uiSchema} />;
  }

  return <div style={{ padding: 8, color: '#999' }}>Немає рендера для: {kind}</div>;
}