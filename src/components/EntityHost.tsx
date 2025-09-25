import type { UISchemaElement } from '@jsonforms/core';
import TableRenderer from '../renderers/TableRenderer';
import JsonFormsFormRenderer from '../renderers/JsonFormsFormRenderer';
import useSetups from '../setup/useSetups';
import CreateDraft from './CreateDraft';

type FormParams = { kind: 'form';  params: { schemaKey: string; draftId: string; uiSchema?: UISchemaElement | Record<string, unknown> } };
type TableParams = { kind: 'table'; params: { schemaKey: string; uiSchema?: Record<string, unknown> } };
type Placeholder = { kind: string; params?: Record<string, unknown> };
type HostProps = FormParams | TableParams | Placeholder;

export default function EntityHost({ kind, params }: HostProps) {
  const { selectedId: setupId } = useSetups();
  if (kind === 'form') {
    const { schemaKey, draftId, uiSchema } = (params || {}) as FormParams['params'];
    if (!schemaKey || !draftId) return <div style={{ padding: 8 }}>Missing schemaKey or draftId</div>;
    if (!setupId) return <div style={{ padding: 8 }}>Select a Setup</div>;

    // special placeholder used by the sidebar for the 'new' action
    if (draftId === '__new__') {
      const ui = params && typeof (params as Record<string, unknown>).uiSchema === 'object' ? (params as Record<string, unknown>).uiSchema as Record<string, unknown> : undefined;
      const sk = schemaKey;
      return (
        <CreateDraft
          schemaKey={sk}
          uiSchema={ui}
          initialFormData={{
            Id: `chest-${Date.now()}`,
            Type: 'Common',
            InteractDistance: 0,
            LockInteractTime: '00:00:00',
            DropInfo: { Items: [], Currency: { Amount: { Min: 0, Max: 0 }, ExpiriencePercent: 0 }, CraftMaterials: [] }
          }}
          onCreated={(id) => {
            const qp = '?path=' + encodeURIComponent(['Game','Chests', String(id)].join('/'));
            window.history.pushState(null, '', qp);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        />
      );
    }

    return <JsonFormsFormRenderer setupId={setupId} schemaKey={schemaKey} draftId={draftId} uiSchema={uiSchema as Record<string, unknown> | undefined} />;
  }

  if (kind === 'table') {
    const { schemaKey, uiSchema } = (params || {}) as TableParams['params'];
    if (!schemaKey) return <div style={{ padding: 8 }}>Missing schemaKey</div>;
    return <TableRenderer schemaKey={schemaKey} uiSchema={uiSchema} />;
  }

  return <div style={{ padding: 8, color: '#999' }}>Немає рендера для: {kind}</div>;
}