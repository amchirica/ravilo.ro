import "server-only";
import https from "node:https";

type GrantUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
};

export type PasswordGrantResult = {
  user: GrantUser | null;
  session: { access_token: string; refresh_token: string } | null;
  error: { message: string; code?: string } | null;
};

function readError(error: unknown) {
  if (!error || typeof error !== "object") return String(error);
  const record = error as { message?: string; cause?: { message?: string; code?: string } };
  return record.cause?.message ?? record.cause?.code ?? record.message ?? "fetch failed";
}

/** Password grant via Node https, bypassing Next.js patched fetch (which throws "fetch failed" on Auth POST). */
export function passwordGrant(email: string, password: string): Promise<PasswordGrantResult> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) {
    return Promise.resolve({ user: null, session: null, error: { message: "Missing Supabase env" } });
  }
  const url = new URL("/auth/v1/token?grant_type=password", base.endsWith("/") ? base : `${base}/`);
  const payload = JSON.stringify({ email, password });
  return new Promise((resolve) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: Record<string, unknown> = {};
          try {
            json = JSON.parse(text) as Record<string, unknown>;
          } catch {
            json = { msg: text.slice(0, 200) };
          }
          if (!res.statusCode || res.statusCode >= 400) {
            resolve({
              user: null,
              session: null,
              error: {
                message: String(json.error_description ?? json.msg ?? json.error ?? json.message ?? "invalid"),
                code: json.error_code ? String(json.error_code) : undefined,
              },
            });
            return;
          }
          const user = (json.user as GrantUser | undefined) ?? null;
          const accessToken = json.access_token;
          const refreshToken = json.refresh_token;
          if (!user?.id || typeof accessToken !== "string" || typeof refreshToken !== "string") {
            resolve({ user: null, session: null, error: { message: "invalid session" } });
            return;
          }
          resolve({
            user,
            session: { access_token: accessToken, refresh_token: refreshToken },
            error: null,
          });
        });
      },
    );
    req.on("error", (error) => {
      console.error("[auth.login] password grant transport failed", readError(error));
      resolve({ user: null, session: null, error: { message: readError(error) } });
    });
    req.write(payload);
    req.end();
  });
}
