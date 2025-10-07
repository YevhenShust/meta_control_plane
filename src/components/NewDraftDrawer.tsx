import { useCallback, useEffect, useState, useMemo } from 'react';
import { Drawer, Button, ButtonGroup, Intent } from '@blueprintjs/core';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { generateDefaultUISchema } from '@jsonforms/core';
import { getBlueprintRenderers } from '../renderers/blueprint/registry';
import { createAjv } from '../renderers/ajvInstance';
import { generateDefaultContent } from '../jsonforms/generateDefaults';
import { createDraft } from '../shared/api';
import { useDescriptorOptions } from '../hooks/useDescriptorOptions';
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

  // Find descriptor property names in schema
  const descriptorPropertyKeys = useMemo(() => {
    if (!schema) return [];
    const jsonSchema = schema as JsonSchema;
    const props = jsonSchema.properties as { [key: string]: JsonSchema } | undefined;
    if (!props) return [];
    return Object.keys(props).filter(k => /DescriptorId$/i.test(k));
  }, [schema]);

  // Use hook to load descriptor options for the first descriptor property
  // (most schemas have only one descriptor property)
  const firstDescriptorKey = descriptorPropertyKeys[0];
  const descriptorPropertyName = firstDescriptorKey ? firstDescriptorKey.replace(/Id$/i, '') : undefined;
  
  const { options: descriptorOptions } = useDescriptorOptions(
    isOpen ? setupId : undefined,
    isOpen ? schemaKey : undefined,
    descriptorPropertyName
  );

  // Patch schema with descriptor options when available
  const patchedSchema = useMemo(() => {
    if (!schema || descriptorPropertyKeys.length === 0 || descriptorOptions.length === 0) {
      return null;
    }

    const jsonSchema = schema as JsonSchema;
    const clone = structuredClone(jsonSchema);
    
    // Extract just the values from descriptor options
    const optionValues = descriptorOptions.map(opt => opt.value);
    
    // Inject enum into all descriptor properties
    for (const k of descriptorPropertyKeys) {
      if (!clone.properties) clone.properties = {};
      clone.properties[k] = { ...(clone.properties[k] || {}), enum: optionValues };
    }
    
    return clone as object;
  }, [schema, descriptorPropertyKeys, descriptorOptions]);

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

    // Ensure arrays and defaults from schema are present in the submitted payload.
    // Use JsonSchema type for the default generator instead of any.
    const defaults = generateDefaultContent((patchedSchema ?? schema) as unknown as JsonSchema) as unknown;
      function mergeDefaults(def: unknown, src: unknown): unknown {
        if (def === null || def === undefined) return src;
        if (Array.isArray(def)) {
          // if user supplied an array, keep it; otherwise use default (possibly empty array)
          return Array.isArray(src) ? src : structuredClone(def);
        }
        if (typeof def === 'object' && def !== null) {
          const base = (typeof src === 'object' && src !== null) ? (structuredClone(src) as Record<string, unknown>) : {} as Record<string, unknown>;
          const d = def as Record<string, unknown>;
          for (const k of Object.keys(d)) {
            base[k] = mergeDefaults(d[k], base[k]);
          }
          return base;
        }
        // primitive default - if src provided, prefer src, otherwise default
        return typeof src === 'undefined' ? def : src;
      }

      const payload = mergeDefaults(defaults, data ?? {});
      try { console.debug('[NewDraftDrawer] submit payload (merged)', payload); } catch (e) { console.debug('[NewDraftDrawer] submit payload merged log failed', e); }
      try { console.debug('[NewDraftDrawer] submit payload (stringified)', JSON.stringify(payload ?? {})); } catch (e) { console.debug('[NewDraftDrawer] submit payload stringify failed', e); }
      const result = await createDraft(setupId, schemaKey, payload ?? {});
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
  }, [valid, data, setupId, schemaKey, onSuccess, onClose, patchedSchema, schema]);

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
