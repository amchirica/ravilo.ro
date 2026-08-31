const SECRET_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "cvv",
  "pan",
  "card",
];

function redact(value: unknown): unknown {
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      const lower = key.toLowerCase();
      if (SECRET_KEYS.some((part) => lower.includes(part))) {
        return [key, "[redacted]"];
      }
      return [key, redact(nested)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}

type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context: redact(context) } : {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  console.info(serialized);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
