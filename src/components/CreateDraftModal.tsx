import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography } from 'antd';
import Form from '@rjsf/antd';
import { customizeValidator } from '@rjsf/validator-ajv8';
import useSetups from '../setup/useSetups';
import { listSchemasV1 } from '../shared/api/schema';
import { createDraftV1 } from '../shared/api/drafts';

const timeSpanRe = /^\d{2}:\d{2}:\d{2}$/;
const validator = customizeValidator({ customFormats: { TimeSpan: timeSpanRe }, ajvOptionsOverrides: { allErrors: true } });

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreated: (draftId: string) => void;
  schemaKey: string;
  title?: string;
  uiSchema?: Record<string, unknown>;
  initialFormData?: unknown | (() => unknown);
};

export default function CreateDraftModal({ open, onCancel, onCreated, schemaKey, title, uiSchema, initialFormData }: Props) {
  const { selectedId } = useSetups();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<unknown>({});

  useEffect(() => {
    if (!open) return;
    if (!selectedId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const schemas = await listSchemasV1(selectedId);
        const match = (Array.isArray(schemas) ? schemas : []).find(s => {
          try { return JSON.parse(String(s.content || '{}')).$id === schemaKey; } catch { return false; }
        });
        if (!match || !match.id) {
          if (mounted) setError('Schema not found');
          return;
        }
        const parsed = JSON.parse(String(match.content || '{}'));
        if (mounted) {
          setSchemaId(String(match.id));
          setJsonSchema(parsed);
        }
      } catch (e: unknown) {
        if (mounted) setError((e && (e as Error).message) ? (e as Error).message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, selectedId, schemaKey]);

  useEffect(() => {
    if (!open) return;
    if (typeof initialFormData === 'function') {
      try {
        const raw = (initialFormData as () => unknown)();
        setFormData(raw ?? {});
      } catch {
        setFormData({});
      }
    } else if (initialFormData !== undefined) {
      setFormData(initialFormData ?? {});
    } else {
      setFormData({});
    }
  }, [open, initialFormData]);

  const modalTitle = title || `Create ${schemaKey}`;

  const handleCreate = async () => {
    if (!selectedId) return;
    if (!schemaId) return;
    setLoading(true);
    try {
      const created = await createDraftV1(selectedId, { schemaId, content: JSON.stringify(formData ?? {}) });
      window.dispatchEvent(new CustomEvent('drafts:changed', { detail: { schemaKey, setupId: selectedId } }));
      if (created && typeof created === 'object' && created !== null && 'id' in created) {
        const idVal = (created as Record<string, unknown>).id;
        if (idVal !== undefined && idVal !== null) onCreated(String(idVal));
      }
    } catch (e: unknown) {
      setError((e && (e as Error).message) ? (e as Error).message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={modalTitle}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button key="create" type="primary" onClick={handleCreate} disabled={!selectedId || !jsonSchema} loading={loading}>Create</Button>
      ]}
    >
      {!selectedId && <Typography.Text type="secondary">Select a setup …</Typography.Text>}
      {loading && <div>Loading…</div>}
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
      {jsonSchema && (
        <div style={{ marginTop: 12 }}>
          <Form
            schema={jsonSchema}
            uiSchema={uiSchema as Record<string, unknown> | undefined}
            validator={validator}
            formData={formData}
            onChange={e => setFormData(e.formData)}
          >
            <div />
          </Form>
        </div>
      )}
    </Modal>
  );
}
