import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { seedDemoStore } from "../src/server/demo-seed";
import { DEMO_PRODUCTS } from "../src/server/demo-products";
import { assertCanSeedDemo } from "../src/lib/dev-seed-guard";

function svgFor(name: string, accent: string) {
  const safe = name.replace(/[<>&]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-label="${safe}">
  <rect width="800" height="1000" fill="#F4F2ED"/>
  <rect x="90" y="90" width="620" height="820" rx="8" fill="#FFFFFF" stroke="#D8D4CB"/>
  <rect x="220" y="280" width="360" height="360" rx="28" fill="none" stroke="${accent}" stroke-width="3"/>
  <circle cx="400" cy="460" r="48" fill="none" stroke="${accent}" stroke-width="2"/>
  <text x="400" y="720" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#171817">${safe}</text>
  <text x="400" y="860" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#666660" letter-spacing="6">RAVILO</text>
</svg>`;
}

function writePlaceholders() {
  const dir = path.join(process.cwd(), "public", "demo", "products");
  mkdirSync(dir, { recursive: true });
  const accents: Record<string, string> = {
    auto: "#5C6B4F",
    tech: "#8B7355",
    home: "#3F4A36",
    travel: "#5C6B4F",
    edc: "#8B7355",
  };
  for (const product of DEMO_PRODUCTS) {
    writeFileSync(path.join(dir, `${product.slug}.svg`), svgFor(product.nameEn, accents[product.category] ?? "#5C6B4F"));
  }
  for (const [category, accent] of Object.entries(accents)) {
    writeFileSync(path.join(dir, `${category}.svg`), svgFor(category.toUpperCase(), accent));
  }
  for (const slug of ["drive-essentials-kit", "desk-reset-kit", "travel-tech-kit", "smart-home-starter-kit"]) {
    writeFileSync(path.join(dir, `${slug}.svg`), svgFor(slug.replace(/-/g, " "), "#8B7355"));
  }
}

function jwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

async function main() {
  assertCanSeedDemo();
  writePlaceholders();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local (scripts now load .env then .env.local).",
    );
  }
  if (jwtRole(key) === "anon") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is the anon key (JWT role=anon). Put the service_role secret from Supabase → Settings → API.",
    );
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await seedDemoStore(db);
  console.log(`Seed complete: ${result.products} products, ${result.categories} categories, ${result.collections} collections, ${result.bundles} bundles`);
  console.log("Create a SUPER_ADMIN with: npm run create-admin -- you@example.com");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
