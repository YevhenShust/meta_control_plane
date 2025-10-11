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

/** Remove trailing 'Id' (case-insensitive). */
export function stripIdSuffix(name: string | undefined): string | undefined {
  if (!name) return name;
  return name.replace(/Id$/i, '');
}

/** Returns true if the name ends with 'DescriptorId' (case-insensitive). */
export function isDescriptorId(name: string | undefined): boolean {
  return !!name && /DescriptorId$/i.test(name);
}
