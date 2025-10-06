// Utility functions for parsing content safely

/**
 * Try to parse content as JSON. Returns parsed object if successful, otherwise returns the original value.
 */
/**
 * Try to parse content as JSON and optionally validate its shape.
 *
 * Behavior:
 * - If `raw` is a string, attempts JSON.parse; returns null on parse failure.
 * - If a `validator` (type guard) is provided, the parsed value is passed to it and only
 *   returned when the validator returns true.
 * - If no validator is provided, the function only accepts objects/arrays and returns null
 *   for primitives (numbers, booleans, etc.).
 */
export function tryParseContent<T = unknown>(
  raw: unknown,
  validator?: (v: unknown) => v is T
): T | null {
  // If raw is a string, attempt JSON.parse and return parsed value or null on failure
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Treat null/undefined as missing
  if (parsed === null || parsed === undefined) return null;

  // If a validator is provided, use it to decide
  if (typeof validator === 'function') {
    return validator(parsed) ? parsed as T : null;
  }

  // Without validator, only accept objects/arrays; reject primitives
  if (typeof parsed === 'object') {
    return parsed as T;
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
