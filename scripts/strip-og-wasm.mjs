import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Smallest valid WebAssembly module. OG image generation is unused. */
const emptyWasm = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
const targets = new Set(["resvg.wasm", "yoga.wasm"]);

function walk(dir, found) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, found);
    } else if (targets.has(name) && st.size > emptyWasm.length) {
      found.push({ full, size: st.size });
    }
  }
}

const roots = [
  join("node_modules", "next", "dist", "compiled", "@vercel", "og"),
  ".open-next",
];

const found = [];
for (const root of roots) {
  if (existsSync(root)) walk(root, found);
}

for (const file of found) {
  writeFileSync(file.full, emptyWasm);
  console.log(`stripped ${file.full} (${file.size} bytes -> ${emptyWasm.length})`);
}

if (found.length === 0) {
  console.log("strip-og-wasm: no @vercel/og wasm files found");
}
