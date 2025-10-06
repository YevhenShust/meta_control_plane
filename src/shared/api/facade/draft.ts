import type { DraftDto } from '../drafts';
import { tryParseContent } from '../../../core/parse';

export type DraftParsed = Omit<DraftDto, 'content'> & { content: unknown };

export function normalizeDraft<T extends { content?: unknown }>(d: T): Omit<T, 'content'> & { content: unknown } {
  const parsed = tryParseContent(d.content) ?? d.content;
  return { ...d, content: parsed } as Omit<T, 'content'> & { content: unknown };
}

// no default export — types are named exports
