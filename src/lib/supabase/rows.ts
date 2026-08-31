export function camelKeys<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => camelKeys(item)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      let mapped: unknown = camelKeys(val);
      if (typeof mapped === "string" && looksLikeDateField(camel) && /^\d{4}-\d{2}-\d{2}/.test(mapped)) {
        mapped = new Date(mapped);
      }
      out[camel] = mapped;
    }
    return out as T;
  }
  return value as T;
}

export function camelList<T>(rows: unknown[] | null | undefined): T[] {
  return (rows ?? []).map((row) => camelKeys<T>(row));
}

export function snakeKeys(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (val instanceof Date) out[snake] = val.toISOString();
    else if (val && typeof val === "object" && !Array.isArray(val)) out[snake] = snakeKeys(val as Record<string, unknown>);
    else out[snake] = val;
  }
  return out;
}

function looksLikeDateField(name: string) {
  return /(At|Date)$/.test(name) || name === "startAt" || name === "endAt";
}
