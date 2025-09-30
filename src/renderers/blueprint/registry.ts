import { rankWith, isStringControl, isNumberControl, isIntegerControl, isBooleanControl, and, isEnumControl, isOneOfEnumControl, isLayout, type UISchemaElement, type JsonSchema, type Tester, type JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { BPStringControl } from '../controls/BPStringControl';
import { BPTextAreaControl } from '../controls/BPTextAreaControl';
import { BPNumberControl } from '../controls/BPNumberControl';
import { BPIntegerControl } from '../controls/BPIntegerControl';
import { BPBooleanControl } from '../controls/BPBooleanControl';
import { BPEnumControl } from '../controls/BPEnumControl';
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

// simple testers for layout kinds (uischema.type === 'VerticalLayout' etc.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function verticalLayoutTester(uischema: UISchemaElement, _schema: JsonSchema, _ctx?: unknown): boolean {
  const u = uischema as unknown as Record<string, unknown>;
  return u?.type === 'VerticalLayout';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function horizontalLayoutTester(uischema: UISchemaElement, _schema: JsonSchema, _ctx?: unknown): boolean {
  const u = uischema as unknown as Record<string, unknown>;
  return u?.type === 'HorizontalLayout';
}

export function getBlueprintRenderers(): JsonFormsRendererRegistryEntry[] {
  const list: JsonFormsRendererRegistryEntry[] = [
    // layout renderers
    { tester: rankWith(2, verticalLayoutTester as Tester), renderer: BPVerticalLayout as unknown as JsonFormsRendererRegistryEntry['renderer'] },
    { tester: rankWith(2, horizontalLayoutTester as Tester), renderer: BPHorizontalLayout as unknown as JsonFormsRendererRegistryEntry['renderer'] },
    { tester: rankWith(2, isLayout), renderer: BPGroupLayout as unknown as JsonFormsRendererRegistryEntry['renderer'] },
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
