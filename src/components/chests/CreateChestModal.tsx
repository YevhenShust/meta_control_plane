import { Modal, Button } from 'antd';
import Form from '@rjsf/antd';
import validator from '@rjsf/validator-ajv8';
import uiSchema from '../../ui/ChestDescriptor.uischema.json';
import useSetups from '../../setup/useSetups';
import { listSchemasV1 } from '../../shared/api/schema';
import { createDraftV1 } from '../../shared/api/drafts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreated: (draftId: string) => void;
};

export default function CreateChestModal({ open, onCancel, onCreated }: Props) {
  const { selectedId } = useSetups();
  const [schema, setSchema] = useState<any | null>(null);
  const [pickedSchemaId, setPickedSchemaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<any>(null);
  const [creating, setCreating] = useState(false);

  const defaultFormData = useMemo(() => ({
    Id: `chest-${Date.now()}`,
    Type: 'Common',
    InteractDistance: 0,
    LockInteractTime: '00:00:00',
    DropInfo: { Items: [], Currency: { Amount: { Min: 0, Max: 0 }, ExpiriencePercent: 0 }, CraftMaterials: [] }
  }), []);

  const [formData, setFormData] = useState<any>(defaultFormData);

  useEffect(() => {
    setFormData(defaultFormData);
  }, [open, defaultFormData]);

  useEffect(() => {
    if (!open) return;
    if (!selectedId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const schemas = await listSchemasV1(selectedId);
        const hit = schemas.find(s => {
          try { return JSON.parse(String(s.content || '{}')).$id === 'ChestDescriptor'; } catch { return false; }
        }) ?? schemas[0];
        if (!hit?.id) throw new Error('ChestDescriptor schema not found');
        const parsed = JSON.parse(String(hit.content || '{}'));
        if (mounted) {
          setSchema(parsed);
          setPickedSchemaId(hit.id as string);
        }
      } catch (e: unknown) {
        if (mounted) setError(String((e as any)?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  const handleCreate = async () => {
    if (!selectedId) return;
    if (!pickedSchemaId) return;
    setCreating(true);
    try {
      const created = await createDraftV1(selectedId, { schemaId: pickedSchemaId, content: JSON.stringify(formData) });
      onCreated(String(created.id));
    } catch (e) {
      // keep simple: surface to console
      // eslint-disable-next-line no-console
      console.error('[CreateChestModal] create failed', e);
    } finally {
      setCreating(false);
    }
  };

  const disabled = !selectedId;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title="Create chest"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleCreate} loading={creating} disabled={disabled || loading || !!error}>
            Create
          </Button>
        </div>
      )}
    >
      {disabled && <div style={{ marginBottom: 12, color: 'var(--ant-primary-color)' }}>Select a setup to create a chest</div>}
      {loading && <div>Loading schema…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && schema && (
        <Form
          schema={schema as any}
          uiSchema={uiSchema}
          validator={validator}
          formData={formData}
          onChange={(e: any) => setFormData(e?.formData)}
          ref={formRef}
        />
      )}
    </Modal>
  );
}
