/**
 * Utility functions for getting and setting nested object values
 */

/**
 * Get a nested value from an object using a path array
 * @param obj The object to get the value from
 * @param path Array of keys representing the path to the value
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * Set a nested value in an object using a path array
 * Mutates the object in place
 * @param obj The object to set the value in
 * @param path Array of keys representing the path to the value
 * @param value The value to set
 */
export function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (!path.length) return;
  if (path.length === 1) {
    obj[path[0]] = value;
    return;
  }
  const [first, ...rest] = path;
  if (typeof obj[first] !== 'object' || obj[first] === null) {
    obj[first] = {};
  }
  setNestedValue(obj[first] as Record<string, unknown>, rest, value);
}
