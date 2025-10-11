import { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, Button, ButtonGroup, Intent } from '@blueprintjs/core';
import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { generateDefaultUISchema } from '@jsonforms/core';
import { getBlueprintRenderers } from '../renderers/blueprint/registry';
import { createAjv } from '../renderers/ajvInstance';
import { createDraft } from '../shared/api';
import { useDescriptorOptionsForColumns } from '../hooks/useDescriptorOptions';
import { emitChanged } from '../shared/events/DraftEvents';
import { AppToaster } from './AppToaster';
import { isDescriptorId, stripIdSuffix } from '../core/pathTools';

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
  const [ajv, setAjv] = useState(() => createAjv());
  

  useEffect(() => {
    if (isOpen && schema) {
      // Initialize with empty object; server generates defaults
      setData({});
      // Create fresh AJV instance to avoid schema conflicts
      setAjv(createAjv());
    }
  }, [isOpen, schema, schemaKey]);

  // Find descriptor property names in schema
  const descriptorPropertyKeys = (() => {
    if (!schema) return [] as string[];
    const jsonSchema = schema as JsonSchema;
    const props = jsonSchema.properties as { [key: string]: JsonSchema } | undefined;
    if (!props) return [] as string[];
    return Object.keys(props).filter(k => isDescriptorId(k));
  })();

  // Load descriptor options for all descriptor properties
  const descriptorPropertyNames = descriptorPropertyKeys.map(k => stripIdSuffix(k)!).filter(Boolean);
  const { map: descriptorOptionsMap } = useDescriptorOptionsForColumns(
    isOpen ? setupId : undefined,
    isOpen ? schemaKey : undefined,
    descriptorPropertyNames
  );

  // When descriptor options are loaded, ensure data has a valid value for each DescriptorId
  useEffect(() => {
    if (!isOpen || !descriptorPropertyKeys.length || !descriptorOptionsMap) return;
    setData((prev: unknown) => {
      const base = (prev && typeof prev === 'object') ? { ...(prev as Record<string, unknown>) } : {} as Record<string, unknown>;
      let changed = false;
      for (const k of descriptorPropertyKeys) {
        const propName = stripIdSuffix(k)!;
        // Prefer options for this property; otherwise if map has any options, pick first available set
        const opts = descriptorOptionsMap[propName] && descriptorOptionsMap[propName]!.length
          ? descriptorOptionsMap[propName]!
          : Object.values(descriptorOptionsMap).find(list => Array.isArray(list) && list.length) || [];
        if (!opts.length) continue;
        const current = base[k];
        const validValues = new Set(opts.map(o => o.value));
        if (typeof current !== 'string' || !validValues.has(current) || current.trim() === '') {
          base[k] = opts[0].value;
          changed = true;
        }
      }
      return changed ? base : prev;
    });
  }, [isOpen, descriptorOptionsMap, descriptorPropertyKeys]);

  // Patch schema with descriptor options when available
  const patchedSchema = useMemo(() => {
    if (!schema || descriptorPropertyKeys.length === 0) {
      return schema;
    }

    const jsonSchema = schema as JsonSchema;
    const clone = structuredClone(jsonSchema);

    for (const k of descriptorPropertyKeys) {
      const propName = stripIdSuffix(k)!;
      const options = descriptorOptionsMap?.[propName] ?? [];
      if (!options.length) continue; // skip if no options yet

      const optionValues = options
        .map(opt => opt.value)
        .filter(value => value && value.trim() !== '');

      if (!clone.properties) clone.properties = {};
      clone.properties[k] = {
        type: 'string',
        enum: optionValues,
        minLength: 1,
        ...(clone.properties[k] || {}),
      };

      const prop = clone.properties[k] as JsonSchema;
      if (!prop.default || (typeof prop.default === 'string' && prop.default === '')) delete prop.default;
    }

    return clone as object;
  }, [schema, descriptorPropertyKeys, descriptorOptionsMap]);

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  const handleSubmit = useCallback(async () => {
    // Allow submit even when invalid; server is the source of truth for defaults/validation
    if (!valid) {
      AppToaster.show({ message: 'Submitting with validation warnings', intent: Intent.WARNING });
    }

    setSaving(true);
    try {
      const payload = data ?? {};
      const result = await createDraft(setupId, schemaKey, payload);

      // Emit event to refresh menu
      emitChanged({ schemaKey, setupId });

      AppToaster.show({
        message: `Draft created: ${result.id}`,
        intent: Intent.SUCCESS,
      });

      onSuccess(String(result.id));
      onClose();
    } catch (e) {
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
            disabled={saving}
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
