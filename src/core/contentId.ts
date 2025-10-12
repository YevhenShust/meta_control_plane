export function getContentId(x: unknown): string {
  if (!x || typeof x !== "object") return "";
  const v = (x as Record<string, unknown>)["Id"];
  return typeof v === "string" ? v.trim() : "";
}
