import { rankWith, isStringControl, isNumberControl, isIntegerControl, isBooleanControl, and, type JsonFormsRendererRegistryEntry, type JsonSchema, type UISchemaElement, type TesterContext, type Tester } from '@jsonforms/core';
import { BPStringControl } from '../controls/BPStringControl';
import { BPTextAreaControl } from '../controls/BPTextAreaControl';
import { BPNumberControl } from '../controls/BPNumberControl';
import { BPIntegerControl } from '../controls/BPIntegerControl';
import { BPBooleanControl } from '../controls/BPBooleanControl';
import { BPEnumControl } from '../controls/BPEnumControl';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const hasEnum: Tester = (_uischema: UISchemaElement, _schema: JsonSchema | unknown, _ctx: TesterContext | undefined): boolean => {
  const schema = _schema as unknown;
  if (schema && typeof schema === 'object') {
    const s = schema as Record<string, unknown>;
    return Array.isArray(s['enum']);
  }
  return false;
};

export const blueprintRenderers: JsonFormsRendererRegistryEntry[] = [
  { tester: rankWith(4, and(isStringControl, hasEnum)), renderer: BPEnumControl },
  { tester: rankWith(4, and(isStringControl, (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (uischema: UISchemaElement, _schema: JsonSchema | undefined, _ctx: TesterContext | undefined): boolean => {
    if (uischema && typeof uischema === 'object') {
      const u = uischema as unknown as Record<string, unknown>;
      const opts = u['options'];
      return Boolean(opts && typeof opts === 'object' && (opts as Record<string, unknown>)['multi'] === true);
    }
    return false;
  }))), renderer: BPTextAreaControl },
  { tester: rankWith(3, isStringControl), renderer: BPStringControl },
  { tester: rankWith(3, isNumberControl), renderer: BPNumberControl },
  { tester: rankWith(3, isIntegerControl), renderer: BPIntegerControl },
  { tester: rankWith(3, isBooleanControl), renderer: BPBooleanControl },
];

export default blueprintRenderers;
