import type { SchemaDto } from '../schema';
import { tryParseContent } from '../../../core/parse';

export type SchemaParsed = Omit<SchemaDto, 'content'> & { content: unknown };

export function normalizeSchema<T extends { content?: unknown }>(s: T): Omit<T, 'content'> & { content: unknown } {
  const parsed = tryParseContent(s.content) ?? s.content;
  return { ...s, content: parsed } as Omit<T, 'content'> & { content: unknown };
}
