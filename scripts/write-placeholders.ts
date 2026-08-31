import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DEMO_PRODUCTS } from "../src/server/demo-products";

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
console.log(`wrote ${DEMO_PRODUCTS.length} product placeholders`);
