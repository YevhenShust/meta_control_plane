// Path manipulation utilities

/**
 * Join path segments into a single path string
 */
export function joinPath(segments: string[]): string {
  return segments.join('/');
}

/**
 * Split a path string into segments
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}
