import { useCallback, useEffect, useState } from 'react';
import { Drawer, Button, ButtonGroup, Intent } from '@blueprintjs/core';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { generateDefaultUISchema } from '@jsonforms/core';
import { getBlueprintRenderers } from '../renderers/blueprint/registry';
import { createAjv } from '../renderers/ajvInstance';
import { generateDefaultContent } from '../jsonforms/generateDefaults';
import { createDraftV1 } from '../shared/api/drafts';
import { AppToaster } from './AppToaster';

const bpRenderers = getBlueprintRenderers();

interface NewDraftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setupId: string;
  schemaKey: string;
  schema: object;
  uischema?: object;
  onSuccess: (draftId: string) => void;
}

function log(...args: unknown[]) {
  console.debug('[NewDraft]', ...args);
}

export default function NewDraftDrawer({
  isOpen,
  onClose,
  setupId,
  schemaKey,
  schema,
  uischema,
  onSuccess,
}: NewDraftDrawerProps) {
  const [data, setData] = useState<unknown>(null);
  const [valid, setValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ajv] = useState(() => createAjv());

  // Initialize with defaults when drawer opens
  useEffect(() => {
    if (isOpen && schema) {
      log('generating defaults from schema');
      const defaults = generateDefaultContent(schema);
      log('defaults:', defaults);
      setData(defaults);
    }
  }, [isOpen, schema]);

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!valid) {
      AppToaster.show({
        message: 'Please fix validation errors before submitting',
        intent: Intent.WARNING,
      });
      return;
    }

    setSaving(true);
    try {
      log('creating draft', { setupId, schemaKey });
      const content = JSON.stringify(data ?? {});
      const result = await createDraftV1(setupId, { schemaId: schemaKey, content });
      log('draft created', result);

      AppToaster.show({
        message: `Draft created: ${result.id}`,
        intent: Intent.SUCCESS,
      });

      onSuccess(String(result.id));
      onClose();
    } catch (e) {
      log('create failed', e);
      AppToaster.show({
        message: `Failed to create draft: ${(e as Error).message}`,
        intent: Intent.DANGER,
      });
    } finally {
      setSaving(false);
    }
  }, [valid, data, setupId, schemaKey, onSuccess, onClose]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, handleClose]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="New ChestDescriptor"
      size="50%"
      canOutsideClickClose={!saving}
      canEscapeKeyClose={!saving}
    >
      <div className="bp5-drawer-body">
        <div className="bp5-dialog-body">
          <JsonForms
            ajv={ajv}
            schema={schema as unknown as JsonSchema}
            uischema={
              (uischema ?? generateDefaultUISchema(schema as unknown as JsonSchema)) as unknown as UISchemaElement
            }
            data={data as unknown}
            renderers={bpRenderers}
            onChange={({ data: d }) => {
              setData(d);
              // Validate
              let isValid = true;
              try {
                isValid = ajv.validate(schema as unknown as JsonSchema, d as unknown) === true;
              } catch {
                isValid = false;
              }
              setValid(isValid);
            }}
          />
        </div>
      </div>
      <div className="bp5-drawer-footer">
        <ButtonGroup fill>
          <Button
            icon="tick"
            intent={Intent.PRIMARY}
            text="Create"
            onClick={handleSubmit}
            disabled={!valid || saving}
            loading={saving}
          />
          <Button
            icon="cross"
            text="Cancel"
            onClick={handleClose}
            disabled={saving}
          />
        </ButtonGroup>
      </div>
    </Drawer>
  );
}
