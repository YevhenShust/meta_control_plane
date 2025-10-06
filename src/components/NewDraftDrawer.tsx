import { useCallback, useEffect, useState } from 'react';
import { Drawer, Button, ButtonGroup, Intent } from '@blueprintjs/core';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { generateDefaultUISchema } from '@jsonforms/core';
import { getBlueprintRenderers } from '../renderers/blueprint/registry';
import { createAjv } from '../renderers/ajvInstance';
import { generateDefaultContent } from '../jsonforms/generateDefaults';
import { createDraft, listDrafts } from '../shared/api';
import { resolveSchemaIdByKey } from '../core/schemaKeyResolver';
import { emitChanged } from '../shared/events/DraftEvents';
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

  // If schema has DescriptorId (or *DescriptorId) property, fetch descriptor drafts and patch schema.enum
  const [patchedSchema, setPatchedSchema] = useState<object | null>(null);
  useEffect(() => {
    if (!isOpen || !schema || !setupId || !schemaKey) {
      setPatchedSchema(null);
      return;
    }

    (async () => {
      try {
  const jsonSchema = schema as JsonSchema;
  const props = jsonSchema.properties as { [key: string]: JsonSchema } | undefined;
        if (!props) return;
        // find candidate property names that look like DescriptorId
        const keys = Object.keys(props).filter(k => /DescriptorId$/i.test(k));
        if (keys.length === 0) return;

        // heuristics for descriptor schemaKey
        const candidates: string[] = [];
        if (schemaKey.endsWith('Spawn')) candidates.push(schemaKey.replace(/Spawn$/, 'Descriptor'));
        // also try base property name
        const propBase = keys[0].replace(/Id$/i, '');
        if (propBase) candidates.push(propBase);

        let resolved: string | null = null;
        for (const c of candidates) {
          try {
            const id = await resolveSchemaIdByKey(setupId, c);
            if (id) { resolved = id; break; }
          } catch { /* continue */ }
        }
        if (!resolved) return;

        const drafts = await listDrafts(setupId);
        const options = drafts
          .filter(d => String(d.schemaId || '') === String(resolved))
          .map(d => {
            const parsed = d.content;
            if (parsed && typeof parsed === 'object') {
              const asObj = parsed as Record<string, unknown>;
              const descriptorId = String(asObj['Id'] ?? asObj['id'] ?? '');
              if (descriptorId) return descriptorId;
            }
            return String(d.id ?? '');
          });
        if (options.length === 0) return;

        // shallow clone schema and inject enum into the matching property
        const clone = JSON.parse(JSON.stringify(jsonSchema));
        for (const k of keys) {
          if (!clone.properties) clone.properties = {};
          clone.properties[k] = { ...(clone.properties[k] || {}), enum: options };
        }
        setPatchedSchema(clone as object);
      } catch (e) {
        console.debug('[NewDraftDrawer] failed to fetch descriptor options', e);
        setPatchedSchema(null);
      }
    })();
  }, [isOpen, schema, setupId, schemaKey]);

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
      const result = await createDraft(setupId, schemaKey, data ?? {});
      log('draft created', result);

      // Emit event to refresh menu
      emitChanged({ schemaKey, setupId });

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
      title={`New ${schemaKey}`}
      size="50%"
      canOutsideClickClose={!saving}
      canEscapeKeyClose={!saving}
    >
      <div className="bp5-drawer-body">
        <div className="bp5-dialog-body">
          <JsonForms
            ajv={ajv}
            schema={(patchedSchema ?? schema) as unknown as JsonSchema}
            uischema={
              (uischema ?? generateDefaultUISchema((patchedSchema ?? schema) as unknown as JsonSchema)) as unknown as UISchemaElement
            }
            data={data as unknown}
            renderers={bpRenderers}
            onChange={({ data: d }) => {
              setData(d);
              // Validate
              let isValid = true;
              try {
                isValid = ajv.validate((patchedSchema ?? schema) as unknown as JsonSchema, d as unknown) === true;
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
