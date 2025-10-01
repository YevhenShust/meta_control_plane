import { JsonForms } from '@jsonforms/react';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { generateDefaultUISchema } from '@jsonforms/core';
import type { FormViewProps } from '../editor/EntityEditor.types';
import { getBlueprintRenderers } from './blueprint/registry';
import { useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';

const bpRenderers = getBlueprintRenderers();
console.debug('[JF] blueprint renderers (count):', bpRenderers.length);

export default function FormRenderer(props: FormViewProps) {
  const { data, schema, uischema, ajv, onChange, onStatus } = props;

  // Mount/unmount tracing: move to effect so StrictMode double-render doesn't confuse logs.
  useEffect(() => {
    console.debug('[Form] mounted', 'schema?', !!schema, 'uischema?', !!uischema, 'data=', Array.isArray(data) ? `array(${data.length})` : typeof data);
    // one-time log of schema root keys if schema is an object
    try {
      if (schema && typeof schema === 'object') {
        console.debug('[Form] schema keys:', Object.keys(schema as Record<string, unknown>));
      }
    } catch {
      // ignore logging errors
    }
    return () => console.debug('[Form] unmounted');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [status, setStatus] = useState<{ dirty: boolean; valid: boolean }>({ dirty: false, valid: true });
  const [saving, setSaving] = useState(false);

  return (
    <div className="content-padding">
      <div className="form-button-group">
        <ButtonGroup>
          <Button
            icon="floppy-disk"
              intent="primary"
              disabled={saving}
              loading={saving}
            onClick={async () => {
                setSaving(true);
                console.debug('[Form] save clicked');
                try {
                  const result = await props.onSave();
                  console.debug('[Form] save result', result);
                  if (result && (result as { ok?: boolean }).ok) {
                    // on successful save, mark clean locally and inform parent
                    setStatus(s => ({ ...s, dirty: false }));
                    onStatus?.({ dirty: false, valid: status.valid });
                    console.debug('[Form] save ok');
                  } else {
                    console.error('[Form] save outcome indicates failure', result);
                  }
                } catch (e) {
                  console.error('[Form] save failed (exception)', e);
                } finally {
                  setSaving(false);
                }
              }}
          >
            Save
          </Button>
          <Button
            icon="refresh"
            onClick={() => {
              props.onReset();
              setStatus(s => ({ ...s, dirty: false }));
            }}
          >
            Reset
          </Button>
        </ButtonGroup>
      </div>

      <JsonForms
        ajv={ajv}
        schema={(schema as unknown) as JsonSchema}
        uischema={(uischema ?? (generateDefaultUISchema((schema as unknown) as JsonSchema) as unknown)) as UISchemaElement}
        data={data as unknown}
        renderers={bpRenderers}
        onChange={({ data: d }) => {
          // compute validity via ajv
          let valid = true;
          try {
            valid = ajv.validate((schema as unknown) as JsonSchema, d as unknown) === true;
          } catch {
            valid = false;
          }
          console.debug('[Form] onChange');
          onChange(d as unknown);
          const next = { dirty: true, valid };
          setStatus(next);
          onStatus?.(next);
        }}
      />
    </div>
  );
}

// Verification steps:
// 1. Start dev server: `yarn dev`
// 2. Open a draft path like: http://localhost:5173/?path=Game%2FChests%2F<someDraftId>
// 3. Confirm Blueprint-styled inputs are visible and changing values updates the JSON preview below the form.
// 4. Check browser console for errors and ensure no "No applicable renderer found." messages appear.

