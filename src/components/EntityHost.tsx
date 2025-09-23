import FormRenderer from '../renderers/FormRenderer';
import TableRenderer from '../renderers/TableRenderer';

type Props = { kind: string; params?: Record<string, unknown> };

export default function EntityHost({ kind, params }: Props) {
  if (kind === 'form') {
    const rawSchemaKey = params?.schemaKey ?? params?.['schemaKey'];
    const rawDraftId = params?.draftId ?? params?.['draftId'];
    const schemaKey = typeof rawSchemaKey === 'string' ? rawSchemaKey : (rawSchemaKey == null ? '' : String(rawSchemaKey));
    const draftId = typeof rawDraftId === 'string' ? rawDraftId : (rawDraftId == null ? '' : String(rawDraftId));
    if (!schemaKey || !draftId) return <div style={{ padding: 8 }}>Missing schemaKey or draftId</div>;
    return <FormRenderer schemaKey={schemaKey} draftId={draftId} />;
  }

  if (kind === 'table') {
    const rawSchemaKey = params?.schemaKey ?? params?.['schemaKey'];
    const schemaKey = typeof rawSchemaKey === 'string' ? rawSchemaKey : (rawSchemaKey == null ? '' : String(rawSchemaKey));
    const maybeUi = params?.uiSchema ?? params?.['uiSchema'];
    const uiSchema = maybeUi && typeof maybeUi === 'object' ? (maybeUi as Record<string, unknown>) : undefined;
    if (!schemaKey) return <div style={{ padding: 8 }}>Missing schemaKey</div>;
    return <TableRenderer schemaKey={schemaKey} uiSchema={uiSchema} />;
  }

  return <div style={{ padding: 8 }}>Missing renderer for kind: {kind}</div>;
}

