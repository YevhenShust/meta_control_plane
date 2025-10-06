// Utility functions for parsing content safely

/**
 * Try to parse content as JSON. Returns parsed object if successful, otherwise returns the original value.
 */
export function tryParseContent<T = unknown>(raw: unknown): T | null {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'object') {
    return raw as T;
  }
  return null;
}

/**
 * Safely stringify an object to JSON. Returns empty string on error.
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '';
  }
}
