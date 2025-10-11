import { rankWith, isStringControl, isNumberControl, isIntegerControl, isBooleanControl, and, isEnumControl, isOneOfEnumControl, isObjectArrayControl, uiTypeIs, type UISchemaElement, type JsonSchema, type Tester, type JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { BPStringControl } from '../controls/BPStringControl';
import { BPTextAreaControl } from '../controls/BPTextAreaControl';
import { BPNumberControl } from '../controls/BPNumberControl';
import { BPIntegerControl } from '../controls/BPIntegerControl';
import { BPBooleanControl } from '../controls/BPBooleanControl';
import { BPEnumControl } from '../controls/BPEnumControl';
import { BPArrayControl } from '../controls/BPArrayControl';
import { BPVerticalLayout } from '../layouts/BPVerticalLayout';
import { BPHorizontalLayout } from '../layouts/BPHorizontalLayout';
import { BPGroupLayout } from '../layouts/BPGroupLayout';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function textareaTester(uischema: UISchemaElement, _schema: JsonSchema, _ctx?: unknown): boolean {
  // check options.multi or options.format === 'textarea'
  const u = uischema as unknown as Record<string, unknown>;
  const opts = u?.options as Record<string, unknown> | undefined;
  if (opts && opts['multi'] === true) return true;
  if (opts && opts['format'] === 'textarea') return true;
  return false;
}

// layout testers use uiTypeIs from jsonforms

export function getBlueprintRenderers(): JsonFormsRendererRegistryEntry[] {
  const list: JsonFormsRendererRegistryEntry[] = [
    // control renderers (most-specific first)
    { tester: rankWith(5, isObjectArrayControl), renderer: BPArrayControl },
    { tester: rankWith(4, and(isStringControl, textareaTester as Tester)), renderer: BPTextAreaControl },
    { tester: rankWith(3, isStringControl), renderer: BPStringControl },
    { tester: rankWith(3, isNumberControl), renderer: BPNumberControl },
    { tester: rankWith(3, isIntegerControl), renderer: BPIntegerControl },
    { tester: rankWith(3, isBooleanControl), renderer: BPBooleanControl },
    { tester: rankWith(4, isEnumControl), renderer: BPEnumControl },
    { tester: rankWith(4, isOneOfEnumControl), renderer: BPEnumControl },
    // fallback: any control that reaches here will render as a string control
    { tester: rankWith(1, uiTypeIs('Control')), renderer: BPStringControl },
    // layout renderers
    { tester: rankWith(3, uiTypeIs('VerticalLayout')), renderer: BPVerticalLayout as unknown as JsonFormsRendererRegistryEntry['renderer'] },
    { tester: rankWith(3, uiTypeIs('HorizontalLayout')), renderer: BPHorizontalLayout as unknown as JsonFormsRendererRegistryEntry['renderer'] },
    { tester: rankWith(4, uiTypeIs('Group')), renderer: BPGroupLayout as unknown as JsonFormsRendererRegistryEntry['renderer'] },
  ];
  // debug: expose how many renderers we registered
  if (import.meta.env.DEV) console.debug('[JF] blueprint renderers length:', list.length);
  return list;
}
