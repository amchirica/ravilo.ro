export function safeInternalPath(candidate: string | null | undefined, fallback = "/"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\")) return fallback;
  if (/[\r\n]/.test(candidate)) return fallback;
  return candidate;
}

const AUTH_LOOP_PREFIXES = ["/auth/login", "/auth/inregistrare", "/admin/login"];

function pathWithoutLocale(path: string) {
  const bare = path.split("?")[0];
  if (bare === "/en" || bare.startsWith("/en/")) return bare.slice(3) || "/";
  return bare;
}

export function postAuthPath(candidate: string | null | undefined, fallback = "/"): string {
  const path = safeInternalPath(candidate, fallback);
  const unprefixed = pathWithoutLocale(path);
  if (AUTH_LOOP_PREFIXES.some((prefix) => unprefixed === prefix || unprefixed.startsWith(`${prefix}/`))) {
    return fallback;
  }
  return path;
}
