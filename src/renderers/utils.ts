export function joinErrors(errors?: string[] | undefined): string | undefined {
  if (!errors || errors.length === 0) return undefined;
  return errors.join('; ');
}

export function toNumeric(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
