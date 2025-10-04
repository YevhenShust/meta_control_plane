// Utility functions for parsing content safely

/**
 * Try to parse content as JSON. Returns parsed object if successful, otherwise returns the original value.
 */
export function tryParseContent(content: unknown): unknown {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
  return content;
}
