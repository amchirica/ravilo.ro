import { config } from "dotenv";
import { resolve } from "node:path";

/** Next.js loads `.env` then `.env.local`. CLI scripts must do the same. */
export function loadEnvFiles() {
  const root = process.cwd();
  config({ path: resolve(root, ".env") });
  config({ path: resolve(root, ".env.local"), override: true });
}

loadEnvFiles();
