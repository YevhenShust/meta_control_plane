import { rankWith, isStringControl, isNumberControl, isIntegerControl, isBooleanControl, and, isEnumControl, isOneOfEnumControl, type UISchemaElement, type JsonSchema, type Tester, type JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { BPStringControl } from '../controls/BPStringControl';
import { BPTextAreaControl } from '../controls/BPTextAreaControl';
import { BPNumberControl } from '../controls/BPNumberControl';
import { BPIntegerControl } from '../controls/BPIntegerControl';
import { BPBooleanControl } from '../controls/BPBooleanControl';
import { BPEnumControl } from '../controls/BPEnumControl';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function textareaTester(uischema: UISchemaElement, _schema: JsonSchema, _ctx?: unknown): boolean {
  // check options.multi or options.format === 'textarea'
  const u = uischema as unknown as Record<string, unknown>;
  const opts = u?.options as Record<string, unknown> | undefined;
  if (opts && opts['multi'] === true) return true;
  if (opts && opts['format'] === 'textarea') return true;
  return false;
}

export function getBlueprintRenderers(): JsonFormsRendererRegistryEntry[] {
  const list: JsonFormsRendererRegistryEntry[] = [
    { tester: rankWith(4, and(isStringControl, textareaTester as Tester)), renderer: BPTextAreaControl },
    { tester: rankWith(3, isStringControl), renderer: BPStringControl },
    { tester: rankWith(3, isNumberControl), renderer: BPNumberControl },
    { tester: rankWith(3, isIntegerControl), renderer: BPIntegerControl },
    { tester: rankWith(3, isBooleanControl), renderer: BPBooleanControl },
    { tester: rankWith(4, isEnumControl), renderer: BPEnumControl },
    { tester: rankWith(4, isOneOfEnumControl), renderer: BPEnumControl },
  ];
  return list;
}
