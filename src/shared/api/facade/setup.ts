import type { SetupDto } from '../setup';

// Setup doesn't carry JSON-as-string content currently, but provide a facade type
// to keep consistency and allow future parsing/normalization if needed.
export type SetupParsed = SetupDto;

export function normalizeSetup<T extends SetupDto>(s: T): SetupParsed {
  return s as SetupParsed;
}
